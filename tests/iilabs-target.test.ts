import test from 'node:test';
import assert from 'node:assert/strict';
import {requireIilabsUbuntuTarget} from '../.container/apps/iilabs-target.mjs';
test('IILabs fresh target refuses Windows, another host, import policy or public binding before provisioning',()=>{
 const target={id:'ubuntu-lan',host:'192.168.1.34',hostname:'cxserver',root:'/srv/codebiz',operator:'/srv/codebiz/operators/v-1.0.21/devkit/codeship',state:'/srv/codebiz/state',lock:'/srv/codebiz/state/devkits/operation.lock',dataPolicy:'fresh',binding:'127.0.0.1',publicExposure:false};
 const facts={platform:'linux',hostname:'cxserver',appRoot:target.operator,stateRoot:target.state};
 requireIilabsUbuntuTarget(target,facts);
 for(const changed of [{platform:'win32'},{hostname:'SUNDAR'},{appRoot:'/tmp/untrusted'},{stateRoot:'/tmp/state'}])assert.throws(()=>requireIilabsUbuntuTarget(target,{...facts,...changed}));
 for(const changed of [{host:'192.168.1.35'},{dataPolicy:'import'},{binding:'0.0.0.0'},{publicExposure:true},{lock:'/tmp/other.lock'}])assert.throws(()=>requireIilabsUbuntuTarget({...target,...changed},facts));
});
