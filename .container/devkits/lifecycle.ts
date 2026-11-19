import {admitPlatformDevkit} from './platform-admission.mjs';
import {platformDevkitNetwork} from './platform-network.mjs';
import {createServer} from 'node:net';
import {hostname} from 'node:os';
import {freshUbuntuSetup} from '../ubuntu/target-policy.mjs';
import {hostingerTargetPolicy} from '../hostinger/target-policy.mjs';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,open,unlink,rename,chmod} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import pg from 'pg';
import {codeshipHostPort,codeshipOrigin} from '../local-port.mjs';
import {preserveUnselected,requireSelectedRegistry} from './selection.mjs';
import {appRoot,workspaceRoot,openDatabase} from '../../src/api/database.ts';
import {decryptSecrets} from '../../src/api/modules/master/application/vault.ts';
import {currentEnvironment} from '../../src/api/modules/master/application/environment.ts';
import {installationUsers,serializeDeploymentEnvironment,isProtectedEnvironmentKey} from '../../src/api/modules/master/application/accounts.ts';
import {ensureMetricsCollector} from '../../scripts/metrics-runtime.ts';
import {migrationDecision} from '../policy.mjs';
import {validateManifest,legacyMigrationMap,compatibleMigrationHistory} from '../release-policy.mjs';
import {resolveReleaseImage} from '../release-image.mjs';
import {rawEnvironment,requireRawCompose} from '../raw-environment.mjs';

