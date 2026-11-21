import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {latestRelease} from '../latest-release.mjs';
import {resolveReleaseImage} from '../release-image.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const ssh=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','D:/workspace/codebiz/deploy/.ssh/ubuntu_local_ed25519','cx@192.168.1.34'];
const names=process.argv.slice(2);if(!names.length||names.some(n=>!['platform','codeship','codeitz','uiux','iilabs'].includes(n))||new Set(names).size!==names.length)throw Error('Select the five approved staging products explicitly.');
const docker=args=>cp.execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:args[0]==='pull'?90000:180000,maxBuffer:32*1024*1024}).trim();
const remote=(command,input)=>cp.execFileSync('ssh',[...ssh,command],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
const wait=child=>new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('Staging image transfer failed.')));});
const manifests={};
for(const name of names){
 const approved=await latestRelease(name);
 const keys=['CODESHIP_RELEASED_UPDATE_ENTRY','CODESHIP_RELEASE_ASSETS_JSON','CODESHIP_KEEP_RELEASE_ARCHIVES'];
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 process.env.CODESHIP_RELEASED_UPDATE_ENTRY='1';process.env.CODESHIP_RELEASE_ASSETS_JSON=JSON.stringify({[approved.manifest.repository+'@'+approved.manifest.tag]:approved.archiveUrl});process.env.CODESHIP_KEEP_RELEASE_ARCHIVES='1';
 let image;try{image=await resolveReleaseImage(approved.manifest,docker,path.join(root,'.codeship/releases/images'));}finally{for(const key of keys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
 const identity=JSON.parse(docker(['image','inspect',image]))[0];
 if(identity.Id!==approved.manifest.imageId||identity.Config.Labels?.['org.opencontainers.image.version']!==approved.manifest.version||identity.Config.Labels?.['org.opencontainers.image.revision']!==approved.manifest.commit)throw Error('Local approved image labels differ.');
 const has=cp.spawnSync('ssh',[...ssh,'docker image inspect '+approved.manifest.imageId+' --format {{.Id}}'],{encoding:'utf8',windowsHide:true});
 if(has.status!==0||has.stdout.trim()!==approved.manifest.imageId){
  console.log(name+': transferring approved '+approved.manifest.tag+' image to staging');
  const save=cp.spawn('docker',['image','save',approved.manifest.imageId],{stdio:['ignore','pipe','ignore'],windowsHide:true});
  const load=cp.spawn('ssh',[...ssh,'docker image load'],{stdio:['pipe','ignore','ignore'],windowsHide:true});
  await Promise.all([pipeline(save.stdout,load.stdin),wait(save),wait(load)]);
 }
 const actual=remote('docker image inspect '+approved.manifest.imageId+' --format {{.Id}}');if(actual!==approved.manifest.imageId)throw Error('Staging loaded image identity differs.');
 manifests[name]=approved.manifest;console.log(name+': staging image verified '+approved.manifest.version);
}
const target={id:'ubuntu-staging',hostname:'cxserver',host:'192.168.1.34',root:'/srv/codebiz-staging',binding:'127.0.0.1',publicExposure:false,dataPolicy:'synthetic-fresh'};
const quote=value=>"'"+value.replaceAll("'","'\"'\"'")+"'";
const receiver=`
const fs=require('fs'),cp=require('child_process');let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
const {target,manifests}=JSON.parse(input),base='/srv/codebiz-staging';
if(require('os').hostname()!=='cxserver'||process.getuid()!==1000||target.id!=='ubuntu-staging'||target.root!==base)throw Error('Wrong staging target');
const file=base+'/target.json';if(fs.existsSync(file)){const previous=JSON.parse(fs.readFileSync(file));for(const k of Object.keys(target))if(previous[k]!==target[k])throw Error('Existing staging target differs');}else fs.writeFileSync(file,JSON.stringify(target,null,2)+'\\n',{mode:0o600,flag:'wx'});
for(const [name,m]of Object.entries(manifests)){const p=base+'/releases/'+name+'-'+m.tag+'.json';if(fs.existsSync(p)){if(JSON.stringify(JSON.parse(fs.readFileSync(p)))!==JSON.stringify(m))throw Error('Immutable staging release manifest differs');}else fs.writeFileSync(p,JSON.stringify(m,null,2)+'\\n',{mode:0o600,flag:'wx'});}
const m=manifests.codeship;if(m){const directory=base+'/operators/'+m.tag;if(!fs.existsSync(directory)){fs.mkdirSync(directory,{mode:0o700});const id=cp.execFileSync('docker',['create','--label','io.codebiz.stage=operator-source',m.imageId],{encoding:'utf8'}).trim();try{cp.execFileSync('docker',['cp',id+':/opt/codebiz/.',directory]);}finally{cp.execFileSync('docker',['rm',id]);}}
const operator=directory+'/devkit/codeship';const link=operator+'/.codeship';if(!fs.existsSync(link))fs.symlinkSync(base+'/state',link,'dir');if(fs.realpathSync(link)!==base+'/state')throw Error('Wrong staging state link');fs.mkdirSync(operator+'/.container/staging',{recursive:true,mode:0o700});console.log(operator);}
});`;
const operator=remote('/opt/codebiz-staging-node-26.13.1/bin/node -e '+quote(receiver),JSON.stringify({target,manifests})).split('\n').at(-1);
if(manifests.codeship){
 if(!operator.startsWith('/srv/codebiz-staging/operators/v-')||!operator.endsWith('/devkit/codeship'))throw Error('Unexpected staging operator destination');
 for(const file of fs.readdirSync(root+'/.container/staging'))if(/^[a-z][a-z0-9-]*\.(?:mjs|sh)$/.test(file)){
  const r=cp.spawnSync('scp',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','D:/workspace/codebiz/deploy/.ssh/ubuntu_local_ed25519',path.join(root,'.container/staging',file),'cx@192.168.1.34:'+operator+'/.container/staging/'+file],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error('Staging candidate tooling transfer failed');
 }
 fs.mkdirSync(root+'/.codeship/staging',{recursive:true});fs.writeFileSync(root+'/.codeship/staging/operator.json',JSON.stringify({target:'ubuntu-staging',operator,tooling:manifests.codeship},null,2));
 console.log('Staging operator prepared: '+operator+'; no app installed.');
}
