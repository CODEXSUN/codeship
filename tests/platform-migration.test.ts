import test from 'node:test';
import assert from 'node:assert/strict';
import {applyPlatformMigration,platformRecoveryScopes,assertPlatformPostgresClients} from '../.container/apps/platform-migration.mjs';

const environment={PLATFORM_MASTER_DATABASE_URL:'postgres://platform_service:disposable@postgres:5432/platform_master',PLATFORM_TENANT_DATABASE_URL:'postgres://platform_service:disposable@postgres:5432/platform_codexsun',PLATFORM_TENANT_NEW_DATABASE_URL:'postgres://platform_service:disposable@postgres:5432/platform_new'};
const marker={role:'platform_service',scopes:[{database:'platform_master',key:'PLATFORM_MASTER_DATABASE_URL'},{database:'platform_codexsun',key:'PLATFORM_TENANT_DATABASE_URL'}]};
const registrations=[{database_name:'platform_codexsun',connection_secret_ref:'env:PLATFORM_TENANT_DATABASE_URL',public_id:'tenant-one'},{database_name:'platform_new',connection_secret_ref:'env:PLATFORM_TENANT_NEW_DATABASE_URL',public_id:'tenant-new'}];
const plans=[{scope:'master'},{scope:'tenant:tenant-one'},{scope:'tenant:tenant-new'}];
const scopes=platformRecoveryScopes(plans,registrations,marker,environment);
const pending={migrateRequired:true,pending:['master:new','tenant:tenant-one:new']};

test('PostgreSQL recovery client preflight accepts matching majors with different patch versions',()=>{
 assertPlatformPostgresClients('180007','pg_dump (PostgreSQL) 18.6 (Ubuntu)','pg_restore (PostgreSQL) 18.7');
});

test('PostgreSQL recovery client preflight rejects missing or mismatched clients before migration',()=>{
 assert.throws(()=>assertPlatformPostgresClients('180007','','pg_restore (PostgreSQL) 18.6'),/recovery clients/);
 assert.throws(()=>assertPlatformPostgresClients('180007','pg_dump (PostgreSQL) 17.9','pg_restore (PostgreSQL) 18.6'),/recovery clients/);
 assert.throws(()=>assertPlatformPostgresClients('180007','pg_dump (PostgreSQL) 18.6','pg_restore (PostgreSQL) 17.9'),/recovery clients/);
 assert.throws(()=>assertPlatformPostgresClients(undefined as any,'pg_dump (PostgreSQL) 18.6','pg_restore (PostgreSQL) 18.6'),/server version/);
});

test('recovery includes current tenant added after original installation and rejects mismatched scopes',()=>{
 assert.deepEqual(scopes.map(scope=>scope.database),['platform_master','platform_codexsun','platform_new']);
 assert.throws(()=>platformRecoveryScopes(plans,registrations.slice(0,1),marker,environment),/scopes differ/);
 assert.throws(()=>platformRecoveryScopes([...plans,plans[0]],registrations,marker,environment),/scopes differ/);
 assert.throws(()=>platformRecoveryScopes(plans,registrations,marker,{...environment,PLATFORM_TENANT_NEW_DATABASE_URL:environment.PLATFORM_TENANT_DATABASE_URL}),/binding differs/);
 assert.throws(()=>platformRecoveryScopes(plans,registrations,{...marker,role:'postgres'},environment),/ownership/);
});

function fixture(overrides:Record<string,unknown>={}){
 const events:string[]=[];
 const options={decision:pending,installed:true,requireOffhost:true,scopes,requireChannel:()=>{events.push('channel');},quiesce:async()=>{events.push('stop');},
  backup:async(scope:any)=>{events.push('dump:'+scope.scope);return {file:scope.scope,sha256:scope.scope==='master'?'a'.repeat(64):'b'.repeat(64)};},
  checkBackup:async(snapshot:any)=>{events.push('check:'+snapshot.scope.scope);},
  authorizeRecovery:async(snapshot:any)=>{events.push('approve:'+snapshot.scope.scope);return {offHostRestoreVerified:true,sha256:snapshot.sha256};},
  migrate:async()=>{events.push('migrate');},...overrides};
 return {events,options};
}

test('all scoped backups and off-host restore approvals precede any Platform migration',async()=>{
 const {events,options}=fixture();await applyPlatformMigration(options);
 assert.deepEqual(events,['channel','stop',...scopes.map(scope=>'dump:'+scope.scope),...scopes.map(scope=>'check:'+scope.scope),...scopes.map(scope=>'approve:'+scope.scope),'migrate']);
});

test('missing recovery channel prevents writer stop',async()=>{
 const {events,options}=fixture({requireChannel:()=>{throw Error('channel missing');}});
 await assert.rejects(applyPlatformMigration(options),/channel missing/);assert.deepEqual(events,[]);
});

test('one failed tenant restore blocks every schema migration without restarting the writer',async()=>{
 const {events,options}=fixture({authorizeRecovery:async(snapshot:any)=>({offHostRestoreVerified:snapshot.scope.scope==='master',sha256:snapshot.sha256})});
 await assert.rejects(applyPlatformMigration(options),/proof differs/);assert.ok(events.includes('stop'));assert.ok(!events.includes('migrate'));
});

test('one unreadable scoped dump prevents off-host approval and migration',async()=>{
 const {events,options}=fixture({checkBackup:async(snapshot:any)=>{if(snapshot.scope.scope==='tenant:tenant-one')throw Error('bad dump');}});
 await assert.rejects(applyPlatformMigration(options),/bad dump/);assert.ok(!events.some(event=>event.startsWith('approve:')));assert.ok(!events.includes('migrate'));
});

test('image-only update does not request recovery, stop, back up or migrate',async()=>{
 const {events,options}=fixture({decision:{migrateRequired:false,pending:[]}});await applyPlatformMigration(options);assert.deepEqual(events,[]);
});

test('setup retains checked scoped backups without stopping a nonexistent writer or requesting update recovery',async()=>{
 const {events,options}=fixture({installed:false});await applyPlatformMigration(options);
 assert.deepEqual(events,[...scopes.map(scope=>'dump:'+scope.scope),...scopes.map(scope=>'check:'+scope.scope),'migrate']);
});
