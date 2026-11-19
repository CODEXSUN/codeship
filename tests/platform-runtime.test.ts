import test from 'node:test';import assert from 'node:assert/strict';
import {securePlatformRuntime} from '../.container/apps/platform-runtime.mjs';
test('Platform Docker settings preserve identity and credentials while enforcing released production protections',()=>{
 const original={NODE_ENV:'development',PLATFORM_DEV_AUTO_LOGIN:'1',PLATFORM_DEV_MASTER_FRESH:'1',PLATFORM_DEV_TENANT_SEED:'1',PLATFORM_REQUIRE_PASSWORD_CHANGE:'0',PLATFORM_MASTER_DATABASE_URL:'synthetic-private-reference',PLATFORM_TENANT_DATABASE_URL:'synthetic-tenant-reference',TENANT_USER_PASSWORD:'synthetic-existing-password',PLATFORM_WEB_PORT:'4453'};
 const result=securePlatformRuntime(original,14385);assert.equal(result.NODE_ENV,'production');assert.equal(result.PLATFORM_GATEWAY_ENABLED,'1');assert.equal(result.PLATFORM_REQUIRE_PASSWORD_CHANGE,'1');for(const key of ['AUTO_LOGIN','MASTER_FRESH','TENANT_FRESH','MASTER_SEED','TENANT_SEED'])assert.equal(result['PLATFORM_DEV_'+key],'0');
 assert.equal(result.PLATFORM_WEB_PORT,'14385');assert.equal(result.PLATFORM_WEB_ORIGIN,'http://127.0.0.1:14385');for(const key of ['PLATFORM_MASTER_DATABASE_URL','PLATFORM_TENANT_DATABASE_URL','TENANT_USER_PASSWORD'])assert.equal(result[key],original[key]);assert.equal(original.PLATFORM_DEV_AUTO_LOGIN,'1');
 for(const port of [0,65536,NaN])assert.throws(()=>securePlatformRuntime({},port));
});
test('supporting Platform releases preserve the configured optional password policy',()=>{
 assert.equal(securePlatformRuntime({PLATFORM_REQUIRE_PASSWORD_CHANGE:'0'},14385,'1.0.6').PLATFORM_REQUIRE_PASSWORD_CHANGE,'1');
 assert.equal(securePlatformRuntime({PLATFORM_REQUIRE_PASSWORD_CHANGE:'0'},14385,'1.0.7').PLATFORM_REQUIRE_PASSWORD_CHANGE,'0');
 assert.equal(securePlatformRuntime({PLATFORM_REQUIRE_PASSWORD_CHANGE:'1'},14385,'1.0.7').PLATFORM_REQUIRE_PASSWORD_CHANGE,'1');
 assert.throws(()=>securePlatformRuntime({PLATFORM_REQUIRE_PASSWORD_CHANGE:'invalid'},14385,'1.0.7'));
});
