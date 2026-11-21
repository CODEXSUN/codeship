import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSelectedUpdateArguments,validateUpdateTicket} from '../.container/hostinger/update-policy.mjs';
import {effectiveIilabsPlatformEnvironment} from '../.container/hostinger/iilabs-platform.mjs';
const sha='a'.repeat(40),image='sha256:'+'b'.repeat(64);
function ticket(){return {schema:1,source:'github',selected:'platform',action:'update',imageOnly:true,approvedAt:new Date().toISOString(),tooling:{version:'1.0.43',tag:'v-1.0.43',commit:sha},manifest:{schema:1,owner:'apps/platform',repository:'CODEXSUN/platform',version:'1.0.20',tag:'v-1.0.20',commit:sha,image:'ghcr.io/codexsun/platform@'+image,imageId:image,archive:{name:'image.tar.gz',sha256:'c'.repeat(64)},migrations:{}},archiveUrl:'https://release-assets.githubusercontent.com/fixture'};}
test('image-only request is explicit and scoped to an existing Platform update',()=>{
 assert.equal(parseSelectedUpdateArguments('platform',['--image-only']).imageOnly,true);assert.equal(validateUpdateTicket(ticket(),'platform').imageOnly,true);
 for(const[name,args]of [['uiux',['--image-only']],['platform',['--setup','--image-only']],['platform',['--image-only','--image-only']]])assert.throws(()=>parseSelectedUpdateArguments(name,args));
 for(const patch of [{action:'setup'},{imageOnly:false},{resumeId:'12345678-1234-1234-1234-123456789abc'}])assert.throws(()=>validateUpdateTicket({...ticket(),...patch},'platform'));
});
test('image-only effective configuration keeps the installed new tenant, credentials and Compose routing',()=>{
 const installed={PLATFORM_TENANCY_MODE:'multi',PLATFORM_TENANT_IILABS_DATABASE_URL:'private-installed-tenant',PLATFORM_MASTER_DATABASE_URL:'private-installed-master',PLATFORM_GATEWAY_ALLOWED_ORIGINS:'["http://127.0.0.1:4435"]'};
 const result=effectiveIilabsPlatformEnvironment(installed,{PLATFORM_DOCKER_PEERS:'172.16.5.20,172.16.5.50',PLATFORM_BROWSER_ORIGINS:'["https://iilabs.in"]'});
 assert.equal(result.PLATFORM_TENANCY_MODE,'multi');assert.equal(result.PLATFORM_TENANT_IILABS_DATABASE_URL,installed.PLATFORM_TENANT_IILABS_DATABASE_URL);assert.equal(result.PLATFORM_MASTER_DATABASE_URL,installed.PLATFORM_MASTER_DATABASE_URL);assert.ok(result.PLATFORM_DOCKER_PEERS.includes('172.16.5.20'));
});
