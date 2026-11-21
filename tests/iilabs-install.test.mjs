import test from 'node:test';
import assert from 'node:assert/strict';
import {requireIilabsTarget,newIilabsEnvironment,iilabsServiceProfile,iilabsRuntimeEnvironment,withPlatformAvailability,iilabsPublicTransition} from '../.container/hostinger/iilabs-policy.mjs';
import {provisionIilabsDatabases,grantIilabsTables} from '../.container/hostinger/iilabs-provision.mjs';
import {migrationDecision} from '../.container/policy.mjs';
test('selected target refuses local, wrong host and unreviewed invocation',()=>{
 const good={platform:'linux',hostname:'srv914719',uid:0,root:'/home/codebiz/devkit/codeship',entry:'1',target:{id:'hostinger-914719',host:'69.62.81.166',binding:'127.0.0.1',dataPolicy:'fresh',infraNetwork:'cxapp-network'}};requireIilabsTarget(good);
 for(const change of [{platform:'win32'},{hostname:'other'},{entry:'0'},{uid:1000},{root:'/tmp/operator'},{target:{...good.target,dataPolicy:'copy'}}])assert.throws(()=>requireIilabsTarget({...good,...change}));
});
test('fresh credentials are independent and runtime never gets owner, admin or migration secrets',()=>{
 const one=newIilabsEnvironment(),two=newIilabsEnvironment();assert.notEqual(one.IILABS_VAULT_KEY,two.IILABS_VAULT_KEY);assert.notEqual(one.IILABS_DATABASE_URL,two.IILABS_DATABASE_URL);assert.notEqual(new URL(one.IILABS_DATABASE_URL).password,new URL(one.IILABS_MIGRATION_DATABASE_URL).password);
 assert.throws(()=>iilabsRuntimeEnvironment(one));const runtime=iilabsRuntimeEnvironment({...one,IILABS_PLATFORM_SERVICE_ID:'service1',IILABS_PLATFORM_TENANT_ID:'tenant01',IILABS_OWNER_PASSWORD:'private',PLATFORM_MASTER_DATABASE_URL:'private',POSTGRES_PASSWORD:'private'});
 assert(!Object.keys(runtime).some(key=>/MIGRATION|OWNER|MASTER|POSTGRES/.test(key)));assert.equal(runtime.IILABS_DEMO_MODE,'0');assert.equal(runtime.IILABS_SYNC_ENABLED,'0');
});
test('service binds only the new IILabs tenant and verified app identity',()=>{
 const manifest={version:'0.1.15',imageId:'sha256:'+'a'.repeat(64),image:'ghcr.io/codexsun/iilabs@sha256:'+'a'.repeat(64)};const service={appKey:'iilabs',tenantCorporateId:'codexsun',permissionKeys:['iilabs/agency:manage','iilabs/workspace:read']};const profile=iilabsServiceProfile(service,newIilabsEnvironment(),manifest);assert.equal(profile.manifest.tenantCorporateId,'iilabs');assert.equal(profile.manifest.internalOrigin,'http://127.0.0.1:4435');assert.equal(service.tenantCorporateId,'codexsun');assert.throws(()=>iilabsServiceProfile({...service,appKey:'other'},newIilabsEnvironment(),manifest));
});
test('all database collisions are checked before creating any role or database',async()=>{
 const env=newIilabsEnvironment();env.PLATFORM_TENANT_IILABS_DATABASE_URL='postgresql://platform_iilabs:private@postgres:5432/platform_iilabs';const seen=[];const admin={query:async(sql,args)=>{seen.push(sql);return {rowCount:args?.[0]==='platform_iilabs'?1:0,rows:[]};}};await assert.rejects(()=>provisionIilabsDatabases(admin,env));assert(seen.every(sql=>sql.startsWith('SELECT')));
});
test('runtime grants cover every required app table and exclude history/schema mutation',async()=>{
 const seen=[];await grantIilabsTables({query:async sql=>{seen.push(sql);return {rows:[{name:'exists',schema_create:false,history_delete:false,image_sequence:true,privileged:false}]};}});assert.equal(seen.filter(sql=>sql.startsWith('GRANT SELECT,INSERT,UPDATE,DELETE')).length,11);assert(!seen.some(sql=>/GRANT.*(?:CREATE|UPDATE).*kysely_migration/.test(sql)));assert(seen.some(sql=>sql.includes('GRANT SELECT ON kysely_migration')));
});
test('unchanged image update skips migrations and changed applied migrations are refused',()=>{
 assert.deepEqual(migrationDecision({applied:['001'],pending:[]},{'001':'a'},{'001':'a'}),{pending:[],backupRequired:false,migrateRequired:false});assert.throws(()=>migrationDecision({applied:['001'],pending:[]},{'001':'a'},{'001':'b'}));
});
test('failed tenant mutation restarts prevalidated multi configuration, backup failure restores original',async()=>{
 for(const step of ['backup','mutate']){const seen=[];await assert.rejects(()=>withPlatformAvailability({backup:async()=>{seen.push('backup');if(step==='backup')throw Error('forced');},mutate:async()=>{seen.push('mutate');throw Error('forced');},activate:async()=>seen.push('multi'),restore:async()=>seen.push('original')}),/forced/);assert.deepEqual(seen,step==='backup'?['backup','original']:['backup','mutate','multi']);}
});
test('public-to-full adoption requires matching immutable state and an owned healthy private frontend',()=>{
 const manifest={imageId:'sha256:'+'a'.repeat(64),commit:'b'.repeat(40),version:'0.1.15'};
 const publicState={...manifest,runtimeMode:'public-site-only',backendConfigured:false};
 const container={Image:manifest.imageId,Config:{Labels:{'io.codebiz.runtime-mode':'public-site-only','com.docker.compose.project':'applications','com.docker.compose.service':'iilabs'}},State:{Health:{Status:'healthy'}},HostConfig:{ReadonlyRootfs:true,PortBindings:{'4435/tcp':[{HostIp:'127.0.0.1',HostPort:'14435'}]}}};
 assert.equal(iilabsPublicTransition({manifest,publicState,container}).mode,'public-to-full');assert.equal(iilabsPublicTransition({manifest}).mode,'fresh');
 for(const patch of [{publicState:undefined},{container:undefined},{publicState:{...publicState,commit:'c'.repeat(40)}},{container:{...container,HostConfig:{...container.HostConfig,ReadonlyRootfs:false}}}])assert.throws(()=>iilabsPublicTransition({manifest,publicState,container,...patch}));
});
