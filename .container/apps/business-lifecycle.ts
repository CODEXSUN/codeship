import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,open,unlink,rename,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
import path from 'node:path';
import pg from 'pg';
import {businessTarget,businessServiceProfile} from './business-targets.mjs';
import {withSourceSnapshot} from './postgres-snapshot.ts';
import {appRoot,workspaceRoot,openDatabase} from '../../src/api/database.ts';
import {decryptSecrets} from '../../src/api/modules/master/application/vault.ts';
import {serializeDeploymentEnvironment,installationUsers} from '../../src/api/modules/master/application/accounts.ts';
import {currentEnvironment} from '../../src/api/modules/master/application/environment.ts';
import {applicationInput} from '../../src/api/modules/master/application/service.ts';
import {validateManifest} from '../release-policy.mjs';
import {resolveReleaseImage} from '../release-image.mjs';
import {rawEnvironment,requireRawCompose} from '../raw-environment.mjs';
import {migrationDecision} from '../policy.mjs';
import {ensureMetricsCollector} from '../../scripts/metrics-runtime.ts';

const [mode,name,...args]=process.argv.slice(2),target=businessTarget(name);
if(process.env.CODESHIP_APP_SCRIPT_ENTRY!=='1'||!['setup','update','verify'].includes(mode))throw Error('Use the CodeShip application shell entry.');
if(mode!=='verify'&&(args.length!==2||args[0]!=='--release-set'))throw Error('Supply an explicit approved release set.');
const root=path.join(appRoot,'.codeship/apps',name),privateRoot=path.join(root,'private');
await mkdir(privateRoot,{recursive:true,mode:0o700});
const lockFile=path.join(appRoot,'.codeship/devkits/operation.lock'),lock=await open(lockFile,'wx',0o600);
const run=new Date().toISOString().replace(/[:.]/g,'-'),stateFile=path.join(root,'state.json'),envFile=path.join(privateRoot,'runtime.env');
const composeFile=path.join(appRoot,'.codeship/apps/platform/compose.json');
const prior=existsSync(stateFile)?JSON.parse(await readFile(stateFile,'utf8')):undefined;
const execute=(command:string,argv:string[],input?:string|Buffer,env=process.env)=>{const result=spawnSync(command,argv,{cwd:appRoot,input,env,windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:256*1024*1024});if(result.error||result.status!==0)throw Error('Private '+path.basename(command)+' operation failed.');return result.stdout?.toString().trim()??'';};
const docker=(argv:string[],input?:string|Buffer)=>execute('docker',argv,input);
async function stage(stage:string,status:string,details:Record<string,unknown>={}){await writeFile(path.join(root,'stages.jsonl'),JSON.stringify({at:new Date().toISOString(),run,mode,stage,status,...details})+'\n',{flag:'a',mode:0o600});console.log(name+' '+stage+': '+status);}
async function save(file:string,value:unknown){await writeFile(file+'.next',JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(file+'.next',file);}
const compose=(argv:string[])=>docker(['compose','-p','applications','-f',composeFile,...argv]);
const quote=(name:string)=>'"'+name.replaceAll('"','""')+'"';
const connectionEnv=(value:string)=>{const url=new URL(value);return {...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGDATABASE:url.pathname.slice(1),PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:url.searchParams.get('sslmode')??'disable'};};
const bin=process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin/':'';
const parsePrivate=(value:string)=>Object.fromEntries(Object.entries(parseEnv(value)).map(([key,value])=>{if(value===undefined)throw Error('Invalid private environment.');return [key,value];}));
async function verify(image:string){
 for(const route of ['/','/api/ready','/api/service-info']){const response=await fetch('http://127.0.0.1:'+target.port+route,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Application readiness failed.');await response.body?.cancel();}
 const guard=await fetch('http://127.0.0.1:'+target.port+'/api/v1/workspace',{signal:AbortSignal.timeout(10000)});await guard.body?.cancel();if(guard.status!==401)throw Error('Application must require a Platform grant.');
 const foreign=await fetch('http://127.0.0.1:'+target.port+'/platform-api/v1/identity/session',{headers:{origin:'https://example.invalid'},signal:AbortSignal.timeout(10000)});await foreign.body?.cancel();if(foreign.status!==403)throw Error('Application browser origin guard failed.');
 const facts=JSON.parse(docker(['inspect',name,'--format','{"image":{{json .Image}},"project":{{json (index .Config.Labels "com.docker.compose.project")}},"health":{{json .State.Health.Status}}}']));
 if(facts.project!=='applications'||facts.health!=='healthy'||facts.image!==docker(['image','inspect',image,'--format','{{.Id}}']))throw Error('Application image or health identity mismatch.');
 await ensureMetricsCollector();for(let attempt=0;attempt<40;attempt++){const report=await(await fetch('http://127.0.0.1:4450/api/v1/docker-metrics/apps')).json();if(!report.stale&&report.containers.some((row:any)=>row.project==='applications'&&row.service===name))return;await new Promise(resolve=>setTimeout(resolve,1000));}throw Error('Fresh application metrics unavailable.');
}
async function registry(env:Record<string,string>,version:string){
 const serialized=serializeDeploymentEnvironment(env);
 const row=applicationInput.parse({name,owner:'apps/'+name,project:'applications',environment:'local-docker',host:'127.0.0.1',port:target.port,version,username:'',notes:'CodeShip tagged Docker release; independent data; Platform admission required',users:installationUsers({env:serialized}).map(({hasPassword,...user})=>user),secrets:{env:serialized}});
 const payload=JSON.stringify([row]);execute(process.execPath,['scripts/register-devkits.ts'],payload);
 const state=JSON.parse(await readFile(path.join(appRoot,'.codeship/devkits/state.json'),'utf8'));
 docker(['run','--rm','-i','--network','none','-e','CODESHIP_SQLITE_FILE=/data/codeship.sqlite','-e','CODESHIP_VAULT_KEY_FILE=/keys/vault.key','--mount','type=volume,source=codeship_data,target=/data','--mount','type=volume,source=codeship_keys,target=/keys',state.services.codeship.image,'node','scripts/register-devkits.ts'],payload);
}
try{
 if(!existsSync(composeFile)||!existsSync(path.join(appRoot,'.codeship/apps/platform/state.json')))throw Error('Install and verify the approved Platform release first.');
 if(mode==='verify'){if(!prior)throw Error('Application is not installed.');await verify(prior.image);await stage('verification','passed');}
 else{
  if(mode==='setup'&&prior)throw Error('Application is installed; use update.');if(mode==='update'&&!prior)throw Error('Install the application first.');
  if(prior){const recovery=path.join(privateRoot,'recovery',run);await mkdir(recovery,{recursive:true,mode:0o700});for(const file of [composeFile,envFile,path.join(privateRoot,'compose.env'),stateFile])if(existsSync(file))await copyFile(file,path.join(recovery,path.basename(file)));await stage('previous-configuration','retained',{directory:recovery});}
  requireRawCompose(docker(['compose','version','--short']));
  if(!prior&&docker(['ps','-aq','--filter','name=^/'+name+'$']))throw Error('Application container name is occupied.');
  for(const dependency of target.dependencies)if(!existsSync(path.join(appRoot,'.codeship/apps',dependency,'state.json')))throw Error('Install the verified prerequisite '+dependency+' first.');
  const set=JSON.parse(await readFile(path.resolve(args[1]),'utf8')),manifest=set.services?.[name];
  if(set.schema!==1||set.source!=='github'||!manifest)throw Error('Approved application release missing.');
  validateManifest(manifest,{owner:'apps/'+name,repository:'CODEXSUN/'+name,tag:manifest.tag,commit:manifest.commit});
  const releaseImage=manifest.image;manifest.image=await resolveReleaseImage(manifest,docker,path.join(appRoot,'.codeship/releases/images'));
  const labels=JSON.parse(docker(['image','inspect',manifest.image,'--format','{{json .Config.Labels}}']));if(labels['org.opencontainers.image.revision']!==manifest.commit||labels['org.opencontainers.image.version']!==manifest.version)throw Error('Application release image identity mismatch.');await stage('release-image','passed',{tag:manifest.tag,image:releaseImage});
  const operator=openDatabase();let env:Record<string,string>={},adminConfig:any;
  try{
   const infra=await operator.db.selectFrom('infrastructure_services').selectAll().where('kind','=','postgres').where('environment','=','local-docker').executeTakeFirstOrThrow();
   const secrets=infra.encrypted_secrets?decryptSecrets(infra.public_id,infra.encrypted_secrets):{};
   adminConfig={host:'127.0.0.1',port:infra.port??5433,database:'postgres',user:infra.username,password:secrets.password,connectionTimeoutMillis:5000};
   const registration=await operator.db.selectFrom('applications').selectAll().where('owner','=','apps/'+name).where('environment','=','local-docker').executeTakeFirst();
   if(registration?.encrypted_secrets)env=currentEnvironment(decryptSecrets(registration.public_id,registration.encrypted_secrets));
  }finally{await operator.db.destroy();}
  if(!prior&&!Object.keys(env).length)env=parsePrivate(await readFile(path.join(workspaceRoot,'apps',name,'.env'),'utf8'));
  for(const key of Object.keys(env))if(/_TEST_|^NODE_|^LD_|^DYLD_|^DOCKER_|^COMPOSE_/.test(key))delete env[key];
  env.CODESHIP_CONTAINER_MODE='1';env.CODESHIP_APP_NAME=name;
  env[target.prefix+'_PLATFORM_AUTH']='1';env[target.prefix+'_PLATFORM_ORIGIN']='http://127.0.0.1:4385';
  env[target.prefix+'_BROWSER_ORIGINS']=name==='zetro'?'http://127.0.0.1:'+target.port:JSON.stringify(['http://127.0.0.1:'+target.port]);
  env[target.prefix+'_WEB_PORT']=String(target.port);env[target.prefix+'_WEB_ORIGIN']='http://127.0.0.1:'+target.port;
  env[target.prefix+'_PLATFORM_SERVICE_TOKEN']??=randomBytes(32).toString('hex');
  const markerFile=path.join(root,'database-import.json');
  if(target.database&&!existsSync(markerFile)){
   const database=target.database;
   const key=target.prefix+'_DATABASE_URL',source=new URL(env[key]??'');
   if(!['postgres:','postgresql:'].includes(source.protocol)||!['127.0.0.1','localhost'].includes(source.hostname)||!['5432','5433'].includes(source.port||'5432'))throw Error('Only the registered local PostgreSQL source can be copied.');
   const admin=new pg.Client(adminConfig);await admin.connect();
   try{
    if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[target.database])).rowCount||(await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[target.database])).rowCount)throw Error('Target database or role exists without a verified import record.');
    let sourceAdminURL:URL;
    if((source.port||'5432')===String(adminConfig.port)){sourceAdminURL=new URL(source);sourceAdminURL.username=adminConfig.user;sourceAdminURL.password=adminConfig.password;}
    else{const native=parsePrivate(await readFile(path.join(workspaceRoot,'apps/platform/.env'),'utf8'));sourceAdminURL=new URL(native.PLATFORM_MASTER_DATABASE_URL);if(sourceAdminURL.hostname!==source.hostname||(sourceAdminURL.port||'5432')!==(source.port||'5432'))throw Error('Source operator scope differs from the registered database server.');sourceAdminURL.pathname=source.pathname;}
    const password=randomBytes(32).toString('hex'),url=new URL('postgresql://postgres:5432/'+target.database);url.username=target.database;url.password=password;env[key]=url.href;if(name==='zetro')env.ZETRO_MIGRATION_DATABASE_URL=url.href;
    await writeFile(envFile,serializeDeploymentEnvironment(env),{mode:0o600});await registry(env,manifest.version);await stage('recovery-settings','passed',{encryptedRegistry:true});
    const dump=path.join(privateRoot,'initial-'+run+'.dump');await withSourceSnapshot(sourceAdminURL.href,async(snapshot,original)=>{
    execute(path.join(bin,'pg_dump'),['--snapshot='+snapshot,'--format=custom','--no-owner','--no-privileges','--file',dump],undefined,connectionEnv(sourceAdminURL.href));execute(path.join(bin,'pg_restore'),['--list',dump]);
    await admin.query('CREATE ROLE '+quote(database)+" LOGIN PASSWORD '"+password+"' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE");
    await admin.query('CREATE DATABASE '+quote(database)+' OWNER '+quote(database));await admin.query('REVOKE ALL ON DATABASE '+quote(database)+' FROM PUBLIC');
    const copyURL=new URL(url);copyURL.hostname=adminConfig.host;copyURL.port=String(adminConfig.port);copyURL.username=adminConfig.user;copyURL.password=adminConfig.password;
    execute(path.join(bin,'pg_restore'),['--single-transaction','--exit-on-error','--no-owner','--no-privileges','--role='+target.database,'--dbname='+target.database,dump],undefined,connectionEnv(copyURL.href));
    const copy=new pg.Client({connectionString:copyURL.href});await copy.connect();
    try{for(const {tablename}of(await original.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows){const table='public.'+quote(tablename);const a=await original.query('SELECT count(*)::text AS n FROM '+table),b=await copy.query('SELECT count(*)::text AS n FROM '+table);if(a.rows[0].n!==b.rows[0].n)throw Error('Source changed during copy; retain the target for inspection.');}
     for(const {table_name}of(await original.query("SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='public_id' ORDER BY table_name")).rows){const query='SELECT public_id FROM public.'+quote(table_name)+' ORDER BY public_id';if(JSON.stringify((await original.query(query)).rows)!==JSON.stringify((await copy.query(query)).rows))throw Error('Copied public identities differ.');}
    }finally{await copy.end();}
    });
    await save(markerFile,{status:'imported',database:target.database,role:target.database,dump,sha256:createHash('sha256').update(await readFile(dump)).digest('hex')});await stage('database-copy','passed');
   }finally{await admin.end();}
  }
  const runtime=path.join(privateRoot,'runtime-'+run);await mkdir(runtime,{recursive:true,mode:0o700});for(const file of ['business-targets.mjs','business-database.mjs','start-business.mjs'])await copyFile(path.join(appRoot,'.container/apps',file),path.join(runtime,file));
  await writeFile(envFile,serializeDeploymentEnvironment(env),{mode:0o600});
  const dbTool=(command:string)=>docker(['run','--rm','--network','codebiz-infra_default','--mount','type=bind,source='+envFile+',target=/run/app.env,readonly','--mount','type=bind,source='+runtime+',target=/run/codeship,readonly','--entrypoint','node',manifest.image,'--env-file=/run/app.env','/run/codeship/business-database.mjs',command]);
  const plan=JSON.parse(dbTool('plan')),current:Record<string,string>={};for(const [file,hash]of Object.entries(manifest.migrations)){const key=path.basename(file,'.ts');if(current[key])throw Error('Ambiguous migration name.');current[key]=hash as string;}
  const decision=migrationDecision(plan,prior?.migrations,current);
  if(decision.migrateRequired){
   if(prior)compose(['stop',name]);
   if(target.database){const dump=path.join(privateRoot,'before-migration-'+run+'.dump'),url=new URL('postgresql://127.0.0.1:'+adminConfig.port+'/'+target.database);url.username=adminConfig.user;url.password=adminConfig.password;execute(path.join(bin,'pg_dump'),['--format=custom','--no-owner','--no-privileges','--file',dump],undefined,connectionEnv(url.href));execute(path.join(bin,'pg_restore'),['--list',dump]);await stage('migration-backup','passed',{file:dump,sha256:createHash('sha256').update(await readFile(dump)).digest('hex')});}
   dbTool('migrate');await stage('migration','passed');
  }else await stage('migration','skipped',{reason:'No pending migrations; image/configuration update only'});
  const temporary=docker(['create',manifest.image]);const serviceFile=path.join(privateRoot,'service-manifest.json');try{docker(['cp',temporary+':/opt/codebiz/apps/'+name+'/contracts/platform-service.json',serviceFile]);}finally{docker(['rm',temporary]);}
  const service=JSON.parse(await readFile(serviceFile,'utf8'));
  const profile=businessServiceProfile(target,service,{token:env[target.prefix+'_PLATFORM_SERVICE_TOKEN'],version:manifest.version,image:releaseImage});
  const registered=JSON.parse(docker(['exec','-i','platform','node','scripts/container-release.ts','prepare'],JSON.stringify(profile)));
  env[target.prefix+'_PLATFORM_SERVICE_ID']=registered.serviceId;env[target.prefix+'_PLATFORM_TENANT_ID']=registered.tenantId;
  await writeFile(envFile,serializeDeploymentEnvironment(env),{mode:0o600});await registry(env,manifest.version);
  const composeEnv=path.join(privateRoot,'compose.env');await writeFile(composeEnv,rawEnvironment(env),{mode:0o600});
  const definition=JSON.parse(await readFile(composeFile,'utf8'));
  const dataVolumes:any[]=[];
  if(name==='ecommerce'){
   const volume='ecommerce_data',marker=path.join(root,'files-import.json');
   if(!existsSync(marker)){
    if(docker(['volume','ls','--filter','name=^'+volume+'$','--format','{{.Name}}']))throw Error('Ecommerce volume exists without its import record.');
    docker(['volume','create',volume]);const source=path.join(workspaceRoot,'apps/ecommerce/data/uploads/products');
    const mounts=['--mount','type=volume,source='+volume+',target=/data',...(existsSync(source)?['--mount','type=bind,source='+source+',target=/source,readonly']:[])];
    const copy="const fs=require('node:fs'),crypto=require('node:crypto');fs.mkdirSync('/data/uploads/products',{recursive:true});if(fs.existsSync('/source'))for(const file of fs.readdirSync('/source',{withFileTypes:true})){if(!file.isFile()||!/^[a-f0-9]{64}\\.webp$/.test(file.name))throw Error('Unexpected uploaded file');const data=fs.readFileSync('/source/'+file.name);if(crypto.createHash('sha256').update(data).digest('hex')+'.webp'!==file.name)throw Error('Upload digest mismatch');fs.writeFileSync('/data/uploads/products/'+file.name,data,{flag:'wx'});fs.chownSync('/data/uploads/products/'+file.name,1000,1000);}for(const directory of ['/data','/data/uploads','/data/uploads/products'])fs.chownSync(directory,1000,1000);";
    docker(['run','--rm','--user','0','--network','none',...mounts,'--entrypoint','node',manifest.image,'-e',copy]);await save(marker,{status:'imported',volume,at:new Date().toISOString()});await stage('file-copy','passed');
   }
   definition.volumes??={};definition.volumes[volume]={external:true,name:volume};dataVolumes.push({type:'volume',source:volume,target:'/opt/codebiz/apps/ecommerce/data'});
  }
  definition.services[name]={image:manifest.image,container_name:name,init:true,restart:'unless-stopped',network_mode:'service:platform',depends_on:{platform:{condition:'service_healthy',restart:true}},security_opt:['no-new-privileges:true'],cap_drop:['ALL'],env_file:[{path:composeEnv,format:'raw'}],environment:{NODE_ENV:'production'},command:['node','/run/codeship/start-business.mjs'],volumes:[{type:'bind',source:runtime,target:'/run/codeship',read_only:true},...dataVolumes],healthcheck:{test:['CMD','node','-e',"fetch('http://127.0.0.1:"+target.apiPort+"/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],interval:'5s',timeout:'4s',start_period:'20s',retries:30},stop_grace_period:'45s'};
  await save(composeFile,definition);compose(['config','--quiet']);await stage('replacement','started');compose(['up','-d','--no-build','--wait','--wait-timeout','180',name]);
  await verify(manifest.image);docker(['exec','-i','platform','node','scripts/container-release.ts','complete'],JSON.stringify(profile));await stage('platform-admission','passed');
  await save(stateFile,{...manifest,releaseImage,migrations:current,previousImage:prior?.image,updatedAt:new Date().toISOString(),compose:composeFile});await stage('release','succeeded');
 }
}catch(error){await stage('release','failed',{message:(error as Error).message});console.error('Application operation failed; prior images, independent data and recovery files are retained.');process.exitCode=1;}
finally{await lock.close();await unlink(lockFile);}
