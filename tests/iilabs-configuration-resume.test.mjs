import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveIilabsPlatformEnvironment,iilabsPlatformEnvironment} from '../.container/hostinger/iilabs-platform.mjs';
import {iilabsSetupResume,iilabsInstallationEnvironment,newIilabsEnvironment} from '../.container/hostinger/iilabs-policy.mjs';
test('Compose computed peers override the saved file and survive the IILabs transform',()=>{
 const saved={PLATFORM_TENANCY_MODE:'single',PLATFORM_SINGLE_TENANT_CORPORATE_ID:'codexsun',PLATFORM_MASTER_DATABASE_URL:'private-fixture'};
 const overrides={PLATFORM_DOCKER_PEERS:'172.16.4.1,172.16.5.1,172.16.5.50,172.16.5.51,172.16.5.52',PLATFORM_BROWSER_ORIGINS:JSON.stringify(['cx','codeship','codeitz','uiux'].map(n=>'https://'+n+'.codexsun.com').concat('http://127.0.0.1:14385')),PLATFORM_GATEWAY_ALLOWED_ORIGINS:'["http://codeitz:4305"]'};
 const effective=effectiveIilabsPlatformEnvironment(saved,overrides),next=iilabsPlatformEnvironment(effective,{tenantConnection:'postgresql://platform_iilabs:fixture@postgres:5432/platform_iilabs',address:'172.16.5.20'});
 for(const peer of overrides.PLATFORM_DOCKER_PEERS.split(','))assert.ok(next.PLATFORM_DOCKER_PEERS.split(',').includes(peer));
 assert.ok(next.PLATFORM_DOCKER_PEERS.endsWith('172.16.5.20'));assert.equal(next.PLATFORM_MASTER_DATABASE_URL,saved.PLATFORM_MASTER_DATABASE_URL);assert.equal(saved.PLATFORM_DOCKER_PEERS,undefined);
 assert.throws(()=>effectiveIilabsPlatformEnvironment(saved,{PLATFORM_PORT:4385}));
});
test('a recorded resume retains every private database, vault and service credential',()=>{
 const existing=newIilabsEnvironment(),next=iilabsInstallationEnvironment(existing,{resume:true});assert.deepEqual(next,existing);assert.notEqual(next,existing);
 assert.throws(()=>iilabsInstallationEnvironment(undefined,{resume:true}));assert.throws(()=>iilabsInstallationEnvironment(existing));
});
test('resume accepts only the exact recorded checked configuration failure, never a reset',()=>{
 const run='2026-11-21T06-00-07-791Z',manifest={imageId:'sha256:'+'a'.repeat(64)};
 const ownership={run,target:'hostinger-914719',status:'provisioning',imageId:manifest.imageId,tenant:'iilabs',databases:['app_iilabs','platform_iilabs']};
 const stages=['fresh-databases','migration','recovery-backup'].map(stage=>({run,stage,status:'passed',...(stage==='recovery-backup'?{database:'platform_master',sha256:'b'.repeat(64),offHostRestoreVerified:true}:{})})).concat({run,stage:'platform-configuration',status:'failed'});
 const input={run,ownership,manifest,stages};assert.equal(iilabsSetupResume(input).sha256,'b'.repeat(64));
 for(const patch of [{run:'../other'},{run:'2026-11-21T06-00-08-791Z'},{backendState:{}},{ownership:{...ownership,status:'verified'}},{stages:stages.filter(row=>row.stage!=='migration')},{stages:stages.map(row=>({...row,offHostRestoreVerified:false}))},{stages:stages.concat({run,stage:'platform-admission',status:'passed'})}])assert.throws(()=>iilabsSetupResume({...input,...patch}));
});
