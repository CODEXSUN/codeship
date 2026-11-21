import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStagingProfile,stagingTarget,addresses,ports} from '../.container/staging/profile.mjs';
const identity={platform:'linux',hostname:'cxserver',uid:1000,username:'cx',target:stagingTarget};
test('staging admission is separate from production and refuses changed host, account and exposure',()=>{
 assert.equal(validateStagingProfile(identity),stagingTarget);
 for(const patch of [{hostname:'srv914719'},{platform:'win32'},{uid:0},{username:'root'},{target:{...stagingTarget,root:'/home/codebiz'}},{target:{...stagingTarget,publicExposure:true}},{target:{...stagingTarget,binding:'0.0.0.0'}},{target:{...stagingTarget,dataPolicy:'import-production'}}])assert.throws(()=>validateStagingProfile({...identity,...patch}));
});
test('five private application origins and endpoints are independent and avoid Windows live ports via tunnels',()=>{
 assert.equal(new Set(Object.values(addresses)).size,6);
 assert.equal(new Set(Object.values(ports).map(p=>p[0])).size,5);
 for(const [host,internal]of Object.values(ports))assert.equal(host,Number('1'+internal));
 assert.deepEqual(ports.iilabs,[14435,4435]);assert.equal(ports.codeitz[0]+10000,24305);
});
