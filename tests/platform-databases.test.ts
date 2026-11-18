import {test} from 'node:test';
import assert from 'node:assert/strict';
import {platformDatabaseScopes} from '../.container/apps/platform-databases.mjs';
const env={PLATFORM_MASTER_DATABASE_URL:'postgresql://test@127.0.0.1:5432/cx_master_db',PLATFORM_TENANT_DATABASE_URL:'postgresql://test@127.0.0.1:5432/codexsun_db'};
const registrations=[{database_name:'codexsun_db',connection_secret_ref:'env:PLATFORM_TENANT_DATABASE_URL'}];
test('Platform installs use stable isolated names and preserve native source identities',()=>{
 const scopes=platformDatabaseScopes(env,registrations);assert.deepEqual(scopes.map(scope=>scope.name),['platform_master','platform_codexsun']);assert.deepEqual(scopes.map(scope=>scope.sourceName),['cx_master_db','codexsun_db']);assert.equal(scopes[1].source,env.PLATFORM_TENANT_DATABASE_URL);
});
test('ambiguous mappings, remote imports and mismatched database scopes fail before provisioning',()=>{
 assert.throws(()=>platformDatabaseScopes({...env,PLATFORM_MASTER_DATABASE_URL:'postgres://test@remote.invalid/cx_master_db'},registrations));
 assert.throws(()=>platformDatabaseScopes(env,[...registrations,...registrations]));
 assert.throws(()=>platformDatabaseScopes(env,[{...registrations[0],database_name:'other_db'}]));
});
