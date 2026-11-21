import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
import {parseEnv} from 'node:util';
import {randomBytes,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateManifest} from '../release-policy.mjs';
import {resolveReleaseImage} from '../release-image.mjs';
import {migrationDecision} from '../policy.mjs';
import {requestOffhostRecovery} from '../offhost-recovery.mjs';
import {rawEnvironment,requireRawCompose} from '../raw-environment.mjs';
import {serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
import {startupHealth,startupBudget} from '../apps/startup-budget.mjs';
import {ensureApplicationNetwork,applyIndependentNetwork} from '../apps/network-topology.mjs';
import {probePlatformRuntime} from '../apps/platform-runtime-probe.mjs';
import {validateIilabsOwner} from './iilabs-tenant.mjs';
import {requireIilabsTarget,iilabsInstallationEnvironment,iilabsServiceProfile,iilabsRuntimeEnvironment,withPlatformAvailability,iilabsPublicTransition,iilabsSetupResume} from './iilabs-policy.mjs';
import {effectiveIilabsPlatformEnvironment} from './iilabs-platform.mjs';
import {prepareIilabsPublicRecovery,withIilabsFirstReplacement,approvedPublicRuntimeSha256} from './iilabs-public-recovery.mjs';

const source=fileURLToPath(new URL('../../',import.meta.url));
const state=fs.realpathSync(path.join(source,'.codeship')),root=path.join(state,'apps/iilabs'),privateRoot=path.join(root,'private');
const stateFile=path.join(root,'state.json'),envFile=path.join(privateRoot,'runtime.env'),composeFile=path.join(root,'compose.json');
const platformRoot=path.join(state,'apps/platform'),platformEnvFile=path.join(platformRoot,'private/runtime.env'),platformComposeFile=path.join(platformRoot,'compose.json');
const run=new Date().toISOString().replace(/[:.]/g,'-');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const save=(file,value)=>{fs.writeFileSync(file+'.next',JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(file+'.next',file);};
const execute=(command,args,input)=>{try{return cp.execFileSync(command,args,{cwd:source,input,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024,stdio:['pipe','pipe','pipe']}).trim();}catch{throw Error('Private selected IILabs operation failed; retained stage/recovery identifies the boundary.');}};
const docker=(args,input)=>execute('docker',args,input);
const stage=(name,status,detail={})=>{fs.appendFileSync(path.join(root,'stages.jsonl'),JSON.stringify({at:new Date().toISOString(),run,stage:name,status,...detail})+'\n',{mode:0o600});console.log('iilabs '+name+': '+status);};
const compose=(file,args)=>docker(['compose','-p','applications','-f',file,...args]);
const fingerprintContainers=()=>JSON.parse(docker(['inspect',...docker(['ps','-q']).split(/\s+/)])).filter(c=>c.Name!=='/iilabs'&&c.Name!=='/platform').map(c=>({name:c.Name,id:c.Id,image:c.Image})).sort((a,b)=>a.name.localeCompare(b.name));
async function requireReady(port){const response=await fetch('http://127.0.0.1:'+port+'/api/ready',{signal:AbortSignal.timeout(10000)});await response.body?.cancel();if(response.status!==200)throw Error('Selected dependency/runtime readiness failed.');}
async function verify(manifest){
  await requireReady(14435);
  const facts=readDocker('iilabs');if(facts.Image!==manifest.imageId||facts.State.Health?.Status!=='healthy'||facts.Config.Labels?.['org.opencontainers.image.revision']!==manifest.commit)throw Error('IILabs image/health differs from approved release.');
  const ports=facts.HostConfig.PortBindings;if(Object.keys(ports).length!==1||ports['4435/tcp']?.length!==1||ports['4435/tcp'][0].HostIp!=='127.0.0.1'||ports['4435/tcp'][0].HostPort!=='14435'||facts.HostConfig.NetworkMode==='host'||!facts.NetworkSettings.Networks.applications_backend)throw Error('IILabs private network/binding differs.');
  const info=await(await fetch('http://127.0.0.1:14435/api/service-info',{signal:AbortSignal.timeout(10000)})).json();if(info.appKey!=='iilabs'||info.version!==manifest.version||info.schemaReady!==true||info.authentication!=='platform-grant-v1')throw Error('IILabs admission identity differs.');
  const guarded=await fetch('http://127.0.0.1:14435/api/v1/workspace',{signal:AbortSignal.timeout(10000)});await guarded.body?.cancel();if(guarded.status!==401)throw Error('IILabs workspace authentication is required.');
  const foreign=await fetch('http://127.0.0.1:14435/platform-api/v1/identity/session',{headers:{origin:'https://example.invalid'},signal:AbortSignal.timeout(10000)});await foreign.body?.cancel();if(foreign.status!==403)throw Error('IILabs origin guard differs.');
  const publicPage=await fetch('https://iilabs.in/',{signal:AbortSignal.timeout(15000)});const publicText=await publicPage.text();if(publicPage.status!==200||!publicText.includes('IILabs'))throw Error('Public IILabs frontend readiness failed.');
}
const readDocker=name=>JSON.parse(docker(['inspect',name]))[0];
async function main(){
  const [mode,name,...args]=process.argv.slice(2);const target=read(path.join(state,'target.json'));
  requireIilabsTarget({platform:process.platform,hostname:os.hostname(),uid:process.getuid?.(),root:fs.realpathSync(source),target,entry:process.env.CODESHIP_RELEASED_UPDATE_ENTRY});
  const resumeId=args.length===4&&args[2]==='--resume'?args[3]:undefined;
  if(name!=='iilabs'||!['setup','update','verify'].includes(mode)||mode==='verify'&&args.length||mode!=='verify'&&(args[0]!=='--release-set'||args.length!==2&&!(mode==='setup'&&resumeId)))throw Error('Use selected IILabs setup/update entry.');
  fs.mkdirSync(privateRoot,{recursive:true,mode:0o700});
  const prior=fs.existsSync(stateFile)?read(stateFile):undefined;
  if(mode==='verify'){if(!prior)throw Error('IILabs is not installed.');await verify(prior);return;}
  if(mode==='setup'&&prior||mode==='update'&&!prior)throw Error('Selected IILabs installation state differs.');
  if(mode==='setup'&&!resumeId&&fs.existsSync(path.join(root,'ownership.json')))throw Error('IILabs setup already started; inspect retained partial state, never reset/repeat provisioning.');
  const set=read(path.resolve(args[1])),manifest=set.services?.iilabs;if(set.schema!==1||set.source!=='github'||!manifest)throw Error('Approved IILabs release missing.');
  validateManifest(manifest,{owner:'apps/iilabs',repository:'CODEXSUN/iilabs',tag:manifest.tag,commit:manifest.commit});
  const image=await resolveReleaseImage(manifest,docker,path.join(state,'releases/images'));const label=JSON.parse(docker(['image','inspect',image,'--format','{{json .Config.Labels}}']));if(label['org.opencontainers.image.revision']!==manifest.commit||label['org.opencontainers.image.version']!==manifest.version)throw Error('Approved IILabs image labels differ.');stage('release-image','passed');
  if(resumeId){const checkpoint=iilabsSetupResume({run:resumeId,ownership:read(path.join(root,'ownership.json')),manifest,stages:fs.readFileSync(path.join(root,'stages.jsonl'),'utf8').trim().split('\n').map(JSON.parse),backendState:prior});const backup=path.join(privateRoot,'master-before-'+resumeId+'.dump');if(createHash('sha256').update(fs.readFileSync(backup)).digest('hex')!==checkpoint.sha256)throw Error('Original checked master recovery changed.');}
  const publicRoot=path.join(state,'apps/iilabs-public');
  let publicRecovery,publicRecoveryDirectory;
  if(!prior){
    const publicFile=path.join(publicRoot,'state.json');const publicState=fs.existsSync(publicFile)?read(publicFile):undefined;
    const existing=docker(['ps','-aq','--filter','name=^/iilabs$']);const container=existing?readDocker('iilabs'):undefined;
    const transition=iilabsPublicTransition({publicState,container,manifest});
    if(transition.retainPublicRecovery){
      if(fs.realpathSync(publicState.compose)!==fs.realpathSync(path.join(publicRoot,'compose.json')))throw Error('Public state has an unexpected Compose owner.');
      const recovery=path.join(privateRoot,'public-before-'+run);fs.mkdirSync(recovery,{mode:0o700});
      for(const file of [publicFile,publicState.compose])fs.copyFileSync(file,path.join(recovery,path.basename(file)));
      save(path.join(recovery,'container.json'),{id:container.Id,image:container.Image,labels:container.Config.Labels,ports:container.HostConfig.PortBindings});
      const definition=read(publicState.compose),runtimeDirectory=fs.realpathSync(definition.services?.iilabs?.volumes?.[0]?.source??'');
      if(!runtimeDirectory.startsWith(fs.realpathSync(publicRoot)+path.sep+'runtime-'))throw Error('Public runtime is outside the approved versioned owner directory.');
      const originalRuntime=path.join(runtimeDirectory,'start.mjs');if(fs.lstatSync(originalRuntime).isSymbolicLink()||!fs.statSync(originalRuntime).isFile())throw Error('Public runtime must be an owned regular file.');
      const bytes=fs.readFileSync(originalRuntime),runtimeSha256=createHash('sha256').update(bytes).digest('hex');
      publicRecovery=prepareIilabsPublicRecovery({mode,priorBackend:prior,attemptId:run,manifest,publicState,container,definition,runtimeSha256});
      const retainedRuntime=path.join(recovery,'runtime');fs.mkdirSync(retainedRuntime,{mode:0o755});fs.writeFileSync(path.join(retainedRuntime,'start.mjs'),bytes,{mode:0o644,flag:'wx'});
      publicRecoveryDirectory=recovery;
      save(path.join(recovery,'provenance.json'),{imageId:manifest.imageId,commit:manifest.commit,attemptId:run,runtimeSha256,statelessFrontendOnly:true});
      stage('public-transition','prepared',{recovery,homepageUnchanged:true});
    }
  }
  requireRawCompose(docker(['compose','version','--short']));
  if(resumeId){if(readDocker('platform').State.Health?.Status!=='healthy')throw Error('Recorded configuration resume requires healthy same-image Platform.');}else await requireReady(14385);
  const baseline=fingerprintContainers();save(path.join(privateRoot,'siblings-'+run+'.json'),baseline);
  const platformState=read(path.join(platformRoot,'state.json'));const platformImage=readDocker('platform').Image;if(platformImage!==platformState.imageId)throw Error('Existing Platform release image differs.');
  const savedPlatformEnvironment=parseEnv(fs.readFileSync(platformEnvFile,'utf8'));
  const platformDefinition=read(platformComposeFile),service=platformDefinition.services.platform;if(!service?.networks?.backend||service.network_mode)throw Error('Existing independent Platform topology required.');
  const platformEnvironment=resumeId?effectiveIilabsPlatformEnvironment(parseEnv(fs.readFileSync(path.join(privateRoot,'platform-before-'+resumeId,'runtime.env'),'utf8')),read(path.join(privateRoot,'platform-before-'+resumeId,'compose.json')).services.platform.environment):effectiveIilabsPlatformEnvironment(savedPlatformEnvironment,service.environment);
  const infra=readDocker('cxapp-postgres');const infraEnv=Object.fromEntries(infra.Config.Env.map(value=>{const i=value.indexOf('=');return [value.slice(0,i),value.slice(i+1)];}));
  if(infra.Config.Labels?.['com.docker.compose.project']!=='cxapp-postgres'||infra.Config.Labels?.['com.docker.compose.service']!=='postgres'||infraEnv.POSTGRES_PASSWORD_FILE!=='/run/secrets/postgres_password')throw Error('Registered PostgreSQL ownership/credential source differs.');
  const adminPassword=cp.execFileSync('docker',['exec','cxapp-postgres','cat','/run/secrets/postgres_password'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).replace(/\r?\n$/,'');
  if(!adminPassword||/[\r\n\0]/.test(adminPassword))throw Error('Unsupported private PostgreSQL credential.');
  const admin={host:'postgres',port:5432,user:infraEnv.POSTGRES_USER||'postgres',password:adminPassword};
  const runtime=path.join(privateRoot,'runtime-'+run);fs.mkdirSync(runtime,{mode:0o750});fs.chownSync(runtime,0,1000);
  for(const file of ['business-targets.mjs','business-database.mjs','runtime-network.mjs','startup-budget.mjs','start-business.mjs','start-platform.mjs']){const dest=path.join(runtime,file);fs.copyFileSync(path.join(source,'.container/apps',file),dest);fs.chmodSync(dest,0o640);fs.chownSync(dest,0,1000);}
  for(const file of ['iilabs-provision.mjs','iilabs-tenant.mjs','iilabs-platform.mjs']){const dest=path.join(runtime,file);fs.copyFileSync(path.join(source,'.container/hostinger',file),dest);fs.chmodSync(dest,0o640);fs.chownSync(dest,0,1000);}
  const runner=(command,input)=>JSON.parse(docker(['run','--rm','-i','--network','cxapp-network','--mount','type=bind,source='+runtime+',target=/run/codeship,readonly','-e','CODESHIP_IILABS_PROVISION=1','-e','PLATFORM_BIND_MODE=docker-direct','--entrypoint','node',platformImage,'/run/codeship/iilabs-provision.mjs',command],JSON.stringify(input)));
  const {iilabsPlatformEnvironment,verifyExistingPlatformHosts}=await import('./iilabs-platform.mjs');
  const oldHosts=runner('hosts',{masterURL:platformEnvironment.PLATFORM_MASTER_DATABASE_URL});verifyExistingPlatformHosts(oldHosts);
  let environment=iilabsInstallationEnvironment(fs.existsSync(envFile)?parseEnv(fs.readFileSync(envFile,'utf8')):undefined,{installed:!!prior,resume:!!resumeId});
  let tenantConnection=resumeId?parseEnv(fs.readFileSync(path.join(privateRoot,'tenant.env'),'utf8')).PLATFORM_TENANT_IILABS_DATABASE_URL:platformEnvironment.PLATFORM_TENANT_IILABS_DATABASE_URL;
  let owner;
  if(!prior){
    const file=process.env.CODESHIP_IILABS_OWNER_FILE;if(file!==path.join(privateRoot,'owner.env')||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()||(fs.statSync(file).mode&0o077)!==0)throw Error('Use the protected transferred owner file.');
    const values=parseEnv(fs.readFileSync(file,'utf8'));owner=Object.fromEntries(['USERNAME','EMAIL','NAME','PASSWORD'].map(key=>[key,values['IILABS_OWNER_'+key]]));validateIilabsOwner(owner);
    if(!resumeId){
    const u=new URL('postgresql://platform_iilabs@postgres:5432/platform_iilabs');u.password=randomBytes(32).toString('hex');tenantConnection=u.href;
    if(platformEnvironment.PLATFORM_TENANT_IILABS_DATABASE_URL)throw Error('New tenant connection already exists; preserve its ownership.');
    fs.writeFileSync(envFile,serializeDeploymentEnvironment(environment),{mode:0o600});
    save(path.join(root,'ownership.json'),{schema:1,target:'hostinger-914719',status:'provisioning',databases:['app_iilabs','platform_iilabs'],tenant:'iilabs',imageId:manifest.imageId,run,at:new Date().toISOString()});
    fs.writeFileSync(path.join(privateRoot,'tenant.env'),serializeDeploymentEnvironment({PLATFORM_TENANT_IILABS_DATABASE_URL:tenantConnection}),{mode:0o600,flag:'wx'});
    runner('databases',{admin,settings:{...environment,PLATFORM_TENANT_IILABS_DATABASE_URL:tenantConnection}});stage('fresh-databases','passed',{dataImported:false});
    }else if(savedPlatformEnvironment.PLATFORM_TENANT_IILABS_DATABASE_URL!==tenantConnection||savedPlatformEnvironment.PLATFORM_TENANCY_MODE!=='multi')throw Error('Recorded partial tenant configuration differs; no provisioning repeated.');
  }
  fs.writeFileSync(envFile,serializeDeploymentEnvironment(environment),{mode:0o600});
  const dbTool=command=>docker(['run','--rm','--user','0','--network','cxapp-network','--mount','type=bind,source='+envFile+',target=/run/app.env,readonly','--mount','type=bind,source='+runtime+',target=/run/codeship,readonly','--entrypoint','node',image,'--env-file=/run/app.env','/run/codeship/business-database.mjs',command]);
  const plan=JSON.parse(dbTool('plan'));const current=Object.fromEntries(Object.entries(manifest.migrations).map(([file,hash])=>[path.basename(file,'.ts'),hash]));const decision=migrationDecision(plan,prior?.migrations,current);
  async function checkedBackup(database,scope){
    const dump=path.join(privateRoot,scope+'-before-'+run+'.dump');const archive=cp.execFileSync('docker',['exec','-i','cxapp-postgres','sh','-c','IFS= read -r PGPASSWORD; export PGPASSWORD; exec pg_dump -U "$1" --format=custom --no-owner --no-privileges "$2"','sh',admin.user,database],{input:admin.password+'\n',stdio:['pipe','pipe','pipe'],maxBuffer:256*1024*1024});fs.writeFileSync(dump,archive,{mode:0o600,flag:'wx'});
    docker(['exec','-i','cxapp-postgres','pg_restore','--list'],archive);const sha256=createHash('sha256').update(archive).digest('hex');await requestOffhostRecovery({service:'iilabs',kind:'postgresql',scope,database,file:dump,sha256});stage('recovery-backup','passed',{database,sha256,offHostRestoreVerified:true});
  }
  if(decision.migrateRequired){if(prior){compose(composeFile,['stop','iilabs']);await checkedBackup('app_iilabs','app');}dbTool('migrate');stage('migration','passed',{fresh:!prior});}else stage('migration','skipped');
  runner('grants',{admin});
  if(!prior){
    const recovery=path.join(privateRoot,'platform-before-'+run);fs.mkdirSync(recovery,{mode:0o700});for(const file of [platformEnvFile,platformComposeFile,path.join(platformRoot,'private/compose.env')])fs.copyFileSync(file,path.join(recovery,path.basename(file)));
    const topology=ensureApplicationNetwork(docker,'cxapp-postgres');
    const next=iilabsPlatformEnvironment(platformEnvironment,{tenantConnection,address:topology.addresses.iilabs});
    probePlatformRuntime(platformImage,next,{hostinger:true},docker);
    const routingKeys=['PLATFORM_TENANCY_MODE','PLATFORM_SINGLE_TENANT_CORPORATE_ID','PLATFORM_BROWSER_ORIGINS','PLATFORM_GATEWAY_ALLOWED_ORIGINS','PLATFORM_DOCKER_PEERS','PLATFORM_TENANT_IILABS_DATABASE_URL'];
    for(const key of routingKeys)service.environment[key]=next[key]??'';
    const mount=service.volumes.find(v=>v.type==='bind'&&v.target==='/run/codeship');if(!mount)throw Error('Existing owned Platform runtime mount required.');mount.source=runtime;
    const candidate=path.join(privateRoot,'platform-candidate-'+run+'.json');save(candidate,platformDefinition);compose(candidate,['config','--quiet']);
    const activate=async()=>{
      fs.writeFileSync(platformEnvFile,serializeDeploymentEnvironment(next),{mode:0o600});
      fs.writeFileSync(path.join(platformRoot,'private/compose.env'),rawEnvironment(next),{mode:0o600});
      save(platformComposeFile,platformDefinition);compose(platformComposeFile,['up','-d','--no-build','--wait','--wait-timeout',String(startupBudget.operationSeconds),'platform']);await requireReady(14385);
      if(readDocker('platform').Image!==platformImage)throw Error('Same-image Platform configuration changed release.');
    };
    compose(platformComposeFile,['stop','platform']);
    try{
      const result=resumeId?(await activate(),runner('tenant-status',{owner,masterURL:platformEnvironment.PLATFORM_MASTER_DATABASE_URL,settings:{PLATFORM_TENANT_IILABS_DATABASE_URL:tenantConnection}})):await withPlatformAvailability({backup:()=>checkedBackup('platform_master','master'),mutate:()=>runner('tenant',{owner,masterURL:platformEnvironment.PLATFORM_MASTER_DATABASE_URL,settings:{PLATFORM_TENANT_IILABS_DATABASE_URL:tenantConnection}}),activate,restore:async()=>{compose(platformComposeFile,['start','platform']);await requireReady(14385);}});
      environment.IILABS_PLATFORM_TENANT_ID=result.tenantId;stage('new-tenant','passed',{tenantId:result.tenantId,dataImported:false});stage('platform-configuration','passed',{sameImage:true});
    }catch(error){stage('platform-configuration','failed',{recovery});throw error;}
  }
  const temporary=docker(['create',image]);const serviceFile=path.join(privateRoot,'service-manifest.json');try{docker(['cp',temporary+':/opt/codebiz/apps/iilabs/contracts/platform-service.json',serviceFile]);}finally{docker(['rm',temporary]);}
  const profile=iilabsServiceProfile(read(serviceFile),environment,manifest);
  const registered=JSON.parse(docker(['exec','-i','platform','node','scripts/container-release.ts','prepare'],JSON.stringify(profile)));if(registered.tenantId!==environment.IILABS_PLATFORM_TENANT_ID)throw Error('Registered new tenant binding differs.');environment.IILABS_PLATFORM_SERVICE_ID=registered.serviceId;
  if(!prior)runner('owner',{owner,tenantId:registered.tenantId,masterURL:platformEnvironment.PLATFORM_MASTER_DATABASE_URL,settings:{PLATFORM_TENANT_IILABS_DATABASE_URL:tenantConnection}});
  fs.writeFileSync(envFile,serializeDeploymentEnvironment(environment),{mode:0o600});const runtimeEnv=path.join(privateRoot,'compose.env');fs.writeFileSync(runtimeEnv,rawEnvironment(iilabsRuntimeEnvironment(environment)),{mode:0o600});
  const topology=ensureApplicationNetwork(docker,'cxapp-postgres');
  const definition={name:'applications',services:{iilabs:{image,container_name:'iilabs',labels:{'io.codebiz.runtime-mode':'full-app','io.codebiz.iilabs-transition':run},init:true,restart:'unless-stopped',security_opt:['no-new-privileges:true'],cap_drop:['ALL'],env_file:[{path:runtimeEnv,format:'raw'}],environment:{NODE_ENV:'production'},command:['node','/run/codeship/start-business.mjs'],volumes:[{type:'bind',source:runtime,target:'/run/codeship',read_only:true}],healthcheck:{test:['CMD','node','-e',"fetch('http://127.0.0.1:4435/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],...startupHealth},stop_grace_period:'45s'}},networks:{backend:{external:true,name:topology.name}}};
  applyIndependentNetwork(definition.services.iilabs,'iilabs',topology);save(composeFile,definition);compose(composeFile,['config','--quiet']);
  await withIilabsFirstReplacement({recovery:publicRecovery,
    replace:()=>compose(composeFile,['up','-d','--no-build','--wait','--wait-timeout',String(startupBudget.operationSeconds),'iilabs']),
    admit:async()=>{await verify(manifest);docker(['exec','-i','platform','node','scripts/container-release.ts','complete'],JSON.stringify(profile));stage('platform-admission','passed');},
    hasBackendState:()=>fs.existsSync(stateFile),
    inspectCurrent:()=>docker(['ps','-aq','--filter','name=^/iilabs$'])?readDocker('iilabs'):undefined,
    restore:async(previous,{runtimeSha256})=>{
      const retained=path.join(publicRecoveryDirectory,'runtime');if(createHash('sha256').update(fs.readFileSync(path.join(retained,'start.mjs'))).digest('hex')!==runtimeSha256||runtimeSha256!==approvedPublicRuntimeSha256)throw Error('Retained stateless public runtime changed.');
      previous.services.iilabs.volumes[0].source=retained;
      const restoreFile=path.join(publicRecoveryDirectory,'restore-compose.json');save(restoreFile,previous);compose(restoreFile,['config','--quiet']);compose(restoreFile,['up','-d','--no-build','--pull','never','--wait','--wait-timeout','90','iilabs']);
    },
    verifyRestored:async({imageId})=>{
      const facts=readDocker('iilabs');if(facts.Image!==imageId||facts.Config.Labels?.['io.codebiz.runtime-mode']!=='public-site-only'||facts.HostConfig.ReadonlyRootfs!==true||facts.State.Health?.Status!=='healthy')throw Error('Restored public identity differs.');
      for(const route of ['/','/services/','/approach/','/studio/']){const response=await fetch('http://127.0.0.1:14435'+route,{signal:AbortSignal.timeout(10000)});await response.body?.cancel();if(response.status!==200)throw Error('Restored public page unavailable.');}
      const guarded=await fetch('http://127.0.0.1:14435/api/v1/workspace',{signal:AbortSignal.timeout(10000)});await guarded.body?.cancel();if(guarded.status!==503)throw Error('Public recovery must leave backend unavailable.');
      stage('public-recovery','passed',{backendDataRetained:true,ownershipJournalRetained:true});
    }
  });
  if(JSON.stringify(fingerprintContainers())!==JSON.stringify(baseline))throw Error('Unselected VPS container identity changed.');
  if(JSON.stringify(runner('hosts',{masterURL:platformEnvironment.PLATFORM_MASTER_DATABASE_URL}))!==JSON.stringify(oldHosts))throw Error('Existing verified Platform domains changed.');
  if(readDocker('platform').Image!==platformImage)throw Error('Existing Platform image changed.');
  const row={name:'IILabs',owner:'apps/iilabs',project:'applications',environment:'vps',host:'69.62.81.166',port:14435,version:manifest.version,username:'codexsun',notes:'Selected IILabs fresh tenant; no native data import; public iilabs.in',secrets:{env:serializeDeploymentEnvironment(environment)}};
  const payload=JSON.stringify([row]);
  execute(process.execPath,['scripts/register-devkits.ts','--environment','vps'],payload);
  docker(['exec','-i','codeship','node','scripts/register-devkits.ts','--environment','vps'],payload);
  save(stateFile,{...manifest,image:image,imageId:manifest.imageId,runtimeMode:'full-app',backendConfigured:true,migrations:current,compose:composeFile,tenantId:environment.IILABS_PLATFORM_TENANT_ID,updatedAt:new Date().toISOString()});stage('release','succeeded',{version:manifest.version,port:14435,unselectedContainersPreserved:baseline.length});
  save(path.join(root,'ownership.json'),{...read(path.join(root,'ownership.json')),status:'verified',tenantId:environment.IILABS_PLATFORM_TENANT_ID,verifiedAt:new Date().toISOString()});
  if(!prior&&fs.existsSync(path.join(publicRoot,'state.json'))){const previous=read(path.join(publicRoot,'state.json'));save(path.join(publicRoot,'state.json'),{...previous,runtimeMode:'superseded-by-full-app',backendConfigured:true,supersededBy:stateFile,updatedAt:new Date().toISOString()});}
}
main().catch(()=>{if(fs.existsSync(root))stage('release','failed');console.error('Selected IILabs installation stopped. Preserve private ownership, backup and prior image; correct locally before retrying.');process.exitCode=1;});
