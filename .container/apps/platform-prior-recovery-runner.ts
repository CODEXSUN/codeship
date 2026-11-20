import {readFile,writeFile,lstat} from 'node:fs/promises';
import {realpathSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync,fork} from 'node:child_process';
import {hostname} from 'node:os';
import path from 'node:path';
import {parseEnv} from 'node:util';
import pg from 'pg';
import {appRoot} from '../../src/api/database.ts';
import {validatePriorRecoveryProof} from '../hostinger/update-policy.mjs';
import {platformRecoveryScopes,assertPlatformPostgresClients} from './platform-migration.mjs';
import {snapshotPlatformPriorDatabase,hashPlatformPriorFiles,hashPlatformPriorArchiveSchema,executePlatformPriorRecovery} from './platform-prior-recovery.mjs';

const stateRoot='/home/codebiz/.deployment/state';
const [releaseSetFile,proofFile,...extra]=process.argv.slice(2);
if(extra.length||!releaseSetFile||!proofFile||process.platform!=='linux'||hostname()!=='srv914719'||process.getuid?.()!==0||appRoot.replace(/[\\/]$/,'')!=='/home/codebiz/devkit/codeship'||process.env.CODESHIP_RELEASED_UPDATE_ENTRY!=='1'||process.env.CODESHIP_APP_SCRIPT_ENTRY!=='1')throw Error('Use the released selected Platform prior-recovery update entry');
for(const file of [releaseSetFile,proofFile]){
 const real=realpathSync(file),stat=await lstat(file);
 if(!real.startsWith(stateRoot+'/devkits/approved/')||!stat.isFile()||stat.isSymbolicLink()||stat.size>256000)throw Error('Prior recovery requires the bounded approved private operation files');
}
const set=JSON.parse(await readFile(releaseSetFile,'utf8'));
if(set.schema!==1||set.source!=='github'||Object.keys(set.services??{}).join(',')!=='platform')throw Error('Prior recovery requires the selected approved Platform release');
const proof=validatePriorRecoveryProof(JSON.parse(await readFile(proofFile,'utf8')));
const root=path.join(stateRoot,'apps/platform'),privateRoot=path.join(root,'private');
const files={state:path.join(root,'state.json'),environment:path.join(privateRoot,'runtime.env'),compose:path.join(root,'compose.json'),composeEnvironment:path.join(privateRoot,'compose.env')};
const retainedDirectory=path.join(privateRoot,'recovery',proof.failedRun);
const retained=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,path.join(retainedDirectory,path.basename(file))]));
const run=new Date().toISOString().replace(/[:.]/g,'-');
async function record(stage:string,status:string,details:Record<string,unknown>){await writeFile(path.join(root,'stages.jsonl'),JSON.stringify({at:new Date().toISOString(),run,mode:'recover-prior',stage,status,...details})+'\n',{flag:'a',mode:0o600});console.log(stage+': '+status);}
function pgTool(command:string,args:string[],env=process.env,input?:Buffer){const result=spawnSync(command,args,{cwd:appRoot,env,input,windowsHide:true,maxBuffer:128*1024*1024,timeout:180000,stdio:['pipe','pipe','pipe']});if(result.error||result.status!==0)throw Error('Read-only Platform archive fingerprint failed');return result.stdout;}
function docker(args:string[]){const result=spawnSync('docker',args,{cwd:appRoot,encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024,timeout:240000,stdio:['ignore','pipe','pipe']});if(result.error||result.status!==0)throw Error('Selected Platform Docker operation failed');return result.stdout.trim();}
async function inspectProof(){
 const priorState=JSON.parse(await readFile(files.state,'utf8'));
 const currentFiles=await hashPlatformPriorFiles(files),retainedFiles=await hashPlatformPriorFiles(retained);
 const environment=Object.fromEntries(Object.entries(parseEnv(await readFile(files.environment,'utf8'))).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
 const ownershipMarker=JSON.parse(await readFile(path.join(root,'database-import.json'),'utf8'));
 const failedStages=(await readFile(path.join(root,'stages.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
 for(const baseline of proof.baseline){
  const backup=path.join(privateRoot,baseline.database+'-before-'+proof.failedRun+'.dump'),stat=await lstat(backup);
  if(!stat.isFile()||stat.isSymbolicLink())throw Error('Retained scoped backup must be a regular file');
  const hash=createHash('sha256');for await(const chunk of createReadStream(backup))hash.update(chunk);
  if(hash.digest('hex')!==baseline.backupSha256)throw Error('Retained scoped backup differs from off-host proof');
 }
 const actual=JSON.parse(docker(['inspect','platform','--format','{"imageId":{{json .Image}},"status":{{json .State.Status}},"running":{{json .State.Running}}}']));
 const sqlitePath=process.env.CODESHIP_SQLITE_FILE;
 if(sqlitePath!==stateRoot+'/data/codeship.sqlite'||process.env.CODESHIP_VAULT_KEY_FILE!==stateRoot+'/keys/vault.key')throw Error('Saved private operator configuration differs');
 const sqlite=new DatabaseSync(sqlitePath,{readOnly:true});let port:number;
 try{const rows=sqlite.prepare("SELECT port FROM infrastructure_services WHERE kind='postgres' AND environment='local-docker'").all();if(rows.length!==1||!Number.isInteger(rows[0].port)||Number(rows[0].port)<1||Number(rows[0].port)>65535)throw Error('Registered PostgreSQL binding is ambiguous');port=Number(rows[0].port);}finally{sqlite.close();}
 const connect=async(key:string)=>{const url=new URL(environment[key]??'');url.hostname='127.0.0.1';url.port=String(port);const client=new pg.Client({connectionString:url.href,connectionTimeoutMillis:5000,statement_timeout:30000,query_timeout:35000});await client.connect();return client;};
 const plans=JSON.parse(docker(['run','--rm','--network','cxapp-network','--mount','type=bind,source='+files.environment+',target=/run/platform.env,readonly','--entrypoint','node',set.services.platform.imageId,'--env-file=/run/platform.env','scripts/release-database.ts','plan']));
 const master=await connect('PLATFORM_MASTER_DATABASE_URL');let scopes:ReturnType<typeof platformRecoveryScopes>;
 try{assertPlatformPostgresClients((await master.query('SHOW server_version_num')).rows[0]?.server_version_num,pgTool('pg_dump',['--version']).toString().trim(),pgTool('pg_restore',['--version']).toString().trim());const registrations=(await master.query('SELECT d.database_name,d.connection_secret_ref,t.public_id FROM public.tenant_databases d JOIN public.tenants t ON t.id=d.tenant_id WHERE d.active AND t.active')).rows;scopes=platformRecoveryScopes(plans,registrations,ownershipMarker,environment);}finally{await master.end();}
 const currentSnapshots=[];
 for(const scope of scopes){
  const client=await connect(scope.key);let snapshot;
  try{snapshot=await snapshotPlatformPriorDatabase(client);}finally{await client.end();}
  const url=new URL(environment[scope.key]);
  const connectionEnv={...process.env,PGHOST:'127.0.0.1',PGPORT:String(port),PGDATABASE:scope.database,PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:url.searchParams.get('sslmode')??'disable',PGCONNECT_TIMEOUT:'5',PGOPTIONS:'-c statement_timeout=30000'};
  const archive=pgTool('pg_dump',['--format=custom','--no-owner','--no-privileges'],connectionEnv);
  const schema=pgTool('pg_restore',['--file=-','--schema-only','--no-owner','--no-privileges'],process.env,archive).toString('utf8');
  currentSnapshots.push({scope:scope.scope,database:scope.database,...snapshot,schemaSha256:hashPlatformPriorArchiveSchema(schema)});
 }
 return {approvedManifest:set.services.platform,priorState,actual,plans,scopes,ownershipMarker,currentFiles,retainedFiles,composeFile:files.compose,retainedDirectory,failedStages,latestFailedRun:proof.failedRun,baseline:proof.baseline,currentSnapshots,waitSeconds:180};
}
function containerBindings(){const ids=docker(['ps','-aq']).split(/\s+/).filter(Boolean);if(!ids.length)throw Error('Prior Platform container missing');return JSON.parse(docker(['inspect',...ids])).map((row:any)=>({name:row.Name,id:row.Id,image:row.Image,running:row.State.Running,status:row.State.Status})).sort((a:any,b:any)=>a.name.localeCompare(b.name));}
try{
 const before=containerBindings(),siblings=JSON.stringify(before.filter((row:any)=>row.name!=='/platform')),priorId=before.find((row:any)=>row.name==='/platform')?.id;
 if(!priorId)throw Error('Prior Platform container missing');
 await executePlatformPriorRecovery(await inspectProof(),{
  recheck:inspectProof,
  start:async(args:string[])=>{docker(args);const after=containerBindings();if(JSON.stringify(after.filter((row:any)=>row.name!=='/platform'))!==siblings||after.find((row:any)=>row.name==='/platform')?.id!==priorId)throw Error('Container identity changed during selected prior runtime start');},
  verify:async()=>{const child=fork('.container/apps/lifecycle.ts',['verify','platform'],{cwd:appRoot,env:process.env,stdio:['ignore','inherit','inherit','ipc']});const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Prior Platform readiness exceeded its bound'));},180000);child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);resolve(code);});});if(code!==0)throw Error('Prior Platform bounded readiness failed');},
  record,
 });
}catch{await record('prior-recovery','failed',{message:'Prior runtime recovery stopped; data and successful release pointer retained'});process.exitCode=1;}
