import {writeFileSync} from 'node:fs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createServer,createConnection} from 'node:net';
import path from 'node:path';
import pg from 'pg';
import {openDatabase,appRoot} from '../src/api/database.ts';
import {decryptSecrets} from '../src/api/modules/master/application/vault.ts';
import {applicationNetwork,ensureApplicationNetwork} from '../.container/apps/network-topology.mjs';

const manifestPath=path.resolve(process.argv[2]??'');
const generatedRoot=path.join(appRoot,'.codeship/infrastructure-generated')+path.sep;
if(process.argv.length!==3||!manifestPath.startsWith(generatedRoot)||path.basename(manifestPath)!=='manifest.json')throw new Error('Provide a generated CodeShip manifest.json path.');
const docker=(args:string[])=>{const result=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(result.status!==0){writeFileSync(path.join(appRoot,'.codeship/infrastructure-docker-error.log'),result.stderr,{mode:0o600});throw new Error('Docker operation failed: '+args.slice(0,1).join(' ')+'. Inspect private operation output.');}return result.stdout.trim();};
const stateRoot=path.join(appRoot,'.codeship/infrastructure-runtime');await mkdir(stateRoot,{recursive:true,mode:0o700});
const {db}=openDatabase();
const stage=async(id:string,name:string,status:string)=>{await writeFile(path.join(stateRoot,'stages.jsonl'),JSON.stringify({at:new Date().toISOString(),id,stage:name,status})+'\n',{flag:'a',mode:0o600});console.log(id+' '+name+' '+status);};
async function redisCheck(port:number,username:string,password:string){
 await new Promise<void>((resolve,reject)=>{const socket=createConnection({host:'127.0.0.1',port});let data='';socket.setTimeout(5000);const fail=()=>{socket.destroy();reject(new Error('Redis authentication verification failed.'));};socket.on('error',fail).on('timeout',fail);socket.on('connect',()=>{const resp=(values:string[])=>'*'+values.length+'\r\n'+values.map(v=>'$'+Buffer.byteLength(v)+'\r\n'+v+'\r\n').join('');socket.write(resp(['AUTH',username||'default',password])+resp(['PING']));});socket.on('data',chunk=>{data+=chunk.toString();if(data.includes('-'))fail();else if(data.includes('+OK\r\n')&&data.includes('+PONG\r\n')){socket.end();resolve();}});});
}
try{
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
 if(!manifest.services.length||manifest.services.some((r:any)=>r.status!=='generated'))throw new Error('All service records must generate successfully before deployment.');
 const rows=await db.selectFrom('infrastructure_services').selectAll().execute();
 for(const entry of manifest.services){const row=rows.find(r=>r.public_id===entry.id);if(!row||row.revision!==entry.revision||row.project!==entry.project)throw new Error('Settings changed. Regenerate before deployment.');if(entry.firewallPending)throw new Error('Whitelist firewall enforcement is not implemented.');}
 for(const entry of manifest.services){
  const row=rows.find(r=>r.public_id===entry.id)!;const file=path.resolve(entry.compose);
  if(!file.startsWith(generatedRoot))throw new Error('Unexpected Compose path.');
  const args=['compose','-p',row.project,'-f',file];const definition=JSON.parse(await readFile(file,'utf8'));
  const serviceName=Object.keys(definition.services)[0],service=definition.services[serviceName];
  const stateFile=path.join(stateRoot,row.public_id+'.json');
  let prior:any;try{prior=JSON.parse(await readFile(stateFile,'utf8'));}catch{}
  if(prior?.dockerProject&&prior.dockerProject!==row.project)throw new Error('Service belongs to the grouped Codebiz deployment. Use its recorded Compose file.');
  await stage(row.public_id,'preflight','started');
  const containers=docker(['ps','-aq','--filter','label=com.docker.compose.project='+row.project]);
  const retained=docker(['volume','ls','-q','--filter','label=com.docker.compose.project='+row.project]);
  if((containers||retained)&&(!prior||prior.project!==row.project))throw new Error('Unowned retained deployment exists; refusing automatic installation.');
  if(prior&&prior.revision!==row.revision)throw new Error('Retained deployment revision differs; explicit update review is required.');
  if(!containers)await new Promise<void>((resolve,reject)=>{const server=createServer();server.once('error',()=>reject(new Error('Host port is occupied.')));server.listen(row.port!,'0.0.0.0',()=>server.close(()=>resolve()));});
  docker([...args,'config','--quiet']);
  for(const [key,volume]of Object.entries(definition.volumes??{}) as [string,any][]){
   if(volume.external){
    const exists=docker(['volume','ls','-q','--filter','name=^'+volume.name+'$']);
    if(!exists){docker(['volume','create','--label','codeship.infrastructure='+row.public_id,volume.name]);await stage(row.public_id,'create-empty-app-volume','passed');}
   }else if(docker(['volume','ls','-q','--filter','name=^'+volume.name+'$'])&&!prior)throw new Error('Named data volume already exists; refusing unreviewed reuse.');
  }
  await writeFile(stateFile,JSON.stringify({id:row.public_id,project:row.project,revision:row.revision,compose:file,status:'installing'},null,2),{mode:0o600});
  await stage(row.public_id,'preflight','passed');await stage(row.public_id,'backup-no-migration','skipped');
  await stage(row.public_id,'build','started');docker([...args,'build','--pull']);await stage(row.public_id,'build','passed');
  if((await db.selectFrom('infrastructure_services').select('revision').where('public_id','=',row.public_id).executeTakeFirstOrThrow()).revision!==row.revision)throw new Error('Settings changed during build.');
  await stage(row.public_id,'install','started');docker([...args,'up','-d','--wait','--wait-timeout','180']);await stage(row.public_id,'install','passed');
  if(row.kind==='postgres'&&docker(['network','ls','--filter','name=^'+applicationNetwork+'$','--format','{{.Name}}'])){ensureApplicationNetwork(docker,row.project);await stage(row.public_id,'application-network','passed');}
  await stage(row.public_id,'verify','started');const secrets=row.encrypted_secrets?decryptSecrets(row.public_id,row.encrypted_secrets):{};
  const container=docker([...args,'ps','-q',serviceName]);
  if(row.kind==='postgres'){
   const client=new pg.Client({host:'127.0.0.1',port:row.port!,user:row.username,password:secrets.password,database:row.database||row.username,connectionTimeoutMillis:10000});try{await client.connect();await client.query('SELECT 1');}finally{await client.end();}
  }else if(row.kind==='mariadb'){
   docker(['exec',container,'sh','-c','export MYSQL_PWD="$(cat /run/secrets/root_password)"; exec mariadb --protocol=tcp -h127.0.0.1 -uroot -P "$1" -N -e "SELECT 1"','verify',String(row.docker_port)]);
  }else if(row.kind==='redis')await redisCheck(row.port!,row.username,secrets.password);
  else{
   const response=await fetch('http://127.0.0.1:'+row.port+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:row.username,password:secrets.password}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('File Manager login verification failed.');await response.body?.cancel();
  }
  const runtime=JSON.parse(docker(['inspect','--format','{{json .NetworkSettings.Ports}}',container]));
  const expected=row.binding_mode==='public'?'0.0.0.0':'127.0.0.1';
  if(!runtime[row.docker_port+'/tcp']?.some((p:any)=>p.HostIp===expected&&p.HostPort===String(row.port)))throw new Error('Published Docker port verification failed.');
  const imageId=docker(['inspect','--format','{{.Image}}',container]);
  await writeFile(stateFile,JSON.stringify({id:row.public_id,project:row.project,revision:row.revision,compose:file,status:'verified',hostPort:row.port,dockerPort:row.docker_port,binding:row.binding_mode,imageId,verifiedAt:new Date().toISOString()},null,2),{mode:0o600});await stage(row.public_id,'verify','passed');
 }
 await writeFile(path.join(stateRoot,'release.json'),JSON.stringify({manifest:manifestPath,verifiedAt:new Date().toISOString(),services:manifest.services.map((entry:any)=>({id:entry.id,project:entry.project,revision:entry.revision}))},null,2),{mode:0o600});
 console.log('All infrastructure services deployed and verified.');
}catch{await stage('infrastructure','operation','failed');console.error('Infrastructure operation stopped. Existing data retained; review stage records and container health. No credentials printed.');process.exitCode=1;}
finally{await db.destroy();}
