import test from'node:test';import assert from'node:assert/strict';
import{crmImportUrl,crmTablePrivileges}from'../.container/apps/crm-database.ts';
import{businessTarget}from'../.container/apps/business-targets.mjs';
test('CRM ingress uses the requested separate loopback binding',()=>{const target=businessTarget('crm');assert.equal(target.port,14355);assert.equal(target.publishedContainerPort,4355);assert.equal(target.relayPort,14355);});
test('CRM copy accepts only the explicit native legacy host and never grants broad schema authority',()=>{
 assert.equal(crmImportUrl('mysql://test@127.0.0.1:3306/native').hostname,'127.0.0.1');
 for(const url of ['mysql://test@example.com:3306/native','postgres://test@127.0.0.1:3306/native','mysql://test@127.0.0.1:3307/native'])assert.throws(()=>crmImportUrl(url));
 assert.equal(crmTablePrivileges('app_users'),'select');assert.equal(crmTablePrivileges('core_contact_types'),'select');assert.equal(crmTablePrivileges('crm_enquiry_sync_events'),'select');
 assert.equal(crmTablePrivileges('core_contacts'),'select, insert, update');assert.equal(crmTablePrivileges('core_contacts_phones'),'select, insert, update, delete');assert.equal(crmTablePrivileges('crm_enquiry_activity'),'select, insert');
});
