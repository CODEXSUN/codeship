import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,open,unlink} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),[mode,id]=process.argv.slice(2);
if(!['setup','verify'].includes(mode)||!/^[a-z0-9]{8}$/.test(id??''))throw new Error('Use setup|verify <infrastructure-public-id>. Prepare install in Infrastructure first.');
const directory=path.join(root,'.codeship/infrastructure',id);await mkdir(directory,{recursive:true,mode:0o700});
const docker=(args,capture=false)=>execFileSync('docker',args,{cwd:root,windowsHide:true,encoding:'utf8',stdio:capture?['ignore','pipe','pipe']:'inherit'})?.trim()??'';
const composeFile=path.join(directory,'install.compose.json');
if(mode==='setup')docker(['cp','codeship-local-app-1:/data/infrastructure/'+id+'/install.compose.json',composeFile]);
const definition=JSON.parse(await readFile(composeFile,'utf8')),service=definition.services?.filemanager;
if(!/^(?:codeship-)?files-[a-z0-9-]+$/.test(definition.name)||!/^filebrowser\/filebrowser:v\d+\.\d+\.\d+$/.test(service?.image??'')||service.environment?.FB_DISABLE_EXEC!=='true'||service.volumes?.some(v=>v.type!=='volume'||!/^\/(?:database|config|srv\/(?:apps|devkit)\/[a-z][a-z0-9-]+)$/.test(v.target)))throw new Error('Prepared recipe is not a supported standalone File Manager.');
if(mode==='setup'){
 if(!/^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/.test(service.environment.FB_PASSWORD??''))throw new Error('Prepared bootstrap hash is invalid.');
 service.environment.FB_PASSWORD=service.environment.FB_PASSWORD.split('$').join('$$');
 await writeFile(composeFile,JSON.stringify(definition,null,2)+'\n',{mode:0o600});
}
const mapping=/^127\.0\.0\.1:(\d+):(\d+)$/.exec(service.ports?.[0]??''),port=mapping?.[1];if(!port||Number(mapping[2])<1||Number(mapping[2])>65535||String(service.environment.FB_PORT)!==mapping[2])throw new Error('Loopback binding required.');
const stage=async(name,status)=>writeFile(path.join(directory,'stages.jsonl'),JSON.stringify({at:new Date().toISOString(),stage:name,status})+'\n',{flag:'a',mode:0o600});
const args=['compose','--project-name',definition.name,'-f',composeFile];
const verify=async()=>{const response=await fetch('http://127.0.0.1:'+port,{signal:AbortSignal.timeout(15000)});if(response.status!==200)throw new Error('File Manager HTTP verification failed.');await response.body?.cancel();await stage('verify','passed');console.log('File Manager verified on loopback port '+port);};
if(mode==='verify'){await verify();process.exit(0);}
const lockFile=path.join(directory,'setup.lock'),lock=await open(lockFile,'wx',0o600);
try{
 await stage('preflight','started');for(const volume of Object.values(definition.volumes))if(volume.external)docker(['volume','inspect',volume.name],true);
 if(docker(['volume','ls','-q','--filter','label=com.docker.compose.project='+definition.name],true)||docker([...args,'ps','-aq'],true))throw new Error('Retained service data exists.');
 docker([...args,'config','--quiet'],true);await stage('preflight','passed');await stage('install','started');docker([...args,'up','-d','--wait','--wait-timeout','180']);await stage('install','passed');await verify();
 await writeFile(path.join(directory,'release.json'),JSON.stringify({project:definition.name,image:service.image,installedAt:new Date().toISOString(),volumes:service.volumes.map(v=>v.source)},null,2)+'\n',{mode:0o600});
}catch{await stage('install','failed');throw new Error('File Manager setup failed. Retain storage and inspect stage records; no automatic retry or reset.');}
finally{await lock.close();await unlink(lockFile);}
