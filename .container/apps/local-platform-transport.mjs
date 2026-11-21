import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {parseEnv} from 'node:util';
import {businessTargets} from './business-targets.mjs';
import {serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
import {rawEnvironment} from '../raw-environment.mjs';

/** Only exact managed loopback origins are added; public and entry policy is retained. */
export function localPlatformBrowserOrigins(environment){
 const current=JSON.parse(environment.PLATFORM_BROWSER_ORIGINS??'[]');
 if(!Array.isArray(current)||current.some(value=>typeof value!=='string'||!/^https?:\/\//.test(value)||new URL(value).origin!==value))throw Error('Review existing Platform browser origins.');
 return [...new Set([...current,...[14385,14350,14305,14315,...Object.values(businessTargets).map(row=>row.port)].map(port=>'http://127.0.0.1:'+port)])];
}

/** Config-only reconciliation for an existing Windows Docker Platform. Never runs on VPS. */
export async function ensureLocalPlatformTransport(root){
 if(process.platform!=='win32')throw Error('Local Platform transport reconciliation is Windows-only.');
 const base=path.join(root,'.codeship'),target=path.join(base,'target.json');
 if(fs.existsSync(target)&&JSON.parse(fs.readFileSync(target,'utf8')).id!=='local-docker')throw Error('Local target identity differs.');
 const directory=path.join(base,'apps/platform'),state=JSON.parse(fs.readFileSync(path.join(directory,'state.json'),'utf8'));
 const files={runtime:path.join(directory,'private/runtime.env'),raw:path.join(directory,'private/compose.env'),compose:path.join(directory,'compose.json')};
 const environment=parseEnv(fs.readFileSync(files.runtime,'utf8'));
 const origins=JSON.stringify(localPlatformBrowserOrigins(environment)),definition=JSON.parse(fs.readFileSync(files.compose,'utf8'));
 const service=definition.services?.platform;
 if(!service||service.container_name!=='platform'||service.network_mode||JSON.stringify(service.ports)!==JSON.stringify(['127.0.0.1:14385:4385']))throw Error('Existing private independent Platform is required.');
 const docker=args=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();}catch{throw Error('Local Platform transport operation failed; private configuration retained.');}};
 const current=JSON.parse(docker(['inspect','platform']))[0];
 const approved=state.imageId??state.image;
 if(current.Image!==docker(['image','inspect',approved,'--format','{{.Id}}']))throw Error('Existing Platform image identity differs.');
 const actual=Object.fromEntries(current.Config.Env.map(value=>{const i=value.indexOf('=');return [value.slice(0,i),value.slice(i+1)];}));
 if(environment.PLATFORM_BROWSER_ORIGINS===origins&&actual.PLATFORM_BROWSER_ORIGINS===origins)return;
 const recovery=path.join(directory,'private/recovery/transport-'+new Date().toISOString().replaceAll(':','-'));
 fs.mkdirSync(recovery,{recursive:true,mode:0o700});
 for(const [key,file]of Object.entries(files))fs.copyFileSync(file,path.join(recovery,key));
 environment.PLATFORM_BROWSER_ORIGINS=origins;service.environment={...service.environment,PLATFORM_BROWSER_ORIGINS:origins};
 fs.writeFileSync(files.runtime,serializeDeploymentEnvironment(environment),{mode:0o600});fs.writeFileSync(files.raw,rawEnvironment(environment),{mode:0o600});fs.writeFileSync(files.compose,JSON.stringify(definition,null,2)+'\n',{mode:0o600});
 const compose=args=>docker(['compose','-p','applications','-f',files.compose,...args]);
 try{
  compose(['config','--quiet']);compose(['up','-d','--no-deps','--no-build','--pull','never','--wait','--wait-timeout','180','platform']);
  if(docker(['inspect','platform','--format','{{.Image}}'])!==current.Image)throw Error('Platform image changed during config-only reconciliation.');
  const ready=await fetch('http://127.0.0.1:14385/api/ready',{signal:AbortSignal.timeout(10000)});await ready.body?.cancel();if(!ready.ok)throw Error('Platform readiness failed.');
 }catch(error){for(const [key,file]of Object.entries(files))fs.copyFileSync(path.join(recovery,key),file);compose(['up','-d','--no-deps','--no-build','--pull','never','--wait','--wait-timeout','180','platform']);throw error;}
 console.log('Local Platform same-image transport reconciled; accounts, grants and databases unchanged.');
}
