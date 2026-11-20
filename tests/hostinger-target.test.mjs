import test from 'node:test';import assert from 'node:assert/strict';
import {hostingerTargetPolicy} from '../.container/hostinger/target-policy.mjs';
const target={id:'hostinger-914719',host:'69.62.81.166',operator:'/home/codebiz/.deployment/operators/v-1.0.21/devkit/codeship',binding:'127.0.0.1',publicExposure:false,dataPolicy:'fresh',infraNetwork:'cxapp-network'};
const input={target,platform:'linux',hostname:'srv914719',appRoot:target.operator+'/',mode:'setup',selected:['codeship']};
test('requires selected private Hostinger identity without a deployment lock',()=>{assert.equal(hostingerTargetPolicy(input),true);for(const patch of [{hostname:'cxserver'},{platform:'win32'},{selected:['codeship','uiux']},{target:{...target,publicExposure:true}},{target:{...target,operator:'/tmp/operator'}}])assert.throws(()=>hostingerTargetPolicy({...input,...patch}));});
test('existing state cannot become a fresh installation',()=>{assert.equal(hostingerTargetPolicy({...input,prior:{}}),false);assert.equal(hostingerTargetPolicy({...input,mode:'update'}),false);});

test('clean published entry is the only additional allowed Hostinger checkout',()=>{assert.throws(()=>hostingerTargetPolicy({...input,mode:'update',appRoot:'/home/codebiz/devkit/codeship/'}));process.env.CODESHIP_RELEASED_UPDATE_ENTRY='1';try{assert.equal(hostingerTargetPolicy({...input,mode:'update',appRoot:'/home/codebiz/devkit/codeship/'}),false);assert.throws(()=>hostingerTargetPolicy({...input,mode:'update',appRoot:'/tmp/dirty'}));}finally{delete process.env.CODESHIP_RELEASED_UPDATE_ENTRY;}});
