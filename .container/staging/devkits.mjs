import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {operator,docker,read,save,selectedManifest,stagingCredentials,createOwnedDatabases,privateEnvironment,runImage,ready,startService} from './engine.mjs';
import {requireStagingHost,stagingRoot,ports,addresses} from './profile.mjs';
import {devkitAdmissionProfile} from '../devkits/platform-admission.mjs';
import {serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
requireStagingHost();
const [action,name]=process.argv.slice(2);if(!['setup','update'].includes(action)||!['codeship','codeitz','uiux'].includes(name)||process.argv.length!==4)throw Error('Select one staging devkit setup/update.');
const manifest=selectedManifest(name),root=stagingRoot+'/state/'+name,stateFile=root+'/state.json';
const prior=fs.existsSync(stateFile)?read(stateFile):undefined;
if(action==='setup'&&prior||action==='update'&&!prior)throw Error('Use setup once and update thereafter; no implicit reset.');
await ready('platform');
const boot=read(stagingRoot+'/state/platform/bootstrap.json');if(!/^[a-z0-9]{8}$/.test(boot.tenantId??'')||!/^[a-z0-9]{8}$/.test(boot.ownerId??''))throw Error('Synthetic staging Platform owner is not ready.');
fs.mkdirSync(root+'/private',{recursive:true,mode:0o700});const secretFile=root+'/private/service.json';
const secret=fs.existsSync(secretFile)?read(secretFile):{token:randomBytes(32).toString('hex')};if(!fs.existsSync(secretFile))save(secretFile,secret);
if(!/^[a-f0-9]{64}$/.test(secret.token))throw Error('Staging service credential differs.');
const prefix=name.toUpperCase(),hostPort=ports[name][0],tunnel=hostPort+10000;
let env={NODE_ENV:'production',[prefix+'_HOST']:'0.0.0.0',[prefix+'_PORT']:String(ports[name][1]),[prefix+'_BIND_MODE']:'docker-direct',[prefix+'_DOCKER_PEERS']:[addresses.platform,'172.30.40.1','172.30.41.1'].join(','),[prefix+'_PLATFORM_AUTH']:'1',[prefix+'_PLATFORM_TRANSPORT']:'docker-network',[prefix+'_PLATFORM_ORIGIN']:'http://platform:4385',[prefix+'_BROWSER_ORIGINS']:JSON.stringify(['http://127.0.0.1:'+hostPort,'http://127.0.0.1:'+tunnel]),[prefix+'_PLATFORM_SERVICE_TOKEN']:secret.token};
if(name==='codeitz')env.CODEITZ_PLATFORM_TENANT_ID=boot.tenantId;
const release={...manifest,releaseImage:manifest.image};const profile=devkitAdmissionProfile(name,release,env);
const admission=fs.readFileSync(operator+'/.container/devkits/platform-admission.ts','utf8');
const admit=action=>JSON.parse(docker(['exec','-i','--workdir','/opt/codebiz/apps/platform/scripts','platform','node','--input-type=module-typescript','-e',admission],JSON.stringify({action,profile,approvedSuperAdministrators:action==='complete'?[boot.ownerId]:[]})));
const prepared=admit('prepare');env[prefix+'_PLATFORM_SERVICE_ID']=prepared.serviceId;
if(prepared.tenantId!==boot.tenantId)throw Error('Staging service tenant identity differs.');
const volumes=[];let command;
function volume(suffix,target){
 const source='codebiz-staging_'+suffix;
 let present;try{present=JSON.parse(docker(['volume','inspect',source]))[0];}catch{}
 if(!present){docker(['volume','create','--label','io.codebiz.target=ubuntu-staging',source]);present=JSON.parse(docker(['volume','inspect',source]))[0];}
 if(present.Labels?.['io.codebiz.target']!=='ubuntu-staging')throw Error('Staging volume ownership differs.');
 volumes.push({type:'volume',source,target});return source;
}
function initializeVolumes(){
 const mounts=volumes.filter(v=>v.type==='volume').flatMap(v=>['--mount','type=volume,source='+v.source+',target='+v.target]);
 const directories=volumes.filter(v=>v.type==='volume').map(v=>v.target);
 docker(['run','--rm','--user','0','--network','none',...mounts,'--entrypoint','node',manifest.imageId,'-e',"const f=require('fs');for(const p of "+JSON.stringify(directories)+"){f.mkdirSync(p,{recursive:true});f.chownSync(p,1000,1000);}"]);
}
const migrationsChanged=prior&&JSON.stringify(prior.migrations)!==JSON.stringify(manifest.migrations);
if(migrationsChanged)throw Error('Pending staging devkit migrations require a checked scoped backup adapter before replacement.');
if(name==='codeship'){
 volume('codeship_data','/data');volume('codeship_keys','/keys');initializeVolumes();
 env={...env,CODESHIP_SQLITE_FILE:'/data/codeship.sqlite',CODESHIP_VAULT_KEY_FILE:'/keys/vault.key',CODESHIP_EXECUTION_MODE:'inventory',CODESHIP_DEPLOYMENT_PROJECT:'devkits',CODESHIP_METRICS_FILE:'/metrics/snapshot.json'};
 fs.mkdirSync(stagingRoot+'/state/metrics',{recursive:true,mode:0o755});volumes.push({type:'bind',source:stagingRoot+'/state/metrics',target:'/metrics',read_only:true});
 volumes.push({type:'bind',source:operator+'/.container/targets.empty.json',target:'/opt/codebiz/devkit/codeship/.codeship/targets.json',read_only:true});
 const mounts=volumes.filter(v=>v.type==='volume').map(v=>'type=volume,source='+v.source+',target='+v.target);
 const fixed={CODESHIP_SQLITE_FILE:'/data/codeship.sqlite',CODESHIP_VAULT_KEY_FILE:'/keys/vault.key',NODE_ENV:'production'};
 if(!prior){runImage(manifest,['scripts/database.ts','migrate'],{environment:fixed,mounts});runImage(manifest,['scripts/initialize-vault.ts'],{environment:fixed,mounts});}
 const runtime=serializeDeploymentEnvironment(Object.fromEntries(Object.entries(env).filter(([key])=>key.startsWith('CODESHIP_PLATFORM_')||key==='CODESHIP_BROWSER_ORIGINS')));
 runImage(manifest,['-e',"let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>require('fs').writeFileSync('/data/runtime.env',s,{mode:0o600}));"],{environment:fixed,mounts,input:runtime});
}else if(name==='codeitz'){
 const credentials=stagingCredentials();
 env={...env,PGHOST:'postgres',PGPORT:'5432',PGDATABASE:'codeitz',PGUSER:'codeitz',PGPASSWORD:credentials.codeitzPassword,PGSSLMODE:'disable',CODEITZ_PG_TRANSPORT:'docker-network',CODEITZ_WORKSPACE_ROOT:'/workspace'};
 if(!prior)await createOwnedDatabases('codeitz',['codeitz'],'codeitz',credentials.codeitzPassword);
 const directory=privateEnvironment(name,env);
 const mounts=['type=bind,source='+directory+'/runtime.env,target=/run/staging.env,readonly'];
 if(!prior){runImage(manifest,['--env-file=/run/staging.env','scripts/database.ts'],{mounts});runImage(manifest,['--env-file=/run/staging.env','scripts/codeship-fresh.ts'],{mounts:[...mounts,'type=bind,source='+operator+'/.container/devkits/codeitz-fresh.ts,target=/opt/codebiz/devkit/codeitz/scripts/codeship-fresh.ts,readonly']});}
 volume('codeitz_workspace','/workspace');volume('codeitz_state','/opt/codebiz/devkit/codeitz/.codeitz');volume('codeitz_codex','/home/node/.codex');initializeVolumes();
 volumes.push({type:'bind',source:operator+'/.container/devkits/codeitz-start.ts',target:'/opt/codebiz/devkit/codeitz/scripts/codeship-start.ts',read_only:true});command=['node','scripts/codeship-start.ts'];
}
await startService(name,manifest,env,{volumes,command});admit('complete');
const state=read(stateFile);save(stateFile,{...state,tenantId:boot.tenantId,serviceId:prepared.serviceId,platformAdmission:true,databaseMigrations:prior?'skipped-no-pending':'fresh-only'});
console.log(name+': synthetic stage owner admitted; no production identities, workspace or credentials imported.');
