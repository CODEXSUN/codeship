import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,open,unlink,rename,readdir} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {parseEnv} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {migrationDecision} from './policy.mjs';
import {ensureMetricsCollector} from '../scripts/metrics-runtime.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),workspace=path.resolve(root,'../..');
try{await readFile(path.join(root,'.codeship/devkits/state.json'));throw new Error('Deployment belongs to Devkits. Use .container/devkits/setup.sh, update.sh or verify.sh.');}catch(error){if(error.code!=='ENOENT')throw error;}
const args=process.argv.slice(2),mode=args.shift();let envFile=path.join(root,'.codeship/docker/codeship.env'),check=false,resume=false;
for(let i=0;i<args.length;i++){if(args[i]==='--env'&&args[i+1])envFile=path.resolve(args[++i]);else if(args[i]==='--check')check=true;else if(args[i]==='--resume')resume=true;else throw new Error('Use setup|update|verify [--env private-file] [--check].');}
if(resume&&mode!=='setup')throw new Error('Resume applies only to incomplete initial setup.');
if(!['setup','update','verify'].includes(mode)||!envFile.startsWith(path.join(root,'.codeship')+path.sep))throw new Error('Use a Codeship private deployment environment.');
const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
let config;try{config=parseEnv(await readFile(envFile,'utf8'));}catch(error){if(error.code!=='ENOENT'||mode!=='setup'||check)throw error;config={COMPOSE_PROJECT_NAME:'codeship',HOST_PORT:'4450',CODESHIP_IMAGE:'codeship:'+version,NODE_IMAGE:'node:26.13.1-bookworm-slim',APP_VERSION:version,SOURCE_DIGEST:'unbuilt'};await mkdir(path.dirname(envFile),{recursive:true,mode:0o700});await writeFile(envFile,serialize(config),{mode:0o600,flag:'wx'});}
function serialize(values){return Object.entries(values).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n';}
if(!['codeship','codeship-local'].includes(config.COMPOSE_PROJECT_NAME)||config.HOST_PORT!=='4450')throw new Error('This reviewed local profile requires codeship on 4450 (legacy codeship-local profiles remain supported).');
if(!check&&mode!=='verify')await mkdir(path.join(root,'.codeship/metrics'),{recursive:true,mode:0o700});
delete config.NGINX_IMAGE;
if(config.NODE_IMAGE!=='node:26.13.1-bookworm-slim')throw new Error('Infrastructure image changes need separate review.');
let runtime={...config};
function docker(args,{input,capture=false}={}){const result=spawnSync('docker',args,{cwd:root,env:{...process.env,...runtime},windowsHide:true,input,stdio:input!==undefined||capture?['pipe','pipe','pipe']:'inherit',maxBuffer:16*1024*1024});if(result.error||result.status!==0)throw new Error('Docker operation failed: '+args.slice(0,3).join(' '));return result.stdout?.toString().trim()??'';}
const base=['compose','--env-file',envFile,'--project-name',config.COMPOSE_PROJECT_NAME,'-f',path.join(root,'.container/compose.yml')];
const compose=(args,options)=>docker([...base,...args],options);
const tool=(command,options)=>compose(['run','--rm','--no-deps','-T','tools',...command],options);
if(docker(['info','--format','{{.OSType}}'],{capture:true})!=='linux')throw new Error('Linux Docker engine required.');const networkName=config.COMPOSE_PROJECT_NAME+'_default';
let network;try{network=JSON.parse(docker(['network','inspect',networkName],{capture:true}))[0];}catch(error){if(mode!=='setup'||check)throw error;docker(['network','create','--label','codeship.owner='+config.COMPOSE_PROJECT_NAME,networkName],{capture:true});network=JSON.parse(docker(['network','inspect',networkName],{capture:true}))[0];}
const dockerPeers=network.IPAM.Config.map(item=>item.Gateway).filter(value=>/^\d+\.\d+\.\d+\.\d+$/.test(value));if(!dockerPeers.length)throw new Error('Docker bridge has no explicit IPv4 gateway.');config.CODESHIP_DOCKER_PEERS=dockerPeers.join(',');runtime={...config};
compose(['config','--quiet'],{capture:true});
async function verify(){
 await ensureMetricsCollector();
 let fresh=false;
 for(let attempt=0;attempt<20;attempt++){
  const response=await fetch('http://127.0.0.1:4450/api/v1/docker-metrics/infra',{signal:AbortSignal.timeout(5000)});
  const report=await response.json();if(response.ok&&report.available&&!report.stale){fresh=true;break;}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 if(!fresh)throw new Error('Host collector did not provide fresh Docker metrics.');
for(const route of ['/api/live','/api/ready','/registry','/registry/new','/api/v1/applications','/api/v1/targets','/api/v1/deployments','/api/v1/observations','/infrastructure','/api/v1/infrastructure']){const response=await fetch('http://127.0.0.1:4450'+route,{signal:AbortSignal.timeout(15000)});if(response.status!==200)throw new Error('Verification failed: '+route);await response.body?.cancel();}const foreign=await fetch('http://127.0.0.1:4450/api/v1/applications',{headers:{Origin:'https://example.invalid'},signal:AbortSignal.timeout(10000)});if(foreign.status!==403)throw new Error('Cross-origin protection failed.');console.log('Codeship ready: http://127.0.0.1:4450; registry, records, readiness and origin protection passed.');}
if(mode==='verify'){await verify();process.exit(0);}if(check){console.log('Docker and reviewed deployment identity verified; no changes.');process.exit(0);}
const lockFile=envFile+'.lock';let lock;try{lock=await open(lockFile,'wx',0o600);}catch{throw new Error('Deployment locked. Inspect the existing operation before retrying.');}
const run=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(3).toString('hex'),logDir=path.join(path.dirname(envFile),'runs',run);await mkdir(logDir,{recursive:true,mode:0o700});
const logFile=path.join(logDir,'stages.jsonl'),markdown=path.join(logDir,'stages.md');
async function stage(name,status,detail={}){const row={at:new Date().toISOString(),stage:name,status,...detail};await writeFile(logFile,JSON.stringify(row)+'\n',{flag:'a',mode:0o600});await writeFile(markdown,`- ${row.at} **${name}** ${status} ${JSON.stringify(detail)}\n`,{flag:'a',mode:0o600});console.log(name+': '+status);}
const stateFile=envFile+'.release.json';let previous,backedUp=false,stopped=false,migrated=false;
try{
 try{previous=JSON.parse(await readFile(stateFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(mode==='setup'){const retained=docker(['volume','ls','-q','--filter','label=com.docker.compose.project='+config.COMPOSE_PROJECT_NAME],{capture:true});if(previous||((retained||compose(['ps','-aq'],{capture:true}))&&!resume))throw new Error('Installation already exists. Use update; retained incomplete setup needs operator recovery.');}else if(!previous)throw new Error('Update requires a successful setup record.');
 const manifest={};const hash=createHash('sha256');
 async function scan(dir){for(const entry of (await readdir(path.join(workspace,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(['node_modules','dist','.git','.codeship','docs','tests','tools'].includes(entry.name)||entry.name.startsWith('.env')||entry.name.endsWith('.log'))continue;const file=path.posix.join(dir,entry.name);if(entry.isDirectory())await scan(file);else if(entry.isFile()){const content=await readFile(path.join(workspace,file));hash.update(file+'\0').update(content);if(file.includes('/sqlite-migrations/')&&file.endsWith('.ts'))manifest[path.basename(file,'.ts')]=createHash('sha256').update(content).digest('hex');}}}
 for(const dir of ['devkit/codeship','foundation/framework','packages/ui'])await scan(dir);
 const digest=hash.digest('hex'),image=config.COMPOSE_PROJECT_NAME+':'+version+'-'+digest.slice(0,12);runtime={...config,CODESHIP_IMAGE:image,APP_VERSION:version,SOURCE_DIGEST:digest};
 await stage('preflight','passed',{project:config.COMPOSE_PROJECT_NAME,port:4450,version,image,sourceDigest:digest});
 await stage('image-build','started');compose(['build','app']);await stage('image-build','passed');
 if(mode==='setup'){
  // Copy the portable operator database using SQLite's online backup API, with its key separately.
  const snapshot=path.join(logDir,'initial.sqlite');const result=spawnSync(process.execPath,['scripts/backup.ts',snapshot],{cwd:root,stdio:'inherit',windowsHide:true});if(result.status!==0)throw new Error('Prepare the native SQLite database and vault before first setup.');
  const key=await readFile(process.env.CODESHIP_VAULT_KEY_FILE??path.join(root,'.codeship/keys/vault.key'));if(key.length!==32)throw new Error('Invalid vault key.');
  await stage('initial-data','started');compose(['run','--rm','--no-deps','-T','--user','0:0','--cap-add','CHOWN','--cap-add','DAC_OVERRIDE','tools','node','scripts/bootstrap-container.ts'],{input:JSON.stringify({database:(await readFile(snapshot)).toString('base64'),key:key.toString('base64')})});await stage('initial-data','passed');
 }
 const plan=JSON.parse(tool(['node','scripts/migration-plan.ts'],{capture:true}));
 const decision=migrationDecision(plan,previous?.migrations,manifest);await stage('migration-plan','passed',decision);
 if(decision.migrateRequired){
  if(mode==='update'){compose(['stop','app']);stopped=true;
   const destination='/data/backups/'+run+'.sqlite';await stage('database-backup','started');tool(['node','scripts/backup.ts',destination]);const backupDir=path.join(path.dirname(envFile),'backups');await mkdir(backupDir,{recursive:true,mode:0o700});const hostBackup=path.join(backupDir,run+'.sqlite');const appContainer=compose(['ps','-aq','app'],{capture:true});if(!appContainer)throw new Error('Stopped app container missing for backup export.');docker(['cp',appContainer+':'+destination,hostBackup]);const sha256=createHash('sha256').update(await readFile(hostBackup)).digest('hex');await writeFile(hostBackup+'.json',JSON.stringify({sha256,previousImage:previous.image,createdAt:new Date().toISOString()},null,2)+'\n',{mode:0o600});backedUp=true;await stage('database-backup','passed',{file:hostBackup,sha256,integrity:'ok'});
  }
  await stage('migration','started');tool(['node','scripts/database.ts','migrate']);migrated=true;await stage('migration','passed');
 }else{await stage('database-backup','skipped',{reason:'No pending database migrations'});await stage('migration','skipped',{reason:'No pending database migrations'});}
 await stage('infrastructure-register','started');tool(['node','scripts/seed-infrastructure.ts']);await stage('infrastructure-register','passed');
 await stage('registry-environment','started');tool(['node','scripts/write-runtime-environment.ts']);await stage('registry-environment','passed');
 await stage('image-replacement','started');
 // Retire only the former gateway service in this reviewed project; preserve all volumes.
 const legacyGateways=docker(['ps','-aq','--filter','label=com.docker.compose.project='+config.COMPOSE_PROJECT_NAME,'--filter','label=com.docker.compose.service=gateway'],{capture:true}).split('\n').filter(Boolean);
 if(legacyGateways.length){await stage('legacy-gateway-removal','started');docker(['rm','-f',...legacyGateways]);await stage('legacy-gateway-removal','passed');}
 compose(['up','-d','--no-build','--no-deps','--wait','--wait-timeout','180','app']);await stage('image-replacement','passed');
 await stage('verification','started');await verify();
 const applied=JSON.parse(tool(['node','scripts/migration-plan.ts'],{capture:true}));if(applied.pending.length)throw new Error('Migrations remain pending.');
 const actual=JSON.parse(docker(['image','inspect',image,'--format','{{json .}}'],{capture:true}));
 await stage('verification','passed',{imageId:actual.Id});
 const state={project:config.COMPOSE_PROJECT_NAME,version,image,imageId:actual.Id,sourceDigest:digest,previousImage:previous?.image??null,migrations:manifest,mode,backupCreated:backedUp,deployedAt:new Date().toISOString(),runLog:logDir};
 await writeFile(stateFile+'.next',JSON.stringify(state,null,2)+'\n',{mode:0o600});await rename(stateFile+'.next',stateFile);
 await writeFile(envFile+'.next',serialize(runtime),{mode:0o600});await rename(envFile+'.next',envFile);
 await stage('release','succeeded',{version,image});
}catch(error){await stage('release','failed',{message:error.message,backupCreated:backedUp,migrationCompleted:migrated});console.error('Retain data/key volumes, previous image and stage logs. No automatic rollback or retry.');throw error;}
finally{await lock.close();await unlink(lockFile);}
