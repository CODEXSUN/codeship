import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {platformTarget,installedCodeshipOrigin,platformPasswordChangeRequired} from '../.container/apps/platform-target.mjs';
import {applyIndependentNetwork,verifyIndependentContainer} from '../.container/apps/network-topology.mjs';

test('Platform publishes only 14385:4385 and rejects its superseded binding',()=>{
 assert.equal(platformPasswordChangeRequired('1.0.6'),'1');
 assert.equal(platformPasswordChangeRequired('1.0.7'),'0');
 assert.equal(platformPasswordChangeRequired('2.0.0'),'0');
 assert.throws(()=>platformPasswordChangeRequired('latest'));
 assert.deepEqual(platformTarget,{port:14385,apiPort:4385});
 const service=applyIndependentNetwork({},'platform',{addresses:{platform:'172.30.0.10'}});
 assert.deepEqual(service.ports,['127.0.0.1:14385:4385']);
 const facts={networkMode:'applications_backend',networks:{applications_backend:{IPAddress:'172.30.0.10'}},ports:{'4385/tcp':[{HostIp:'127.0.0.1',HostPort:'14385'}]}};
 verifyIndependentContainer('platform',facts);
 assert.throws(()=>verifyIndependentContainer('platform',{...facts,ports:{'4385/tcp':[{HostIp:'127.0.0.1',HostPort:'4453'}]}}));
});

test('metrics use the installed CodeShip binding during independent port changes',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'platform-port-test-')),directory=path.join(root,'.codeship','devkits'),file=path.join(directory,'compose.json');
 mkdirSync(directory,{recursive:true});
 try{
  for(const port of [4450,14350]){writeFileSync(file,JSON.stringify({services:{codeship:{ports:[`127.0.0.1:${port}:4350`]}}}));assert.equal(installedCodeshipOrigin(root),'http://127.0.0.1:'+port);}
  for(const ports of [[],['0.0.0.0:14350:4350'],['127.0.0.1:0:4350'],['127.0.0.1:14350:9999'],['127.0.0.1:14350:4350','127.0.0.1:4450:4350']]){
   writeFileSync(file,JSON.stringify({services:{codeship:{ports}}}));assert.throws(()=>installedCodeshipOrigin(root));
  }
 }finally{unlinkSync(file);rmdirSync(directory);rmdirSync(path.dirname(directory));rmdirSync(root);}
});
