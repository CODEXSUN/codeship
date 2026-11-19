import test from 'node:test';
import assert from 'node:assert/strict';
import {transientDatabaseStartup} from '../.container/apps/runtime-network.mjs';
test('container startup retries recovery and transport errors but fails closed on credentials and schema',()=>{
 for(const code of ['57P03','ECONNREFUSED','ECONNRESET','ETIMEDOUT','08006'])assert.equal(transientDatabaseStartup({code}),true);
 for(const code of ['28P01','28000','3D000','42P01','42703','42501',undefined])assert.equal(transientDatabaseStartup({code}),false);
 assert.equal(transientDatabaseStartup(new Error('password rejected')),false);
});
