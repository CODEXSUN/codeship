import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash,randomBytes} from 'node:crypto';
import cp from 'node:child_process';
import {operator,docker,read,save,selectedManifest,stagingCredentials,connection,runImage,startService,ready} from './engine.mjs';
import {requireStagingHost,stagingRoot,addresses} from './profile.mjs';
import {newIilabsEnvironment,iilabsServiceProfile,iilabsRuntimeEnvironment,withPlatformAvailability} from '../hostinger/iilabs-policy.mjs';
import {serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';

requireStagingHost();
const action=process.argv[2];
if(!['prepare','activate','update'].includes(action)||process.argv.length!==3)throw Error('Select one explicit staging IILabs operation.');
const manifest=selectedManifest('iilabs'),platformManifest=selectedManifest('platform');
const root=stagingRoot+'/state/iilabs',privateRoot=root+'/private',ownership=root+'/ownership.json',stateFile=root+'/state.json';
const platformRoot=stagingRoot+'/state/platform',platformEnv=platformRoot+'/private/runtime.env';
const secrets=stagingCredentials();
if(secrets.target!=='ubuntu-staging'||secrets.ownerUsername!=='stageowner')throw Error('Only synthetic staging credentials are accepted.');
await ready('platform');
fs.mkdirSync(privateRoot,{recursive:true,mode:0o700});
const runtime=privateRoot+'/runtime';fs.mkdirSync(runtime,{recursive:true,mode:0o755});
for(const file of ['business-targets.mjs','business-database.mjs','runtime-network.mjs','startup-budget.mjs','start-business.mjs','start-platform.mjs'])fs.copyFileSync(operator+'/.container/apps/'+file,runtime+'/'+file);
for(const file of ['iilabs-provision.mjs','iilabs-tenant.mjs','iilabs-platform.mjs'])fs.copyFileSync(operator+'/.container/hostinger/'+file,runtime+'/'+file);
const owner={USERNAME:'codexsun',EMAIL:'iilabs@admin.com',NAME:'IILabs staging owner',PASSWORD:secrets.ownerPassword};
const admin={host:'postgres',port:5432,user:'postgres',password:secrets.postgresPassword};
const runner=(command,input)=>JSON.parse(runImage(platformManifest,['/run/codeship/iilabs-provision.mjs',command],{environment:{CODESHIP_IILABS_PROVISION:'1',CODESHIP_IILABS_STAGING:'1',PLATFORM_BIND_MODE:'docker-direct'},mounts:['type=bind,source='+runtime+',target=/run/codeship,readonly'],input:JSON.stringify(input)}));
const envFile=privateRoot+'/deployment.env';
const writeEnvironment=environment=>fs.writeFileSync(envFile,serializeDeploymentEnvironment(environment),{mode:0o600});
if(action==='prepare'){
 if(fs.existsSync(ownership)||fs.existsSync(stateFile))throw Error('Staging IILabs provisioning already started; preserve recorded state.');
 const environment=newIilabsEnvironment();environment.IILABS_BROWSER_ORIGINS=JSON.stringify(['http://127.0.0.1:14435','http://127.0.0.1:24435']);
 const tenantConnection=connection('platform_iilabs',randomBytes(32).toString('hex'),'platform_iilabs');
 writeEnvironment(environment);
 save(ownership,{target:'ubuntu-staging',status:'provisioning',imageId:manifest.imageId,tenantConnection});
 runner('databases',{admin,settings:{...environment,PLATFORM_TENANT_IILABS_DATABASE_URL:tenantConnection}});
 const dbTool=command=>runImage(manifest,['--env-file=/run/app.env','/run/codeship/business-database.mjs',command],{dockerOptions:['--user','0'],mounts:['type=bind,source='+envFile+',target=/run/app.env,readonly','type=bind,source='+runtime+',target=/run/codeship,readonly']});
 const plan=JSON.parse(dbTool('plan'));if(!Array.isArray(plan.pending))throw Error('Staging migration plan differs.');
 dbTool('migrate');runner('grants',{admin});
 const dump=cp.execFileSync('docker',['exec','-i','codebiz-staging-postgres','sh','-c','IFS= read -r PGPASSWORD; export PGPASSWORD; exec pg_dump -U postgres --format=custom --no-owner --no-privileges platform_master'],{input:secrets.postgresPassword+'\n',maxBuffer:256*1024*1024,stdio:['pipe','pipe','pipe']});
 docker(['exec','-i','codebiz-staging-postgres','pg_restore','--list'],dump);
 const file=privateRoot+'/master-before.dump';fs.writeFileSync(file,dump,{mode:0o600,flag:'wx'});
 save(root+'/backup-request.json',{target:'ubuntu-staging',service:'iilabs',database:'platform_master',file,sha256:createHash('sha256').update(dump).digest('hex')});
 save(ownership,{...read(ownership),status:'awaiting-offhost-restore'});
 console.log('IILabs staging fresh schemas prepared; master mutation awaits verified off-host restore.');
}else{
 const owned=read(ownership),prior=fs.existsSync(stateFile)?read(stateFile):undefined;
 if(owned.target!=='ubuntu-staging'||action==='activate'&&owned.imageId!==manifest.imageId)throw Error('Selected staging ownership differs.');
 if(action==='activate'&&(prior||owned.status!=='awaiting-offhost-restore'))throw Error('Use recorded first activation only once.');
 if(action==='update'&&(!prior||JSON.stringify(prior.migrations)!==JSON.stringify(manifest.migrations)))throw Error('Update requires verified prior state and no pending migrations.');
 const environment=parseEnv(fs.readFileSync(envFile,'utf8'));
 if(!prior){
  const request=read(root+'/backup-request.json'),proof=read(root+'/backup-proof.json');
  const sha256=createHash('sha256').update(fs.readFileSync(request.file)).digest('hex');
  if(proof.target!=='ubuntu-staging'||proof.sha256!==sha256||request.sha256!==sha256||proof.offHostRestoreVerified!==true)throw Error('Checked off-host backup proof is required.');
  const original=parseEnv(fs.readFileSync(platformEnv,'utf8'));
  if(original.PLATFORM_TENANCY_MODE!=='single'||original.PLATFORM_SINGLE_TENANT_CORPORATE_ID!=='codexsun'||original.PLATFORM_TENANT_IILABS_DATABASE_URL)throw Error('Unexpected existing staging tenancy.');
  const next={...original,PLATFORM_TENANCY_MODE:'multi',PLATFORM_TENANT_IILABS_DATABASE_URL:owned.tenantConnection};
  const activate=async()=>{
   fs.writeFileSync(platformEnv,serializeDeploymentEnvironment(next),{mode:0o600});
   cp.execFileSync(process.execPath,[operator+'/.container/staging/platform.mjs','update'],{stdio:['ignore','pipe','pipe']});await ready('platform');
  };
  docker(['compose','-p','applications','-f',platformRoot+'/compose.json','stop','platform']);
  const tenant=await withPlatformAvailability({backup:async()=>{},mutate:()=>runner('tenant',{owner,masterURL:original.PLATFORM_MASTER_DATABASE_URL,settings:{PLATFORM_TENANT_IILABS_DATABASE_URL:owned.tenantConnection}}),activate,restore:async()=>{docker(['compose','-p','applications','-f',platformRoot+'/compose.json','start','platform']);await ready('platform');}});
  environment.IILABS_PLATFORM_TENANT_ID=tenant.tenantId;writeEnvironment(environment);
  save(ownership,{...owned,status:'tenant-active',tenantId:tenant.tenantId});
 }
 const temporary=docker(['create',manifest.imageId]),contract=privateRoot+'/platform-service.json';
 try{docker(['cp',temporary+':/opt/codebiz/apps/iilabs/contracts/platform-service.json',contract]);}finally{docker(['rm',temporary]);}
 const profile=iilabsServiceProfile(read(contract),environment,manifest);
 const prepared=JSON.parse(docker(['exec','-i','platform','node','scripts/container-release.ts','prepare'],JSON.stringify(profile)));
 if(prepared.tenantId!==environment.IILABS_PLATFORM_TENANT_ID)throw Error('Staging fixed tenant differs.');
 environment.IILABS_PLATFORM_SERVICE_ID=prepared.serviceId;
 if(!prior)runner('owner',{owner,tenantId:prepared.tenantId,masterURL:parseEnv(fs.readFileSync(platformEnv,'utf8')).PLATFORM_MASTER_DATABASE_URL,settings:{PLATFORM_TENANT_IILABS_DATABASE_URL:owned.tenantConnection}});
 writeEnvironment(environment);
 await startService('iilabs',manifest,iilabsRuntimeEnvironment(environment),{mountRuntime:runtime,command:['node','/run/codeship/start-business.mjs'],extraEnvironment:{CODESHIP_CONTAINER_ADDRESS:addresses.iilabs.replace('172.30.40.','172.30.41.')}});
 docker(['exec','-i','platform','node','scripts/container-release.ts','complete'],JSON.stringify(profile));
 save(stateFile,{...read(stateFile),tenantId:prepared.tenantId,runtimeMode:'full-app',platformAdmission:true});
 save(ownership,{...read(ownership),status:'verified'});
 console.log('IILabs staging full backend admitted; independent synthetic tenant, no production data.');
}
