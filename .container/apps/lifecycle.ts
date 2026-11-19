import {startupBudget,startupHealth} from './startup-budget.mjs';
import {securePlatformRuntime} from './platform-runtime.mjs';
import {platformTarget,installedCodeshipOrigin,platformPasswordChangeRequired} from './platform-target.mjs';
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,open,unlink,rename,copyFile} from 'node:fs/promises';
import {existsSync,realpathSync} from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import {parseEnv} from 'node:util';
import {createServer} from 'node:net';
import path from 'node:path';
import pg from 'pg';
import {appRoot,workspaceRoot,openDatabase} from '../../src/api/database.ts';
import {decryptSecrets} from '../../src/api/modules/master/application/vault.ts';
import {serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
import {currentEnvironment} from '../../src/api/modules/master/application/environment.ts';
import {validateManifest} from '../release-policy.mjs';
import {resolveReleaseImage} from '../release-image.mjs';
import {rawEnvironment,requireRawCompose} from '../raw-environment.mjs';
import {platformRegistration} from './platform-registration.ts';
import {platformDatabaseScopes,platformDatabaseRole} from './platform-databases.mjs';
import {businessTargets} from './business-targets.mjs';
import {withSourceSnapshot} from './postgres-snapshot.ts';
import {ensureApplicationNetwork,applyIndependentNetwork,verifyIndependentContainer} from './network-topology.mjs';
import {migrationDecision} from '../policy.mjs';
import {ensureMetricsCollector} from '../../scripts/metrics-runtime.ts';
const [mode,name,...args]=process.argv.slice(2);
if(name!=='platform'){await import('./business-lifecycle.ts');process.exit(process.exitCode??0);}
if(process.env.CODESHIP_APP_SCRIPT_ENTRY!=='1'||name!=='platform'||!['setup','update','verify'].includes(mode))throw new Error('Use the CodeShip apps setup/update/verify shell entry.');
if(mode!=='verify'&&(args.length!==2||args[0]!=='--release-set'))throw new Error('Supply an approved --release-set file.');
const operationRoot=realpathSync(path.join(appRoot,'.codeship'));
const root=path.join(operationRoot,'apps/platform'),privateRoot=path.join(root,'private');await mkdir(privateRoot,{recursive:true,mode:0o700});
const lockFile=path.join(operationRoot,'devkits/operation.lock'),lock=await open(lockFile,'wx',0o600);
const run=new Date().toISOString().replace(/[:.]/g,'-'),stateFile=path.join(root,'state.json'),composeFile=path.join(root,'compose.json'),envFile=path.join(privateRoot,'runtime.env');
const prior=existsSync(stateFile)?JSON.parse(await readFile(stateFile,'utf8')):undefined;
async function stage(stage:string,status:string,detail:Record<string,unknown>={}){await writeFile(path.join(root,'stages.jsonl'),JSON.stringify({at:new Date().toISOString(),run,mode,stage,status,...detail})+'\n',{flag:'a',mode:0o600});console.log(stage+': '+status);}
function execute(command:string,args:string[],input?:string|Buffer,env?:NodeJS.ProcessEnv){const result=spawnSync(command,args,{cwd:appRoot,input,env:env??process.env,windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:128*1024*1024});if(result.error||result.status!==0)throw new Error('Private '+path.basename(command)+' operation failed.');return result.stdout?.toString().trim()??'';}
const docker=(args:string[],input?:string|Buffer)=>execute('docker',args,input);
async function save(file:string,value:unknown){await writeFile(file+'.next',JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(file+'.next',file);}
async function verify(image?:string){
 for(const url of ['/api/live','/api/ready','/','/api/v1/platform/config']){const response=await fetch('http://127.0.0.1:'+platformTarget.port+url,{signal:AbortSignal.timeout(10000)});if(response.status!==200)throw new Error('Platform readiness failed.');await response.body?.cancel();}
 const foreign=await fetch('http://127.0.0.1:'+platformTarget.port+'/api/ready',{headers:{origin:'https://example.invalid'}});if(foreign.status!==403)throw new Error('Platform Docker origin guard failed.');
 const facts=JSON.parse(docker(['inspect','--format','{"project":{{json (index .Config.Labels "com.docker.compose.project")}},"health":{{json .State.Health.Status}},"image":{{json .Image}},"ports":{{json .HostConfig.PortBindings}},"networkMode":{{json .HostConfig.NetworkMode}},"networks":{{json .NetworkSettings.Networks}}}',name]));
 verifyIndependentContainer(name,facts);
 if(facts.project!=='applications'||facts.health!=='healthy'||!Object.values(facts.ports).every((bindings:any)=>bindings.every((binding:any)=>binding.HostIp==='127.0.0.1'))||(image&&facts.image!==docker(['image','inspect',image,'--format','{{.Id}}'])))throw new Error('Platform release identity or binding mismatch.');
 await ensureMetricsCollector();
 for(let attempt=0;attempt<40;attempt++){const report=await(await fetch(installedCodeshipOrigin(appRoot)+'/api/v1/docker-metrics/apps')).json();if(!report.stale&&report.containers.some((row:any)=>row.project==='applications'&&row.service==='platform'&&row.owner==='apps/platform'))return;await new Promise(resolve=>setTimeout(resolve,1000));}throw new Error('Fresh Platform metrics unavailable.');
}
try {
 if(mode==='verify'){await verify(prior?.image);await stage('verification','passed');}
 else {
  if(mode==='setup'&&prior)throw new Error('Platform is installed; use update.sh.');if(mode==='update'&&!prior)throw new Error('Install Platform first.');
  if(prior){const recovery=path.join(privateRoot,'recovery',run);await mkdir(recovery,{recursive:true,mode:0o700});for(const file of [composeFile,envFile,path.join(privateRoot,'compose.env'),stateFile])if(existsSync(file))await copyFile(file,path.join(recovery,path.basename(file)));await stage('previous-configuration','retained',{directory:recovery});}
  requireRawCompose(docker(['compose','version','--short']));
  if(!prior)for(const target of Object.values(businessTargets))await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(target.port,'127.0.0.1',()=>probe.close(()=>resolve()));});
  if(!prior&&docker(['ps','-aq','--filter','name=^/platform$']))throw new Error('Platform name is occupied.');
  const bindings=prior?JSON.parse(docker(['inspect','platform','--format','{{json .HostConfig.PortBindings}}'])):{};
  const alreadyOwned=bindings[platformTarget.apiPort+'/tcp']?.some((row:any)=>row.HostIp==='127.0.0.1'&&row.HostPort===String(platformTarget.port));
  if(!alreadyOwned)await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen({port:platformTarget.port,host:'127.0.0.1',exclusive:true},()=>probe.close(()=>resolve()));});
  const set=JSON.parse(await readFile(path.resolve(args[1]),'utf8')),manifest=set.services?.platform;
  if(set.schema!==1||set.source!=='github'||!manifest)throw new Error('Approved Platform release missing.');
  validateManifest(manifest,{owner:'apps/platform',repository:'CODEXSUN/platform',tag:manifest.tag,commit:manifest.commit});
  const releaseImage=manifest.image;manifest.image=await resolveReleaseImage(manifest,docker,path.join(appRoot,'.codeship/releases/images'));const labels=JSON.parse(docker(['image','inspect',manifest.image,'--format','{{json .Config.Labels}}']));if(labels['org.opencontainers.image.revision']!==manifest.commit||labels['org.opencontainers.image.version']!==manifest.version)throw new Error('Platform image identity mismatch.');await stage('release-image','passed',{tag:manifest.tag,image:releaseImage});
  const operator=openDatabase();let env:Record<string,string>={},adminConfig:any;
  try {
   const record=await operator.db.selectFrom('infrastructure_services').selectAll().where('kind','=','postgres').where('environment','=','local-docker').executeTakeFirstOrThrow();
   const secrets=record.encrypted_secrets?decryptSecrets(record.public_id,record.encrypted_secrets):{};
   adminConfig={host:'127.0.0.1',port:record.port??5433,database:'postgres',user:record.username,password:secrets.password,connectionTimeoutMillis:5000};
   const registration=await operator.db.selectFrom('applications').selectAll().where('owner','=','apps/platform').where('environment','=','local-docker').executeTakeFirst();
   if(registration?.encrypted_secrets)env=currentEnvironment(decryptSecrets(registration.public_id,registration.encrypted_secrets));
  }finally{await operator.db.destroy();}
  const markerFile=path.join(root,'database-import.json');
  const bin=process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin/':'';
  const connectionEnv=(value:string)=>{const url=new URL(value);return {...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGDATABASE:url.pathname.slice(1),PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:url.searchParams.get('sslmode')??'disable'};};
  const admin=new pg.Client(adminConfig);await admin.connect();
  try{
   if(!existsSync(markerFile)){
    const source=parseEnv(await readFile(path.join(workspaceRoot,'apps/platform/.env'),'utf8'));
    platformRegistration(source,manifest.version); // Validate registry fields before any target provisioning.
    const masterURL=source.PLATFORM_MASTER_DATABASE_URL;if(!masterURL)throw new Error('Native Platform database configuration missing.');
    const native=new pg.Client({connectionString:masterURL,connectionTimeoutMillis:5000});await native.connect();
    let registrations:any[];try{registrations=(await native.query('SELECT DISTINCT database_name,connection_secret_ref FROM public.tenant_databases WHERE active')).rows;}finally{await native.end();}
    const scopes=platformDatabaseScopes(source,registrations);
    if(new Set(scopes.map(scope=>scope.name)).size!==scopes.length||scopes.some(scope=>!/^[_a-z][_a-z0-9]{0,62}$/.test(scope.name)))throw new Error('Ambiguous database copy scope.');
    for(const scope of scopes)if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[scope.name])).rowCount)throw new Error('Platform target database exists without an import record; inspect before adoption.');
    const password=randomBytes(32).toString('base64url');
    if((await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[platformDatabaseRole])).rowCount)throw new Error('Platform service role exists without an import record.');
    env={...source};for(const key of Object.keys(env))if(key.startsWith('PLATFORM_DEV_'))env[key]='0';
    env.NODE_ENV='production';env.PLATFORM_BIND_MODE='docker-direct';env.PLATFORM_GATEWAY_ENABLED='0';
    for(const scope of scopes){const target=new URL(scope.source);target.hostname='postgres';target.port='5432';target.pathname='/'+scope.name;target.username=platformDatabaseRole;target.password=password;target.search='?sslmode=disable';env[scope.key]=target.href;}
    // Retain encrypted recovery settings before any role/database effects.
    await writeFile(envFile,serializeDeploymentEnvironment(env),{mode:0o600});
    const prepared=platformRegistration(env,manifest.version);prepared.notes='CodeShip prepared Platform install; database copy and runtime verification pending.';
    execute(process.execPath,['scripts/register-devkits.ts'],JSON.stringify([prepared]));await stage('install-settings','passed',{encryptedRegistry:true});
    await admin.query(`CREATE ROLE ${platformDatabaseRole} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
    const backups=[];
    for(const scope of scopes){
     await stage('copy-'+scope.name,'started');const dump=path.join(privateRoot,scope.name+'-initial-'+run+'.dump');
     await withSourceSnapshot(scope.source,async(snapshot,original)=>{
     execute(path.join(bin,'pg_dump'),['--snapshot='+snapshot,'--format=custom','--no-owner','--no-privileges','--file',dump],undefined,connectionEnv(scope.source));
     execute(path.join(bin,'pg_restore'),['--list',dump]);
     await admin.query('CREATE DATABASE "'+scope.name+'" OWNER '+platformDatabaseRole);await admin.query('REVOKE ALL ON DATABASE "'+scope.name+'" FROM PUBLIC');
     const target=new URL(env[scope.key]);target.hostname='127.0.0.1';target.port=String(adminConfig.port);
     execute(path.join(bin,'pg_restore'),['--single-transaction','--exit-on-error','--no-owner','--no-privileges','--dbname='+scope.name,dump],undefined,connectionEnv(target.href));
     // Compare every base-table count and stable identity digest without logging data.
     const copy=new pg.Client({connectionString:target.href});await copy.connect();
     try{const tables=(await original.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;for(const {tablename} of tables){const quoted='"'+tablename.replaceAll('"','""')+'"';const a=await original.query('SELECT count(*)::text AS n FROM public.'+quoted),b=await copy.query('SELECT count(*)::text AS n FROM public.'+quoted);if(a.rows[0].n!==b.rows[0].n)throw new Error('Native data changed during copy; inspect the retained copy before proceeding.');}const identities=(await original.query("SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='public_id' ORDER BY table_name")).rows;for(const {table_name}of identities){const quoted='"'+table_name.replaceAll('"','""')+'"',query='SELECT public_id FROM public.'+quoted+' ORDER BY public_id';if(JSON.stringify((await original.query(query)).rows)!==JSON.stringify((await copy.query(query)).rows))throw new Error('Copied identity verification failed.');}}finally{await copy.end();}
     target.hostname='postgres';target.port='5432';env[scope.key]=target.href;backups.push({database:scope.name,key:scope.key,dump,sha256:createHash('sha256').update(await readFile(dump)).digest('hex')});await stage('copy-'+scope.name,'passed');
     });
    }
    // Only the copied master registry points at isolated tenant names. Native rows stay unchanged.
    const copiedURL=new URL(env.PLATFORM_MASTER_DATABASE_URL);copiedURL.hostname='127.0.0.1';copiedURL.port=String(adminConfig.port);
    const copiedMaster=new pg.Client({connectionString:copiedURL.href});await copiedMaster.connect();
    try{await copiedMaster.query('BEGIN');for(const scope of scopes.filter(scope=>scope.key!=='PLATFORM_MASTER_DATABASE_URL')){const changed=await copiedMaster.query("UPDATE public.tenant_databases SET database_name=$1,deployment_key='platform-docker',updated_by='system:codeship-copy' WHERE database_name=$2 AND connection_secret_ref=$3",[scope.name,scope.sourceName,'env:'+scope.key]);if(changed.rowCount!==1)throw new Error('Copied tenant routing was not unique.');}await copiedMaster.query('COMMIT');}catch(error){await copiedMaster.query('ROLLBACK');throw error;}finally{await copiedMaster.end();}
    await writeFile(envFile,serializeDeploymentEnvironment(env),{mode:0o600});
    await save(markerFile,{status:'imported',role:platformDatabaseRole,scopes:backups});
   }else if(!Object.keys(env).length){env=parseEnv(await readFile(envFile,'utf8'));}
  }finally{await admin.end();}
  env.PLATFORM_REQUIRE_PASSWORD_CHANGE=platformPasswordChangeRequired(manifest.version);env.PLATFORM_GATEWAY_ENABLED='1';
  if(!env.PLATFORM_MASTER_DATABASE_URL)throw new Error('Saved Platform settings missing.');
  env=securePlatformRuntime(env,platformTarget.port,manifest.version);
  await writeFile(envFile,serializeDeploymentEnvironment(env),{mode:0o600});
  // Load env through Node's parser: Docker --env-file does not unquote dotenv values.
  const dbTool=(command:string)=>docker(['run','--rm','--network','codebiz-infra_default','--mount','type=bind,source='+envFile+',target=/run/platform.env,readonly','--entrypoint','node',manifest.image,'--env-file=/run/platform.env','scripts/release-database.ts',command]);
  const plans=JSON.parse(dbTool('plan')),current:Record<string,string>={};
  for(const [file,hash]of Object.entries(manifest.migrations)){const key=(file.includes('/tenant-migrations/')?'tenant:':'master:')+path.basename(file,'.ts');current[key]=hash as string;}
  let pending=false;
  for(const plan of plans){const prefix=plan.scope==='master'?'master:':'tenant:';const decision=migrationDecision({applied:plan.applied.map((name:string)=>prefix+name),pending:plan.pending.map((name:string)=>prefix+name)},prior?.migrations,current);pending ||=decision.migrateRequired;}
  if(pending){
   if(prior)docker(['stop','platform']);
   const marker=JSON.parse(await readFile(markerFile,'utf8'));for(const scope of marker.scopes){const target=new URL(env[scope.key]);target.hostname='127.0.0.1';target.port=String(adminConfig.port);const dump=path.join(privateRoot,scope.database+'-before-'+run+'.dump');execute(path.join(bin,'pg_dump'),['--format=custom','--no-owner','--no-privileges','--file',dump],undefined,connectionEnv(target.href));execute(path.join(bin,'pg_restore'),['--list',dump]);await stage('backup-'+scope.database,'passed',{dump,sha256:createHash('sha256').update(await readFile(dump)).digest('hex')});}
   dbTool('migrate');await stage('migration','passed');
  }else await stage('migration','skipped',{reason:'No pending master or tenant migrations; image-only update'});
  if(env.PLATFORM_ENTRY_BINDINGS){const supported=docker(['run','--rm','--network','none','--entrypoint','node',manifest.image,'-e',"console.log(require('node:fs').existsSync('scripts/configure-local-entry.ts')?'supported':'legacy')"]);if(supported==='supported'){docker(['run','--rm','--network','codebiz-infra_default','--mount','type=bind,source='+envFile+',target=/run/platform.env,readonly','--entrypoint','node',manifest.image,'--env-file=/run/platform.env','scripts/configure-local-entry.ts']);await stage('local-entry-hosts','passed');}else await stage('local-entry-hosts','skipped',{reason:'Released image has no optional entry adapter; retain settings without claiming host configuration'});}
  const topology=ensureApplicationNetwork(docker),peers=topology.peers;
  await stage('private-network','passed',{network:topology.name,subnet:topology.subnet});
  const composeEnvFile=path.join(privateRoot,'compose.env');await writeFile(composeEnvFile,rawEnvironment(env),{mode:0o600});
  const definition={name:'applications',services:{platform:{image:manifest.image,container_name:'platform',init:true,restart:'unless-stopped',security_opt:['no-new-privileges:true'],cap_drop:['ALL'],ports:['127.0.0.1:'+platformTarget.port+':'+platformTarget.apiPort],env_file:[{path:composeEnvFile,format:'raw'}],environment:{NODE_ENV:'production',PLATFORM_HOST:'0.0.0.0',PLATFORM_PORT:'4385',PLATFORM_WEB_PORT:String(platformTarget.port),PLATFORM_WEB_ORIGIN:'http://127.0.0.1:'+platformTarget.port,PLATFORM_BIND_MODE:'docker-direct',PLATFORM_DOCKER_PEERS:peers,PLATFORM_DEV_AUTO_LOGIN:'0',PLATFORM_DEV_MASTER_FRESH:'0',PLATFORM_DEV_TENANT_FRESH:'0',PLATFORM_DEV_MASTER_SEED:'0',PLATFORM_DEV_TENANT_SEED:'0',PLATFORM_REQUIRE_PASSWORD_CHANGE:env.PLATFORM_REQUIRE_PASSWORD_CHANGE,PLATFORM_GATEWAY_ENABLED:'0'},networks:['infra'],healthcheck:{test:['CMD','node','-e',"fetch('http://127.0.0.1:4385/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],...startupHealth},stop_grace_period:'45s'}},networks:{infra:{external:true,name:'codebiz-infra_default'}}};
  const runtime=path.join(privateRoot,'runtime-'+run);await mkdir(runtime,{recursive:true,mode:0o700});for(const file of ['business-targets.mjs','runtime-network.mjs','startup-budget.mjs','start-platform.mjs'])await copyFile(path.join(appRoot,'.container/apps',file),path.join(runtime,file));
  Object.assign(definition.services.platform,{command:['node','/run/codeship/start-platform.mjs'],volumes:[{type:'bind',source:runtime,target:'/run/codeship',read_only:true}]});
  Object.assign(definition.services.platform.environment,{CODESHIP_CONTAINER_MODE:'1'});
  applyIndependentNetwork(definition.services.platform,'platform',topology);
  Object.assign(definition,{networks:{backend:{external:true,name:topology.name}}});
  Object.assign(definition.services.platform.environment,{PLATFORM_GATEWAY_ENABLED:'1',PLATFORM_GATEWAY_ALLOWED_ORIGINS:JSON.stringify(Object.values(businessTargets).map(target=>'http://127.0.0.1:'+target.apiPort)),PLATFORM_GATEWAY_IMAGE_UPLOADS:JSON.stringify([{appKey:'ecommerce',path:'/api/v1/desk/product-images'}])});
  if(existsSync(composeFile)){const existing=JSON.parse(await readFile(composeFile,'utf8'));for(const [sibling,service] of Object.entries(existing.services??{}))if(sibling!=='platform'){if((service as any).network_mode)throw Error('Migrate existing shared-network application containers explicitly before replacing Platform.');(definition.services as Record<string,unknown>)[sibling]=service;}Object.assign(definition,{networks:{...(existing.networks??{}),...definition.networks}});if(existing.volumes)Object.assign(definition,{volumes:existing.volumes});}
  await save(composeFile,definition);docker(['compose','-p','applications','-f',composeFile,'config','--quiet']);
  const payload=JSON.stringify([platformRegistration(env,manifest.version)]);
  execute(process.execPath,['scripts/register-devkits.ts'],payload);
  const state=JSON.parse(await readFile(path.join(appRoot,'.codeship/devkits/state.json'),'utf8'));
  docker(['run','--rm','-i','--network','none','-e','CODESHIP_SQLITE_FILE=/data/codeship.sqlite','-e','CODESHIP_VAULT_KEY_FILE=/keys/vault.key','--mount','type=volume,source=codeship_data,target=/data','--mount','type=volume,source=codeship_keys,target=/keys',state.services.codeship.image,'node','scripts/register-devkits.ts'],payload);
  const siblingIdentity=()=>docker(['ps','-a','--filter','label=com.docker.compose.project=applications','--format','{{.Names}} {{.ID}}']).split('\n').filter(row=>row&&!row.startsWith('platform ')).sort().join('\n');
  const siblings=siblingIdentity();
  await stage('replacement','started');docker(['compose','-p','applications','-f',composeFile,'up','-d','--no-build','--wait','--wait-timeout',String(startupBudget.operationSeconds),'--no-deps','platform']);
  if(siblingIdentity()!==siblings)throw Error('An unselected application container identity changed.');
  await stage('sibling-identities','passed');
  await verify(manifest.image);await stage('verification','passed');await save(stateFile,{...manifest,releaseImage,migrations:current,previousImage:prior?.image,updatedAt:new Date().toISOString(),compose:composeFile,network:{name:topology.name,address:topology.addresses.platform,subnet:topology.subnet}});await stage('release','succeeded');
 }
}catch(error){await stage('release','failed',{message:(error as Error).message});console.error('Platform operation failed; existing data, images and recovery files are retained.');process.exitCode=1;}
finally{await lock.close();await unlink(lockFile);}
