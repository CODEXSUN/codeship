import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {parseSelectedUpdateArguments,validateUpdateTicket,remoteUpdateCommand} from '../.container/hostinger/update-policy.mjs';
import {product,deploymentProduct} from '../.container/product.mjs';
import {serializeDeploymentEnvironment} from '../src/api/modules/master/application/accounts.ts';
const image='sha256:'+'a'.repeat(64),commit='b'.repeat(40);
function ticket(){return {schema:1,selected:'iilabs',source:'github',action:'setup',runtimeMode:'full-app',approvedAt:new Date().toISOString(),tooling:{version:'1.0.39',tag:'v-1.0.39',commit},manifest:{schema:1,owner:'apps/iilabs',repository:'CODEXSUN/iilabs',version:'0.1.15',tag:'v-0.1.15',commit,image:'ghcr.io/codexsun/iilabs@'+image,imageId:image,archive:{name:'image.tar.gz',sha256:'c'.repeat(64)},migrations:{}},archiveUrl:'https://release-assets.githubusercontent.com/fixture',iilabsOwner:{USERNAME:'codexsun',EMAIL:'iilabs@admin.com',NAME:'Fixture owner',PASSWORD:'Only-Fixture-123'}};}
test('public mode stays default; backend state and remote command require explicit selected mode',()=>{
 assert.match(product('iilabs').state,/iilabs-public/);assert.equal(deploymentProduct('iilabs','full-app').state,'apps/iilabs/state.json');
 assert.equal(parseSelectedUpdateArguments('iilabs',['--setup','--backend']).runtimeMode,'full-app');
 assert.throws(()=>parseSelectedUpdateArguments('uiux',['--backend']));assert.throws(()=>parseSelectedUpdateArguments('iilabs',['--backend','--backend']));
 assert.match(remoteUpdateCommand(ticket().tooling,'iilabs','setup','full-app'),/setup.sh iilabs --backend --receive/);
});
test('only first full backend setup admits exact private owner input',()=>{
 const t=ticket();assert.equal(validateUpdateTicket(t,'iilabs'),t);
 for(const bad of [{...t,iilabsOwner:undefined},{...t,runtimeMode:undefined},{...t,action:'update'},{...t,iilabsOwner:{...t.iilabsOwner,USERNAME:'another'}}])assert.throws(()=>validateUpdateTicket(bad,'iilabs'));
 const update={...t,action:'update'};delete update.iilabsOwner;assert.equal(validateUpdateTicket(update,'iilabs'),update);
});
test('private owner transfer uses exact dotenv roundtrip without interpolation',()=>{
 const fields={IILABS_OWNER_PASSWORD:'Fixture-$with#marks\\and"quote',IILABS_OWNER_NAME:'Fixture owner'};
 assert.deepEqual({...parseEnv(serializeDeploymentEnvironment(fields))},fields);
});
test('IILabs resume is an explicit first-backend setup checkpoint, separate from Platform UUID recovery',()=>{
 const t={...ticket(),resumeId:'2026-11-21T06-00-07-791Z'};assert.equal(validateUpdateTicket(t,'iilabs'),t);
 assert.equal(parseSelectedUpdateArguments('iilabs',['--setup','--backend','--resume',t.resumeId]).resumeId,t.resumeId);
 for(const patch of [{action:'update'},{runtimeMode:undefined},{resumeId:'12345678-1234-1234-1234-123456789abc'},{resumeId:'../other'}])assert.throws(()=>validateUpdateTicket({...t,...patch},'iilabs'));
});
