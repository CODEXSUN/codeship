import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {appRoot,openDatabase} from '../src/api/database.ts';
import {groupCompose} from '../src/api/modules/master/infrastructure-service/group-compose.ts';
const apply=process.argv.includes('--apply');if(process.argv.slice(2).some(arg=>arg!=='--apply'))throw new Error('Use infra:group, optionally --apply.');
const root=path.join(appRoot,'.codeship/infrastructure-runtime'),output=path.join(root,'codebiz-infra');await mkdir(output,{recursive:true,mode:0o700});
const {db}=openDatabase();
const docker=(args:string[])=>{const r=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(r.status!==0)throw new Error('Docker grouping operation failed. Data volumes retained.');return r.stdout.trim();};
try{
 if(docker(['ps','-aq','--filter','label=com.docker.compose.project=codebiz-infra']))throw new Error('Codebiz infrastructure group already exists. Use its recorded Compose file.');
 const entries=[],originals=[];
 for(const row of await db.selectFrom('infrastructure_services').selectAll().orderBy('kind').execute()){
  const state=JSON.parse(await readFile(path.join(root,row.public_id+'.json'),'utf8'));
  if(state.status!=='verified'||state.revision!==row.revision)throw new Error('Verify current saved infrastructure before regrouping.');
  const container=docker(['ps','-q','--filter','label=com.docker.compose.project='+(state.dockerProject??row.project),'--filter','label=com.docker.compose.service='+(state.service??(row.kind==='file-manager'?'filemanager':row.kind))]);if(!container||container.includes('\n'))throw new Error('Expected one running container per service.');
  const runtime=JSON.parse(docker(['inspect',container]))[0],definition=JSON.parse(await readFile(state.compose,'utf8'));
  if(runtime.Image!==state.imageId)throw new Error('Runtime image differs from verified release.');
  if(state.service){const selected=definition.services[state.service];if(!selected)throw new Error('Grouped service definition missing.');definition.services={[state.service]:selected};const volumes=new Set((selected.volumes??[]).map((v:any)=>typeof v==='string'?v.split(':')[0]:v.source));definition.volumes=Object.fromEntries(Object.entries(definition.volumes??{}).filter(([key])=>volumes.has(key)));const secrets=new Set((selected.secrets??[]).map((v:any)=>typeof v==='string'?v:v.source));definition.secrets=Object.fromEntries(Object.entries(definition.secrets??{}).filter(([key])=>secrets.has(key)));}
  const service=Object.values(definition.services)[0] as any;
  const targets=(service.volumes??[]).map((v:any)=>typeof v==='string'?v.split(':')[1]:v.target);
  const extraMounts=runtime.Mounts.filter((m:any)=>m.Type==='volume'&&!targets.includes(m.Destination)).map((m:any)=>({name:m.Name,target:m.Destination}));
  const key=row.kind==='file-manager'?'filemanager':row.kind;
  entries.push({key,definition,file:state.compose,extraMounts});originals.push({id:row.public_id,container,project:row.project,revision:row.revision,key,imageId:state.imageId,volumes:runtime.Mounts.filter((m:any)=>m.Type==='volume').map((m:any)=>({name:m.Name,target:m.Destination}))});
 }
 const compose=path.join(output,'compose.json');await writeFile(compose,JSON.stringify(groupCompose(entries),null,2)+'\n',{mode:0o600});
 docker(['compose','-p','codebiz-infra','-f',compose,'config','--quiet']);
 await writeFile(path.join(output,'plan.json'),JSON.stringify({project:'codebiz-infra',originals},null,2),{mode:0o600});
 console.log(JSON.stringify({project:'codebiz-infra',services:entries.map(e=>e.key),compose,apply}));
 if(apply){
  const stage=async(stage:string,status:string)=>writeFile(path.join(root,'stages.jsonl'),JSON.stringify({at:new Date().toISOString(),id:'codebiz-infra',stage,status})+'\n',{flag:'a',mode:0o600});
  await stage('regroup','started');docker(['stop',...originals.map(o=>o.container)]);
  docker(['compose','-p','codebiz-infra','-f',compose,'up','-d','--no-build','--pull','never','--wait','--wait-timeout','180']);
  for(const original of originals){
   const id=docker(['compose','-p','codebiz-infra','-f',compose,'ps','-q',original.key]);const runtime=JSON.parse(docker(['inspect',id]))[0];
   if(runtime.Image!==original.imageId||original.volumes.some((m:{name:string;target:string})=>!runtime.Mounts.some((v:any)=>v.Name===m.name&&v.Destination===m.target)))throw new Error('Image or volume preservation check failed. Original stopped containers retained.');
   const stateFile=path.join(root,original.id+'.json'),state=JSON.parse(await readFile(stateFile,'utf8'));
   await writeFile(stateFile,JSON.stringify({...state,dockerProject:'codebiz-infra',service:original.key,compose,regroupedAt:new Date().toISOString()},null,2),{mode:0o600});
  }
  // Remove only the verified replaced containers; never remove their volumes.
  docker(['rm',...originals.map(o=>o.container)]);
  await writeFile(path.join(root,'group.json'),JSON.stringify({project:'codebiz-infra',compose,services:originals.map(({container,...r})=>r),verifiedAt:new Date().toISOString()},null,2),{mode:0o600});
  await stage('regroup','passed');console.log('All infrastructure containers now share the codebiz-infra Compose project; images and volume mounts preserved.');
 }
}finally{await db.destroy();}
