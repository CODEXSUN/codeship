import test from 'node:test';import assert from 'node:assert/strict';
import {iilabsTargetProfile,iilabsBackendRecipe} from '../.container/hostinger/iilabs-target-profile.mjs';
const common={platform:'linux',entry:'1',uid:0};
const production={...common,hostname:'srv914719',root:'/home/codebiz/devkit/codeship',stateRoot:'/home/codebiz/.deployment/state',target:{id:'hostinger-914719',host:'69.62.81.166',binding:'127.0.0.1',dataPolicy:'fresh',publicExposure:false,infraNetwork:'cxapp-network'}};
const staging={...common,uid:1000,user:'cx',hostname:'cxserver',root:'/srv/codebiz-staging/operators/v-1.0.39/devkit/codeship',stateRoot:'/srv/codebiz-staging/state',target:{id:'ubuntu-staging',host:'192.168.1.34',binding:'127.0.0.1',dataPolicy:'synthetic-fresh',publicExposure:false,infraNetwork:'codebiz-staging_backend'}};
test('exact production guard remains independent of staging authorization',()=>{
 const p=iilabsTargetProfile(production);assert.equal(iilabsBackendRecipe(p).realOwnerCredentialsAllowed,true);
 for(const patch of [{hostname:'cxserver'},{root:staging.root},{stateRoot:staging.stateRoot},{uid:1000},{entry:'0'}])assert.throws(()=>iilabsTargetProfile({...production,...patch}));
});
test('staging recipe uses isolated private network, fixture credentials and SSH origins',()=>{
 const recipe=iilabsBackendRecipe(iilabsTargetProfile(staging));assert.equal(recipe.realOwnerCredentialsAllowed,false);assert.equal(recipe.network,'codebiz-staging_backend');assert.deepEqual(recipe.browserOrigins,['http://127.0.0.1:14435','http://127.0.0.1:24435']);assert.equal(recipe.hostPort,14435);assert.equal(recipe.workerEnabled,false);
 for(const patch of [{hostname:'srv914719'},{stateRoot:production.stateRoot},{root:'/tmp/codeship'},{root:'/srv/codebiz-staging/operators/../escape/codeship'},{uid:1000,user:'other'},{target:{...staging.target,publicExposure:true}}])assert.throws(()=>iilabsTargetProfile({...staging,...patch}));
 assert.throws(()=>iilabsBackendRecipe({...recipe}));
});
