import {test} from 'node:test';
import assert from 'node:assert/strict';
import {platformRegistration} from '../.container/apps/platform-registration.ts';
test('Platform handoff satisfies the fixed SA/admin/user registry contract before provisioning',()=>{
 const row=platformRegistration({SUPER_ADMIN_USERNAME:'owner',TENANT_ADMIN_USERNAME:'admin',TENANT_USER_USERNAME:'member',TENANT_USER_PASSWORD:'synthetic-test-password'},'1.0.3');
 assert.deepEqual(row.users?.map(user=>user.role),['sa','admin','user']);assert.equal(row.users?.[2].username,'member');assert.ok(!JSON.stringify(row.users).includes('synthetic-test-password'));
 assert.throws(()=>platformRegistration({SUPER_ADMIN_USERNAME:'a'.repeat(101)},'1.0.3'));
});
