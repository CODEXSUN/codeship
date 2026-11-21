import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {requireStagingHost,stagingRoot,stagingNetwork,ingressNetwork,addresses,ports} from './profile.mjs';
import {serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
import {rawEnvironment} from '../raw-environment.mjs';
import {validateManifest} from '../release-policy.mjs';
export const operator=fs.realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
export function docker(args,input){try{return cp.execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:32*1024*1024}).trim();}catch{throw Error('Selected staging Docker operation failed; no production operation was attempted.');}}
export function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
export function save(file,value){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file+'.next',JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(file+'.next',file);}
export function selectedManifest(name){
 requireStagingHost();
 if(!Object.hasOwn(ports,name))throw Error('Unregistered staging service.');
 const files=fs.readdirSync(stagingRoot+'/releases').filter(f=>new RegExp('^'+name+'-v-[0-9]+[.][0-9]+[.][0-9]+[.]json$').test(f));
 files.sort((a,b)=>{const x=a.slice(name.length+3,-5).split('.').map(Number),y=b.slice(name.length+3,-5).split('.').map(Number);return y[0]-x[0]||y[1]-x[1]||y[2]-x[2];});
 if(!files.length)throw Error('Prepare the selected approved staging manifest first.');
 const manifest=read(stagingRoot+'/releases/'+files[0]);
 validateManifest(manifest,{owner:(['platform','iilabs'].includes(name)?'apps/':'devkit/')+name,repository:'CODEXSUN/'+name,tag:manifest.tag,commit:manifest.commit});
 const image=JSON.parse(docker(['image','inspect',manifest.imageId]))[0];
 if(image.Id!==manifest.imageId||image.Config.Labels?.['org.opencontainers.image.version']!==manifest.version||image.Config.Labels?.['org.opencontainers.image.revision']!==manifest.commit)throw Error('Staging candidate image identity differs.');
 return manifest;
}
export function stagingCredentials(){requireStagingHost();return read(stagingRoot+'/private/credentials.json');}
export async function withAdmin(work){
 const {Client}=createRequire(operator+'/package.json')('pg');const secrets=stagingCredentials();
 const db=new Client({host:addresses.postgres,port:5432,database:'postgres',user:'postgres',password:secrets.postgresPassword,connectionTimeoutMillis:5000});
 await db.connect();try{return await work(db);}finally{await db.end();}
}
export async function createOwnedDatabases(scope,databases,role,password){
 requireStagingHost();const file=stagingRoot+'/state/ownership/'+scope+'.json';
 if(fs.existsSync(file))throw Error('Staging database ownership already exists; inspect retained state, never reset implicitly.');
 if(!['platform','codeitz'].includes(scope)||role!==(scope==='platform'?'platform_service':'codeitz')||databases.some(v=>!['platform_master','platform_codexsun','codeitz'].includes(v))||!/^[a-f0-9]{64}$/.test(password))throw Error('Selected staging database scope differs.');
 await withAdmin(async db=>{
  if((await db.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount)throw Error('Staging role exists without ownership.');
  for(const name of databases)if((await db.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount)throw Error('Staging database exists without ownership.');
  save(file,{target:'ubuntu-staging',scope,databases,role,status:'provisioning',at:new Date().toISOString()});
  const statement=(await db.query("SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',$1::text,$2::text)",[role,password])).rows[0].format;await db.query(statement);
  for(const name of databases){await db.query('CREATE DATABASE '+name+' OWNER '+role);await db.query('REVOKE ALL ON DATABASE '+name+' FROM PUBLIC');}
  save(file,{target:'ubuntu-staging',scope,databases,role,status:'fresh-owned',at:new Date().toISOString()});
 });
}
export function connection(role,password,database){const value=new URL('postgresql://postgres:5432/'+database);value.username=role;value.password=password;return value.href;}
export function privateEnvironment(name,environment){
 const directory=stagingRoot+'/state/'+name+'/private';fs.mkdirSync(directory,{recursive:true,mode:0o700});
 fs.writeFileSync(directory+'/runtime.env',serializeDeploymentEnvironment(environment),{mode:0o600});fs.writeFileSync(directory+'/compose.env',rawEnvironment(environment),{mode:0o600});return directory;
}
export function runImage(manifest,args,{environment={},mounts=[],input,dockerOptions=[]}={}){
 const flags=Object.entries(environment).flatMap(([k,v])=>['-e',k+'='+v]);
 if(Object.keys(environment).some(k=>/PASSWORD|TOKEN|DATABASE_URL|KEY$/.test(k)))throw Error('Private settings must use a protected mounted file or stdin, never process arguments.');
 return docker(['run','--rm','-i','--network',stagingNetwork,...dockerOptions,...flags,...mounts.flatMap(value=>['--mount',value]),'--entrypoint','node',manifest.imageId,...args],input);
}
export async function ready(name){
 const port=ports[name][0];for(let i=0;i<90;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/api/ready',{signal:AbortSignal.timeout(3000)});await r.body?.cancel();if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,1000));}throw Error('Selected staging service did not become ready.');
}
export async function startService(name,manifest,environment,{command,volumes=[],mountRuntime,extraEnvironment={}}={}){
 requireStagingHost();const priorFile=stagingRoot+'/state/'+name+'/state.json',prior=fs.existsSync(priorFile)?read(priorFile):undefined;
 const directory=privateEnvironment(name,environment),project=['platform','iilabs'].includes(name)?'applications':'devkits';
 if(mountRuntime)volumes.push({type:'bind',source:mountRuntime,target:'/run/codeship',read_only:true});
 const definition={name:project,services:{[name]:{image:manifest.imageId,container_name:name,init:true,restart:'unless-stopped',security_opt:['no-new-privileges:true'],cap_drop:['ALL'],env_file:[{path:directory+'/compose.env',format:'raw'}],environment:{NODE_ENV:'production',...extraEnvironment},...(command?{command}:{}),ports:['127.0.0.1:'+ports[name][0]+':'+ports[name][1]],networks:{backend:{ipv4_address:addresses[name],aliases:[name]}},volumes,healthcheck:{test:['CMD','node','-e',"fetch('http://127.0.0.1:"+ports[name][1]+"/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],interval:'5s',timeout:'4s',retries:30,start_period:'10s'}}},networks:{backend:{external:true,name:stagingNetwork}}};
 const named=volumes.filter(v=>v.type==='volume');if(named.length)definition.volumes=Object.fromEntries(named.map(v=>[v.source,{external:true,name:v.source}]));
 definition.networks.ingress={external:true,name:ingressNetwork};
 definition.services[name].networks.ingress={ipv4_address:addresses[name].replace('172.30.40.','172.30.41.')};
 definition.services[name].extra_hosts=Object.entries(addresses).map(([alias,address])=>alias+':'+address);
 const composeFile=stagingRoot+'/state/'+name+'/compose.json';
 if(prior){const recovery=stagingRoot+'/recovery/'+name+'-'+Date.now();fs.mkdirSync(recovery,{mode:0o700});for(const file of [priorFile,composeFile])if(fs.existsSync(file))fs.copyFileSync(file,recovery+'/'+path.basename(file));}
 save(composeFile,definition);docker(['compose','-p',project,'-f',composeFile,'config','--quiet']);docker(['compose','-p',project,'-f',composeFile,'up','-d','--no-build','--wait','--wait-timeout','150',name]);await ready(name);
 const actual=JSON.parse(docker(['inspect',name]))[0];if(actual.Image!==manifest.imageId||actual.HostConfig.PortBindings[ports[name][1]+'/tcp']?.[0]?.HostIp!=='127.0.0.1')throw Error('Staging runtime identity/private binding differs.');
 save(priorFile,{...manifest,target:'ubuntu-staging',image:manifest.imageId,compose:composeFile,containerId:actual.Id,verifiedAt:new Date().toISOString()});console.log(name+': staging readiness and exact image verified '+manifest.version);
}
