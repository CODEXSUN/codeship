import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateManifest} from '../release-policy.mjs';
import {resolveReleaseImage} from '../release-image.mjs';

const root=fs.realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const state=root+'/.codeship/apps/iilabs-public',stateFile=state+'/state.json',composeFile=state+'/compose.json';
const run=new Date().toISOString().replace(/[:.]/g,'-');
const docker=(args)=>cp.execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024}).trim();
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const save=(file,value)=>{fs.writeFileSync(file+'.next',JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(file+'.next',file);};
const compose=args=>docker(['compose','-p','applications','-f',composeFile,...args]);
const siblings=()=>JSON.parse(docker(['inspect',...docker(['ps','-q']).split(/\s+/)])).filter(c=>c.Name!=='/iilabs').map(c=>({name:c.Name,id:c.Id,image:c.Image})).sort((a,b)=>a.name.localeCompare(b.name));
async function verify(manifest){
 const facts=JSON.parse(docker(['inspect','iilabs']))[0];
 if(facts.Image!==manifest.imageId||facts.State.Health?.Status!=='healthy'||facts.Config.Labels?.['io.codebiz.runtime-mode']!=='public-site-only')throw Error('Public container identity or readiness differs.');
 const bindings=facts.HostConfig.PortBindings;
 if(Object.keys(bindings).length!==1||bindings['4435/tcp']?.[0]?.HostIp!=='127.0.0.1'||bindings['4435/tcp']?.[0]?.HostPort!=='14435')throw Error('Public origin must stay loopback bound.');
 for(const route of ['/','/services/','/approach/','/studio/']){const response=await fetch('http://127.0.0.1:14435'+route,{signal:AbortSignal.timeout(10000)});if(response.status!==200||!response.headers.get('content-type')?.includes('text/html'))throw Error('Public page unavailable.');await response.body?.cancel();}
 const denied=await fetch('http://127.0.0.1:14435/api/v1/workspace',{signal:AbortSignal.timeout(10000)});await denied.body?.cancel();if(denied.status!==503)throw Error('Backend must remain unavailable.');
}
async function main(){
 const [mode,name,...args]=process.argv.slice(2);
 if(process.platform!=='linux'||os.hostname()!=='srv914719'||process.getuid()!==0||root!=='/home/codebiz/devkit/codeship'||process.env.CODESHIP_RELEASED_UPDATE_ENTRY!=='1')throw Error('Use the selected released Hostinger entry.');
 if(name!=='iilabs'||!['setup','update','verify'].includes(mode))throw Error('Select IILabs only.');
 const target=read(root+'/.codeship/target.json');if(target.id!=='hostinger-914719'||target.host!=='69.62.81.166'||target.binding!=='127.0.0.1')throw Error('Target differs.');
 const prior=fs.existsSync(stateFile)?read(stateFile):undefined;
 if(mode==='verify'){if(!prior)throw Error('Public website not installed.');await verify(prior);return;}
 if(args.length!==2||args[0]!=='--release-set'||mode==='setup'&&prior||mode==='update'&&!prior)throw Error('Explicit selected installation state/release required.');
 const set=read(path.resolve(args[1])),manifest=set.services?.iilabs;if(set.schema!==1||set.source!=='github'||!manifest)throw Error('Approved IILabs release required.');
 validateManifest(manifest,{owner:'apps/iilabs',repository:'CODEXSUN/iilabs',tag:manifest.tag,commit:manifest.commit});
 if(prior?.runtimeMode&&prior.runtimeMode!=='public-site-only')throw Error('Cannot replace a backend deployment with a public-only container.');
 fs.mkdirSync(state,{recursive:true,mode:0o700});
 const baseline=siblings();
 if(!prior&&docker(['ps','-aq','--filter','name=^/iilabs$']))throw Error('IILabs container already exists without this public-site ownership.');
 const image=await resolveReleaseImage(manifest,docker,root+'/.codeship/releases/images');
 const labels=JSON.parse(docker(['image','inspect',image,'--format','{{json .Config.Labels}}']));
 if(labels['org.opencontainers.image.version']!==manifest.version||labels['org.opencontainers.image.revision']!==manifest.commit)throw Error('Release labels differ.');
 const runtime=state+'/runtime-'+run;fs.mkdirSync(runtime,{mode:0o755});
 fs.copyFileSync(root+'/.container/hostinger/iilabs-public-runtime.mjs',runtime+'/start.mjs');fs.chmodSync(runtime+'/start.mjs',0o644);
 if(prior){const recovery=state+'/recovery-'+run;fs.mkdirSync(recovery,{mode:0o700});for(const file of [stateFile,composeFile])fs.copyFileSync(file,recovery+'/'+path.basename(file));}
 const definition={name:'applications',services:{iilabs:{image,container_name:'iilabs',init:true,restart:'unless-stopped',read_only:true,cap_drop:['ALL'],security_opt:['no-new-privileges:true'],environment:{NODE_ENV:'production',IILABS_PUBLIC_ONLY:'1'},labels:{'io.codebiz.runtime-mode':'public-site-only'},ports:['127.0.0.1:14435:4435'],command:['node','/run/codeship/start.mjs'],volumes:[{type:'bind',source:runtime,target:'/run/codeship',read_only:true}],healthcheck:{test:['CMD','node','-e',"fetch('http://127.0.0.1:4435/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],interval:'3s',timeout:'3s',retries:20,start_period:'5s'}}}};
 save(composeFile,definition);compose(['config','--quiet']);compose(['up','-d','--no-build','--wait','--wait-timeout','90','iilabs']);
 await verify(manifest);if(JSON.stringify(siblings())!==JSON.stringify(baseline))throw Error('An unselected container changed.');
 save(stateFile,{...manifest,image,imageId:manifest.imageId,runtimeMode:'public-site-only',backendConfigured:false,updatedAt:new Date().toISOString(),compose:composeFile});
 console.log('IILabs public pages verified; private origin14435; no backend, tenant, data or existing container changes.');
}
main().catch(()=>{console.error('Public-site deployment stopped; retain prior image/configuration and correct locally.');process.exitCode=1;});