if(process.env.CODESHIP_DEVKIT_SCRIPT_ENTRY!=='1')throw new Error('Run the reviewed setup.sh, update.sh or verify.sh entry point.');
const [mode,target='all',...extra]=process.argv.slice(2);
const releaseSetFile=extra.length===2&&extra[0]==='--release-set'?path.resolve(extra[1]):undefined;
if(!['setup','update','verify'].includes(mode)||!['all','codeship','codeitz','uiux'].includes(target)||(extra.length&&!releaseSetFile))throw new Error('Use setup.sh|update.sh|verify.sh with an approved --release-set.');
if(mode!=='verify'&&!releaseSetFile)throw new Error('Installation and updates require an approved GitHub release set. Local builds are test-only.');
const names=['codeship','codeitz','uiux'] as const,typeNames=names as readonly string[];
const selected=target==='all'?[...names]:[target as typeof names[number]];
const runtime=path.join(appRoot,'.codeship/devkits'),privateRoot=path.join(runtime,'private'),stateFile=path.join(runtime,'state.json'),composeFile=path.join(runtime,'compose.json');
await mkdir(privateRoot,{recursive:true,mode:0o700});
const lockFile=path.join(runtime,'operation.lock'),lock=await open(lockFile,'wx',0o600);
const run=new Date().toISOString().replace(/[:.]/g,'-'),log=path.join(runtime,'stages.jsonl');
async function stage(name:string,status:string,detail:Record<string,unknown>={}){await writeFile(log,JSON.stringify({at:new Date().toISOString(),run,mode,target,stage:name,status,...detail})+'\n',{flag:'a',mode:0o600});console.log(name+': '+status);}
function execute(command:string,args:string[],options:{input?:string|Buffer;env?:NodeJS.ProcessEnv;quiet?:boolean}={}){
 const result=spawnSync(command,args,{cwd:appRoot,windowsHide:true,env:options.env??process.env,input:options.input,stdio:options.quiet||options.input!==undefined?['pipe','pipe','pipe']:'inherit',maxBuffer:32*1024*1024});
 if(result.error||result.status!==0){if(result.stderr)try{requireWriteError(result.stderr);}catch{}throw new Error('Operation failed: '+path.basename(command)+' '+(args[0]??''));}
 return result.stdout?.toString().trim()??'';
}
function requireWriteError(_data:unknown){/* Child output can contain database data; never forward it into operation logs. */}
const docker=(args:string[],input?:string|Buffer)=>execute('docker',args,{quiet:true,input});
const compose=(args:string[])=>execute('docker',['compose','--project-name','devkits','-f',composeFile,...args]);
const jsonFile=async(file:string)=>JSON.parse(await readFile(file,'utf8'));
async function save(file:string,value:unknown){await writeFile(file+'.next',JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(file+'.next',file);}
let prior:any=existsSync(stateFile)?await jsonFile(stateFile):undefined;
const targetFile=path.join(appRoot,'.codeship/target.json');
const ubuntuTarget=existsSync(targetFile)?await jsonFile(targetFile):undefined;
const targetArguments={target:ubuntuTarget,platform:process.platform,hostname:hostname(),appRoot,mode,prior,selected};
const hostinger=ubuntuTarget?.id==='hostinger-914719';
const freshUbuntu=hostinger?hostingerTargetPolicy(targetArguments):freshUbuntuSetup(targetArguments);
const infraNetworkName=hostinger?'cxapp-network':'codebiz-infra_default';
const ports={codeship:codeshipHostPort,codeitz:14305,uiux:14315},internal={codeship:4350,codeitz:4305,uiux:4315};
const images:Record<string,any>={...(prior?.services??{})};
const histories:Record<string,any>={};
let buildContext=workspaceRoot;
const {db}=openDatabase();
let dbClosed=false;
async function verify(){
 await ensureMetricsCollector();
 for(const name of selected){for(const suffix of ['/api/live','/api/ready','/']){const response=await fetch('http://127.0.0.1:'+ports[name]+suffix,{signal:AbortSignal.timeout(10000)});if(response.status!==200)throw new Error(name+' readiness failed.');await response.body?.cancel();}
  const forbidden=await fetch('http://127.0.0.1:'+ports[name]+'/api/ready',{headers:{Origin:'https://example.invalid'},signal:AbortSignal.timeout(5000)});if(forbidden.status!==403)throw new Error(name+' origin guard failed.');
  const facts=JSON.parse(docker(['inspect','--format','{"name":{{json .Name}},"image":{{json .Image}},"project":{{json (index .Config.Labels "com.docker.compose.project")}},"service":{{json (index .Config.Labels "com.docker.compose.service")}},"health":{{json .State.Health.Status}},"mounts":{{json .Mounts}},"ports":{{json .HostConfig.PortBindings}}}',name]));
  if(facts.name!=='/'+name||facts.project!=='devkits'||facts.service!==name||facts.health!=='healthy')throw new Error('Devkit group identity verification failed.');
  if(images[name]?.imageId&&facts.image!==images[name].imageId)throw new Error('Running '+name+' image differs from the approved release.');
  if(name==='codeship'&&!['codeship_data','codeship_keys'].every(volume=>facts.mounts.some((m:any)=>m.Name===volume)))throw new Error('CodeShip data/key volumes changed.');
  if(name==='codeship'&&(Object.keys(facts.ports??{}).length!==1||facts.ports['4350/tcp']?.length!==1||facts.ports['4350/tcp'][0].HostIp!=='127.0.0.1'||facts.ports['4350/tcp'][0].HostPort!==String(codeshipHostPort)))throw Error('CodeShip must publish only its own loopback 14350:4350 port.');
 }
 const selectedIdentities=Object.fromEntries(selected.map(name=>[name,docker(['inspect',name,'--format','{{.Id}}'])]));
 for(let attempt=0;attempt<30;attempt++){try{const report=await jsonFile(path.join(appRoot,'.codeship/metrics/snapshot.json'));if(report.available&&Date.now()-Date.parse(report.collectedAt)<45000&&selected.every(name=>report.containers.some((r:any)=>r.project==='devkits'&&r.service===name&&r.owner==='devkit/'+name&&selectedIdentities[name].startsWith(r.id))))return;}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}throw Error('Fresh selected devkit metrics unavailable.');
}
try{
 if(mode==='verify'){await verify();await stage('verification','passed');}
 else{
  if(docker(['info','--format','{{.OSType}}'])!=='linux')throw new Error('Linux Docker required.');
  requireRawCompose(docker(['compose','version','--short']));
  const legacyState=existsSync(path.join(appRoot,'.codeship/docker/codeship.env.release.json'))?await jsonFile(path.join(appRoot,'.codeship/docker/codeship.env.release.json')):undefined;
  if(!prior&&!legacyState&&!freshUbuntu)throw new Error('Existing reviewed CodeShip deployment is required for group adoption.');
  if(mode==='update'&&!prior)throw new Error('Run setup.sh once to adopt the Devkits group.');
  for(const name of selected){
   const existing=docker(['ps','-aq','--filter','name=^/'+name+'$']);if(existing&&docker(['inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',existing])!=='devkits')throw new Error('Container name already belongs to another deployment.');
   if(mode==='setup'&&prior?.services[name])throw new Error(name+' is installed; use its update.sh.');
   const published=existing?JSON.parse(docker(['inspect',existing,'--format','{{json .HostConfig.PortBindings}}'])):{};
   const ownsPort=published[internal[name]+'/tcp']?.some((binding:any)=>binding.HostIp==='127.0.0.1'&&binding.HostPort===String(ports[name]));
   if(!ownsPort)await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',()=>reject(new Error('Port '+ports[name]+' is already occupied.')));probe.listen(ports[name],'127.0.0.1',()=>probe.close(()=>resolve()));});
  }
  await stage('preflight','passed');
  const releaseSet=releaseSetFile?await jsonFile(releaseSetFile):undefined;
  if(releaseSet&&(releaseSet.schema!==1||releaseSet.source!=='github'||selected.some(name=>!releaseSet.services[name])))throw new Error('Incomplete approved release set.');
  await stage('native-migration','skipped',{reason:'Native development is independent of Docker releases'});
  if(releaseSet){
   buildContext=path.join(runtime,'releases',run);await mkdir(buildContext,{recursive:true});
   for(const name of selected){
    const manifest=releaseSet.services[name];validateManifest(manifest,{owner:'devkit/'+name,repository:'CODEXSUN/'+name,tag:manifest.tag,commit:manifest.commit});
    const image=await resolveReleaseImage(manifest,docker,path.join(appRoot,'.codeship/releases/images'));
    histories[name]=compatibleMigrationHistory(manifest,prior?.services[name]?.migrations);
    const labels=JSON.parse(docker(['image','inspect',image,'--format','{{json .Config.Labels}}']));
    if(labels['org.opencontainers.image.revision']!==manifest.commit||labels['org.opencontainers.image.version']!==manifest.version)throw new Error('Pulled release image labels do not match the tagged commit.');
    images[name]={version:manifest.version,image,releaseImage:manifest.image,imageId:docker(['image','inspect',image,'--format','{{.Id}}']),sourceDigest:manifest.commit,migrations:legacyMigrationMap(manifest),releaseTag:manifest.tag,previousImage:prior?.services[name]?.image};
   }
   // Runtime adapters come from the pinned CodeShip image, never another app's editable workspace.
   const id=docker(['create',images.codeship.image]);
   try{docker(['cp',id+':/opt/codebiz/devkit/codeship/.container/devkits',buildContext]);}finally{docker(['rm',id]);}
   for(const name of selected)images[name].contractRoot=path.join(buildContext,'devkits');
   if(hostinger&&selected.includes('codeitz')){const {copyFile}=await import('node:fs/promises');await copyFile(path.join(appRoot,'.container/devkits/codeitz-plan.ts'),path.join(buildContext,'devkits/codeitz-plan.ts'));}
   await stage('github-release-images','passed',{services:selected,tags:selected.map(name=>images[name].releaseTag)});
  }
  if(!images.codeship)images.codeship={...legacyState,version:(await jsonFile(path.join(appRoot,'package.json'))).version};
  if(!existsSync(composeFile)&&!selected.includes('codeship'))throw new Error('Adopt CodeShip with the group setup.sh before separate installs.');
  let network:any;try{network=JSON.parse(docker(['network','inspect','devkits_default']))[0];}catch{docker(['network','create','--label','codeship.owner=devkits','devkits_default']);network=JSON.parse(docker(['network','inspect','devkits_default']))[0];}
  const infraNetwork=JSON.parse(docker(['network','inspect',infraNetworkName]))[0];
  const infraPeers=infraNetwork.IPAM.Config.map((row:any)=>row.Gateway).filter(Boolean).join(',');
  const peers=network.IPAM.Config.map((row:any)=>row.Gateway).filter((ip:string)=>/^\d+\.\d+\.\d+\.\d+$/.test(ip)).join(',');if(!peers)throw new Error('Devkit bridge gateway unavailable.');
  const existingRows=await db.selectFrom('applications').selectAll().execute();
  const sourceRows:Record<string,any>={},settings:Record<string,Record<string,string>>={};
  for(const name of names){sourceRows[name]=existingRows.find(row=>row.owner==='devkit/'+name&&row.environment==='local-docker')??existingRows.find(row=>row.owner==='devkit/'+name);const source=sourceRows[name];settings[name]=source?.encrypted_secrets?currentEnvironment(decryptSecrets(source.public_id,source.encrypted_secrets)):{};}
  const authenticated=selected.filter(name=>settings[name][name.toUpperCase()+'_PLATFORM_AUTH']==='1');
  const platformNetwork=authenticated.length?platformDevkitNetwork(JSON.parse(docker(['network','inspect','applications_backend']))[0]):undefined;
  const connectorPeers=hostinger?Object.values(network.Containers??{}).filter((row:any)=>['cloudflared','platform'].includes(row.Name)).map((row:any)=>row.IPv4Address.split('/')[0]):[];
  if(hostinger&&authenticated.length&&connectorPeers.length!==2)throw Error('Resolve the existing tunnel connector and Platform peers.');
  for(const name of authenticated)await stage('platform-admission-'+name,'prepared',await admitPlatformDevkit({action:'prepare',name,release:images[name],settings:settings[name],appRoot,docker}));
  const pgRecord=await db.selectFrom('infrastructure_services').selectAll().where('kind','=','postgres').where('environment','=','local-docker').executeTakeFirstOrThrow();
  const pgSecrets=pgRecord.encrypted_secrets?decryptSecrets(pgRecord.public_id,pgRecord.encrypted_secrets):{};
  const adminConfig={host:'127.0.0.1',port:pgRecord.port??5433,database:'postgres',user:pgRecord.username,password:pgSecrets.password,connectionTimeoutMillis:5000};
  const codeitzEnvFile=path.join(privateRoot,'codeitz.env');
  const uiuxEnvFile=path.join(privateRoot,'uiux.env');
  const uiuxComposeEnv=path.join(privateRoot,'uiux.compose.env'),codeitzComposeEnv=path.join(privateRoot,'codeitz.compose.env');
  if(selected.includes('uiux')){
   for(const key of Object.keys(settings.uiux))if(isProtectedEnvironmentKey(key))delete settings.uiux[key];
   await writeFile(uiuxEnvFile,serializeDeploymentEnvironment(settings.uiux),{mode:0o600});
   await writeFile(uiuxComposeEnv,rawEnvironment(settings.uiux),{mode:0o600});
  }
  if(selected.includes('codeitz')){
   let savedEnv:Record<string,string>={};if(existsSync(codeitzEnvFile)){const {parseEnv}=await import('node:util');savedEnv=parseEnv(await readFile(codeitzEnvFile,'utf8'));}
   const password=(sourceRows.codeitz?.environment==='local-docker'?settings.codeitz.PGPASSWORD:undefined)??savedEnv.PGPASSWORD??randomBytes(32).toString('base64url');
   settings.codeitz={...settings.codeitz,PGHOST:'postgres',PGPORT:String(pgRecord.docker_port??5432),PGDATABASE:'codeitz',PGUSER:'codeitz',PGPASSWORD:password,PGSSLMODE:'disable',CODEITZ_PG_TRANSPORT:'docker-network',CODEITZ_WORKSPACE_ROOT:'/workspace'};
   for(const key of Object.keys(settings.codeitz))if(isProtectedEnvironmentKey(key))delete settings.codeitz[key];
   await writeFile(codeitzEnvFile,serializeDeploymentEnvironment(settings.codeitz),{mode:0o600});
   if(hostinger){const {chown}=await import('node:fs/promises');await chown(codeitzEnvFile,1000,1000);}
   const admin=new pg.Client(adminConfig);await admin.connect();
   try{
    const exists=(await admin.query("SELECT datname FROM pg_database WHERE datname='codeitz'")).rowCount;
    const markerFile=path.join(runtime,'codeitz-database.json'),marker=existsSync(markerFile)?await jsonFile(markerFile):undefined;
    if(exists&&!marker)throw new Error('Unmanaged codeitz database already exists; refusing to overwrite it.');
    if(!exists){
     if((await admin.query("SELECT rolname FROM pg_roles WHERE rolname='codeitz'")).rowCount)throw new Error('Unmanaged codeitz role already exists.');
     await admin.query("CREATE ROLE codeitz LOGIN PASSWORD '"+password.replaceAll("'","''")+"'");
     await admin.query('CREATE DATABASE codeitz OWNER codeitz');await save(markerFile,{status:'created',database:'codeitz'});
    }
    if(marker?.status==='imported'&&savedEnv.PGPASSWORD&&savedEnv.PGPASSWORD!==password)await admin.query("ALTER ROLE codeitz PASSWORD '"+password.replaceAll("'","''")+"'");
    if(hostinger){
     if(marker&&marker.status!=='fresh')throw Error('Unexpected Hostinger Codeitz database marker');
     if(!marker)await save(markerFile,{status:'fresh',database:'codeitz',dataImported:false});
     await stage('codeitz-data-copy','skipped',{reason:'Fresh Hostinger database; local data import forbidden'});
    }else if(!marker||marker.status!=='imported'){
     await stage('codeitz-data-copy','started');
     const sourceModule=await import(pathToFileURL(path.join(workspaceRoot,'devkit/codeitz/src/api/database.ts')).href),source=sourceModule.databaseSettings();
     const bin=process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin/':'';
     const dump=path.join(privateRoot,'codeitz-initial-'+run+'.dump');
     const sourceEnv={...process.env,PGHOST:source.connection.host,PGPORT:String(source.connection.port),PGDATABASE:source.connection.database,PGUSER:source.connection.user,PGPASSWORD:source.connection.password,PGSSLMODE:source.connection.ssl===false?'disable':'verify-full'};
     execute(path.join(bin,'pg_dump'),['--format=custom','--no-owner','--no-privileges','--file',dump],{env:sourceEnv,quiet:true});await chmod(dump,0o600);
     const targetEnv={...process.env,PGHOST:'127.0.0.1',PGPORT:String(pgRecord.port??5433),PGDATABASE:'codeitz',PGUSER:'codeitz',PGPASSWORD:password,PGSSLMODE:'disable'};
     execute(path.join(bin,'pg_restore'),['--single-transaction','--exit-on-error','--no-owner','--no-privileges','--dbname=codeitz',dump],{env:targetEnv,quiet:true});
     const check=new pg.Client({...adminConfig,database:'codeitz',user:'codeitz',password});await check.connect();try{const tables=Number((await check.query("SELECT count(*) AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n);if(!tables)throw new Error('Imported database is empty.');await save(markerFile,{status:'imported',database:'codeitz',tables,sourceSchema:source.schema,dump,sha256:createHash('sha256').update(await readFile(dump)).digest('hex')});await stage('codeitz-data-copy','passed',{tables});}finally{await check.end();}
    }else await stage('codeitz-data-copy','skipped',{reason:'Existing imported Docker database preserved'});
   }finally{await admin.end();}
   // Seed only the known empty named workspace, preserving its identity for File Manager.
   const workspaceVolume='codeitz-docker-local_workspace';docker(['volume','inspect',workspaceVolume]);
   const empty=docker(['run','--rm','--entrypoint','sh','--mount','type=volume,source='+workspaceVolume+',target=/workspace',images.codeitz.image,'-c','if [ -z "$(ls -A /workspace)" ]; then echo empty; else echo populated; fi']);
   if(empty==='empty'){
    await stage('codeitz-workspace','started');docker(['run','--rm','--mount','type=volume,source='+workspaceVolume+',target=/workspace','-e','CODEITZ_WORKSPACE_ROOT=/workspace','--entrypoint','node',images.codeitz.image,'.container/init-workspace.mjs']);await stage('codeitz-workspace','passed');
   }else await stage('codeitz-workspace','skipped',{reason:'Existing workspace preserved'});
  }
  if(images.codeitz&&selected.includes('codeitz')){
   const init="const fs=require('node:fs/promises');(async()=>{const root='/workspace';await fs.access(root+'/mcp-governance/docs/governance.md');for(const owner of ['foundation/framework','packages/ui','devkit/codeitz']){const dest=root+'/'+owner+'/node_modules';try{await fs.lstat(dest);}catch(e){if(e.code!=='ENOENT')throw e;await fs.symlink('/opt/codebiz/'+owner+'/node_modules',dest);}}try{await fs.writeFile(root+'/.codeitz-workspace-initialized','Workspace managed by CodeShip; existing files are preserved.\\n',{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}})().catch(()=>process.exit(1));";
   docker(['run','--rm','--entrypoint','node','--mount','type=volume,source=codeitz-docker-local_workspace,target=/workspace',images.codeitz.image,'-e',init]);
  }
  // Reuse exact CodeShip data/key volumes across Compose project/service renaming.
  const mounts=[{type:'volume',source:'codeship_data',target:'/data'},{type:'volume',source:'codeship_keys',target:'/keys'}];
  const codeShipTool=(command:string[],input?:string|Buffer)=>docker(['run','--rm',...(input!==undefined?['-i']:[]),'--network','none','-e','CODESHIP_SQLITE_FILE=/data/codeship.sqlite','-e','CODESHIP_VAULT_KEY_FILE=/keys/vault.key','-e','CODESHIP_DEPLOYMENT_PROJECT=devkits',...mounts.flatMap(m=>['--mount',`type=${m.type},source=${m.source},target=${m.target}`]),images.codeship.image,'node',...command],input);
  const codeShipPlan=JSON.parse(codeShipTool(['scripts/migration-plan.ts']));
  const codeShipDecision=migrationDecision(codeShipPlan,histories.codeship??prior?.services.codeship?.migrations??legacyState?.migrations,images.codeship.migrations);
  if(codeShipDecision.migrateRequired){
   const current=docker(['ps','-q','--filter',prior?'label=com.docker.compose.project=devkits':'label=com.docker.compose.project=codeship','--filter',prior?'label=com.docker.compose.service=codeship':'label=com.docker.compose.service=app']);if(current)docker(['stop',current]);
   codeShipTool(['scripts/backup.ts','/data/backups/devkits-'+run+'.sqlite']);codeShipTool(['scripts/database.ts','migrate']);await stage('codeship-migration','passed',{backupCreated:true});
  }else await stage('codeship-migration','skipped',{reason:'No pending migrations; data and key volumes retained'});
  if(images.codeitz&&selected.includes('codeitz')){
   const plan=JSON.parse(docker(['run','--rm','--network',infraNetworkName,'--mount','type=bind,source='+codeitzEnvFile+',target=/opt/codebiz/devkit/codeitz/.env,readonly','--mount','type=bind,source='+path.join(images.codeitz.contractRoot??path.join(appRoot,'.container/devkits'),'codeitz-plan.ts')+',target=/opt/codebiz/devkit/codeitz/scripts/codeship-plan.ts,readonly','--entrypoint','node',images.codeitz.image,'/opt/codebiz/devkit/codeitz/scripts/codeship-plan.ts']));
   const decision=migrationDecision(plan,histories.codeitz??prior?.services.codeitz?.migrations,images.codeitz.migrations);
   if(decision.migrateRequired){
    if(prior?.services.codeitz){docker(['stop','codeitz']);const {parseEnv}=await import('node:util');const env=parseEnv(await readFile(codeitzEnvFile,'utf8')),backup=path.join(privateRoot,'codeitz-before-migration-'+run+'.dump'),bin=process.platform==='win32'?'C:/Program Files/PostgreSQL/17/bin/':'';execute(path.join(bin,'pg_dump'),['--format=custom','--file',backup],{env:{...process.env,...env,PGHOST:'127.0.0.1',PGPORT:String(pgRecord.port??5433)},quiet:true});execute(path.join(bin,'pg_restore'),['--list',backup],{quiet:true});await stage('codeitz-backup','passed',{backup,sha256:createHash('sha256').update(await readFile(backup)).digest('hex'),check:'Archive readable; no restore rehearsal claimed'});}
    docker(['run','--rm','--network',infraNetworkName,'--mount','type=bind,source='+codeitzEnvFile+',target=/opt/codebiz/devkit/codeitz/.env,readonly','--entrypoint','node',images.codeitz.image,'scripts/database.ts']);await stage('codeitz-migration','passed');
   }else await stage('codeitz-migration','skipped',{reason:'No pending PostgreSQL migrations'});
   if(hostinger&&!prior?.services.codeitz){
    docker(['run','--rm','--network',infraNetworkName,'--mount','type=bind,source='+codeitzEnvFile+',target=/opt/codebiz/devkit/codeitz/.env,readonly','--mount','type=bind,source='+path.join(appRoot,'.container/devkits/codeitz-fresh.ts')+',target=/opt/codebiz/devkit/codeitz/scripts/codeship-fresh.ts,readonly','--entrypoint','node',images.codeitz.image,'scripts/codeship-fresh.ts']);
    await stage('codeitz-fresh-references','passed',{dataImported:false,businessRecords:0});
   }
  }
  const payload=[];
  for(const name of selected){
   const source=sourceRows[name],secrets=source?.encrypted_secrets?decryptSecrets(source.public_id,source.encrypted_secrets):{};
   const savedSecrets=Object.fromEntries(['password','token','sshKey','saPassword','adminPassword','userPassword'].filter(key=>secrets[key]).map(key=>[key,secrets[key]]));
   savedSecrets.env=serializeDeploymentEnvironment(settings[name]);
   payload.push({name:name==='codeship'?'CodeShip':name==='codeitz'?'Codeitz':'UIUX',owner:'devkit/'+name,project:'devkits',environment:'local-docker',host:'127.0.0.1',port:ports[name],version:images[name].version,username:source?.username??'',notes:'CodeShip-managed Devkits Docker group',users:installationUsers(secrets).map(({hasPassword,...user})=>user),secrets:savedSecrets});
  }
  const registryPayload=JSON.stringify(requireSelectedRegistry(payload,selected));
  execute(process.execPath,['scripts/register-devkits.ts'],{input:registryPayload,quiet:true});codeShipTool(['scripts/register-devkits.ts'],registryPayload);codeShipTool(['scripts/write-runtime-environment.ts']);
  await stage('registry','passed');
  const bind=(source:string,target:string,read_only=true)=>({type:'bind',source,target,read_only});
  const service=(name:typeof names[number])=>({image:images[name].image,container_name:name,init:true,restart:'unless-stopped',security_opt:['no-new-privileges:true'],cap_drop:['ALL'],ports:[`127.0.0.1:${ports[name]}:${internal[name]}`],stop_grace_period:'45s',healthcheck:{test:['CMD','node','-e',`fetch('http://127.0.0.1:${internal[name]}/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`],interval:'5s',timeout:'4s',start_period:'20s',retries:30}});
  if(images.codeitz&&selected.includes('codeitz')){const {parseEnv}=await import('node:util');await writeFile(codeitzComposeEnv,rawEnvironment(parseEnv(await readFile(codeitzEnvFile,'utf8'))),{mode:0o600});}
  const services:Record<string,any>={
   codeship:{...service('codeship'),environment:{NODE_ENV:'production',CODESHIP_HOST:'0.0.0.0',CODESHIP_PORT:'4350',CODESHIP_BIND_MODE:'docker-direct',CODESHIP_DOCKER_PEERS:peers,CODESHIP_DEPLOYMENT_PROJECT:'devkits',CODESHIP_EXECUTION_MODE:'inventory',CODESHIP_METRICS_FILE:'/metrics/snapshot.json',CODESHIP_SQLITE_FILE:'/data/codeship.sqlite',CODESHIP_VAULT_KEY_FILE:'/keys/vault.key'},volumes:['codeship_data:/data','codeship_keys:/keys',bind(path.join(appRoot,'.codeship/metrics'),'/metrics'),bind(path.join(appRoot,'.container/targets.empty.json'),'/opt/codebiz/devkit/codeship/.codeship/targets.json')]},
  };
  if(images.codeitz)services.codeitz={...service('codeitz'),env_file:[{path:codeitzComposeEnv,format:'raw'}],environment:{NODE_ENV:'production',CODEITZ_HOST:'0.0.0.0',CODEITZ_PORT:'4305',CODEITZ_BIND_MODE:'docker-direct',CODEITZ_DOCKER_PEERS:[peers,infraPeers].filter(Boolean).join(','),CODEITZ_WORKSPACE_ROOT:'/workspace'},command:['node','/opt/codebiz/devkit/codeitz/scripts/codeship-start.ts'],volumes:['workspace:/workspace','codeitz_state:/opt/codebiz/devkit/codeitz/.codeitz','codeitz_codex:/home/node/.codex',bind(path.join(images.codeitz.contractRoot??path.join(appRoot,'.container/devkits'),'codeitz-start.ts'),'/opt/codebiz/devkit/codeitz/scripts/codeship-start.ts')],networks:['default','infra']};
  if(images.uiux)services.uiux={...service('uiux'),env_file:[{path:uiuxComposeEnv,format:'raw'}],environment:{NODE_ENV:'production',UIUX_HOST:'0.0.0.0',UIUX_PORT:'4315',UIUX_BIND_MODE:'docker-direct',UIUX_DOCKER_PEERS:peers},command:['node','src/api/server.ts']};
  const definition={name:'devkits',services,volumes:{codeship_data:{external:true,name:'codeship_data'},codeship_keys:{external:true,name:'codeship_keys'},workspace:{external:true,name:'codeitz-docker-local_workspace'},codeitz_state:{},codeitz_codex:{}},networks:{default:{external:true,name:'devkits_default'},infra:{external:true,name:infraNetworkName}}};
  if(platformNetwork){
   (definition.networks as any).backend={external:true,name:platformNetwork.name};
   for(const name of authenticated){
    const item=services[name];const original=Array.isArray(item.networks)?Object.fromEntries(item.networks.map(key=>[key,{}])):item.networks??{default:{}};
    item.networks={...original,backend:{ipv4_address:platformNetwork.addresses[name]}};
    item.extra_hosts=['platform:'+platformNetwork.platform];
    item.environment[name.toUpperCase()+'_DOCKER_PEERS']=[item.environment[name.toUpperCase()+'_DOCKER_PEERS'],platformNetwork.platform,platformNetwork.gateway,...connectorPeers].filter(Boolean).join(',');
   }
  }
  if(ubuntuTarget){const used=new Set(Object.values(services).flatMap((s:any)=>(s.volumes??[]).map((v:any)=>typeof v==='string'?v.split(':')[0]:v.type==='volume'?v.source:null)).filter(Boolean));for(const key of Object.keys(definition.volumes))if(!used.has(key))delete (definition.volumes as any)[key];}
  if(prior&&existsSync(composeFile)){
   const existing=await jsonFile(composeFile);
   preserveUnselected(definition,existing,selected);
  }
  await save(composeFile,definition);docker(['compose','-p','devkits','-f',composeFile,'config','--quiet']);
  await stage('replacement','started');
  if(!prior&&!freshUbuntu){const old=docker(['ps','-aq','--filter','label=com.docker.compose.project=codeship','--filter','label=com.docker.compose.service=app']);if(!old)throw new Error('Former CodeShip container missing.');const facts=JSON.parse(docker(['inspect','--format','{"image":{{json .Config.Image}},"mounts":{{json .Mounts}}}',old]));if(facts.image!==legacyState.image||!['codeship_data','codeship_keys'].every(name=>facts.mounts.some((m:any)=>m.Name===name)))throw new Error('Former CodeShip identity/volume mismatch.');docker(['stop',old]);}
  compose(['up','-d','--no-deps','--no-build','--wait','--wait-timeout','180',...selected]);
  await verify();await stage('verification','passed');
  for(const name of authenticated)await stage('platform-admission-'+name,'passed',await admitPlatformDevkit({action:'complete',name,release:images[name],settings:settings[name],appRoot,docker}));
  await save(stateFile,{project:'devkits',services:images,updatedAt:new Date().toISOString(),compose:composeFile});
  if(!prior){const old=docker(['ps','-aq','--filter','label=com.docker.compose.project=codeship','--filter','label=com.docker.compose.service=app']);if(old)docker(['rm',old]);}
  await stage('release','succeeded',{services:selected,ports:selected.map(name=>ports[name])});
 }
}catch(error){await stage('release','failed',{message:(error as Error).message});console.error('Devkit operation failed. Existing volumes, data and migration snapshots are retained.');process.exitCode=1;}
finally{if(!dbClosed){await db.destroy();dbClosed=true;}await lock.close();await unlink(lockFile);}
