import fs from 'node:fs';
import {parseEnv} from 'node:util';
import {operator,read,save,selectedManifest,stagingCredentials,createOwnedDatabases,connection,runImage,startService,ready} from './engine.mjs';
import {requireStagingHost,stagingRoot,addresses,ports} from './profile.mjs';
import {effectiveIilabsPlatformEnvironment} from '../hostinger/iilabs-platform.mjs';
requireStagingHost();
const action=process.argv[2];if(!['setup','update','resume'].includes(action)||process.argv.length!==3)throw Error('Select staging Platform setup, update or recorded resume.');
const manifest=selectedManifest('platform'),root=stagingRoot+'/state/platform';
const prior=fs.existsSync(root+'/state.json')?read(root+'/state.json'):undefined;
if(action==='setup'&&prior||action==='update'&&!prior||action==='resume'&&prior)throw Error('Use setup once and update thereafter; no implicit database reset.');
if(prior&&JSON.stringify(prior.migrations)!==JSON.stringify(manifest.migrations))throw Error('Pending Platform staging migrations require checked backup before promotion.');
const credentials=stagingCredentials();
const masterURL=connection('platform_service',credentials.platformPassword,'platform_master'),tenantURL=connection('platform_service',credentials.platformPassword,'platform_codexsun');
let bootstrap;
if(!prior&&action!=='resume'){
 await createOwnedDatabases('platform',['platform_master','platform_codexsun'],'platform_service',credentials.platformPassword);
 bootstrap=JSON.parse(runImage(manifest,['/run/staging/bootstrap-platform.mjs'],{environment:{CODESHIP_STAGING_BOOTSTRAP:'1',PLATFORM_BIND_MODE:'docker-direct'},dockerOptions:['--ip',addresses.platform],mounts:['type=bind,source='+operator+'/.container/staging/bootstrap-platform.mjs,target=/run/staging/bootstrap-platform.mjs,readonly'],input:JSON.stringify({masterURL,tenantURL,owner:{username:credentials.ownerUsername,email:credentials.ownerEmail,name:'Staging owner',password:credentials.ownerPassword}})}));
 if(!/^[a-z0-9]{8}$/.test(bootstrap.tenantId??'')||!/^[a-z0-9]{8}$/.test(bootstrap.ownerId??''))throw Error('Fresh staging identity output differs.');
 save(root+'/bootstrap.json',bootstrap);
}else {
 bootstrap=read(root+'/bootstrap.json');
 if(action==='resume'){
  const owned=read(stagingRoot+'/state/ownership/platform.json');
  const current=JSON.parse((await import('./engine.mjs')).docker(['inspect','platform']))[0];
  if(owned.target!=='ubuntu-staging'||owned.status!=='fresh-owned'||owned.role!=='platform_service'||JSON.stringify(owned.databases)!==JSON.stringify(['platform_master','platform_codexsun'])||current.Image!==manifest.imageId||!fs.existsSync(root+'/compose.json'))throw Error('Recorded staging Platform ownership/readiness is not resumable.');
 }
}
const origins=Object.values(ports).flatMap(([port])=>['http://127.0.0.1:'+port,'http://127.0.0.1:'+(port+10000)]);
const environment=prior?effectiveIilabsPlatformEnvironment(parseEnv(fs.readFileSync(root+'/private/runtime.env','utf8')),read(root+'/compose.json').services.platform.environment):{NODE_ENV:'production',CODESHIP_CONTAINER_MODE:'1',PLATFORM_HOST:'0.0.0.0',PLATFORM_PORT:'4385',PLATFORM_WEB_PORT:'14385',PLATFORM_WEB_ORIGIN:'http://127.0.0.1:14385',PLATFORM_MASTER_DATABASE_URL:masterURL,PLATFORM_TENANT_DATABASE_URL:tenantURL,PLATFORM_BIND_MODE:'docker-direct',PLATFORM_DOCKER_PEERS:['172.30.40.1','172.30.41.1',...Object.values(addresses)].join(','),PLATFORM_BROWSER_ORIGINS:JSON.stringify(origins),PLATFORM_GATEWAY_ENABLED:'1',PLATFORM_GATEWAY_ALLOWED_ORIGINS:JSON.stringify(['http://codeship:4350','http://codeitz:4305','http://uiux:4315','http://127.0.0.1:4435']),PLATFORM_TENANCY_MODE:'single',PLATFORM_SINGLE_TENANT_CORPORATE_ID:'codexsun',PLATFORM_ENTRY_BINDINGS:'[]',PLATFORM_DEV_AUTO_LOGIN:'0',PLATFORM_DEV_MASTER_FRESH:'0',PLATFORM_DEV_TENANT_FRESH:'0',PLATFORM_DEV_MASTER_SEED:'0',PLATFORM_DEV_TENANT_SEED:'0',PLATFORM_REQUIRE_PASSWORD_CHANGE:'0'};
const runtime=root+'/private/runtime';fs.mkdirSync(runtime,{recursive:true,mode:0o700});
for(const file of ['business-targets.mjs','runtime-network.mjs','startup-budget.mjs','start-platform.mjs'])fs.copyFileSync(operator+'/.container/apps/'+file,runtime+'/'+file);
await startService('platform',manifest,environment,{mountRuntime:runtime,command:['node','/run/codeship/start-platform.mjs']});
save(root+'/state.json',{...read(root+'/state.json'),tenantId:bootstrap.tenantId,ownerId:bootstrap.ownerId,dataPolicy:'synthetic-fresh'});
await ready('platform');console.log('Platform staging setup verified; only synthetic stage owner and required schemas created.');
