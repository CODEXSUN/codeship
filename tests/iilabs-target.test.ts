import test from 'node:test';
import assert from 'node:assert/strict';
import {requireIilabsLocalDockerTarget} from '../.container/apps/iilabs-target.mjs';
test('IILabs accepts canonical Windows Docker and refuses Ubuntu, foreign state and remote engines',()=>{
 const facts={platform:'win32',appRoot:'D:/workspace/codebiz/devkit/codeship/.codeship/operators/iilabs-local-v0.1.4',stateRoot:'D:/workspace/codebiz/devkit/codeship/.codeship',dockerContext:'desktop-linux',dockerEndpoint:'npipe:////./pipe/dockerDesktopLinuxEngine'};
 requireIilabsLocalDockerTarget(facts);
 requireIilabsLocalDockerTarget({...facts,appRoot:'D:/workspace/codebiz/devkit/codeship/'});
 for(const changed of [{platform:'linux'},{appRoot:'/srv/codebiz/operators/v-1.0.21/devkit/codeship'},{stateRoot:'D:/other/state'},{dockerContext:'remote'},{dockerEndpoint:'ssh://cx@192.168.1.34'}])assert.throws(()=>requireIilabsLocalDockerTarget({...facts,...changed}));
});
