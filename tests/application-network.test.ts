import test from 'node:test';import assert from 'node:assert/strict';import {createServer,connect,type Socket} from 'node:net';
import {applicationAddresses,applyIndependentNetwork,ensureApplicationNetwork,verifyIndependentContainer} from '../.container/apps/network-topology.mjs';
import {bridgePlan,createConnectionBridge} from '../.container/apps/runtime-network.mjs';
import {businessTargets} from '../.container/apps/business-targets.mjs';
test('every app owns its network address and published port without sharing Platform namespaces',()=>{
 const addresses=applicationAddresses('172.30.0.0/16'),topology={name:'applications_backend',subnet:'172.30.0.0/16',gateway:'172.30.0.1',addresses,peers:''};assert.equal(new Set(Object.values(addresses)).size,9);
 for(const name of ['platform',...Object.keys(businessTargets)]){
  const service:any=applyIndependentNetwork({network_mode:'service:platform',depends_on:{platform:{restart:true}}},name,topology);
  assert.equal(service.network_mode,undefined);assert.equal(service.depends_on,undefined);assert.equal(service.networks.backend.ipv4_address,addresses[name]);assert.equal(service.ports.length,1);assert.match(service.ports[0],/^127\.0\.0\.1:/);
  const routes=bridgePlan(name,addresses[name]);assert.equal(new Set(routes.map(route=>route.port)).size,routes.length);
  assert.equal(routes.filter(route=>route.host==='0.0.0.0').length,name==='platform'?0:1);
  assert.ok(routes.filter(route=>route.host!=='0.0.0.0').every(route=>route.host==='127.0.0.1'||route.host===addresses[name]));
 }
 for(const subnet of ['10.0.0.0/30','172.30.0.1/16','999.0.0.0/16','::/64'])assert.throws(()=>applicationAddresses(subnet));
});
test('verification rejects shared namespaces and ports published on another app container',()=>{
 const facts={networkMode:'applications_backend',networks:{applications_backend:{IPAddress:'172.30.0.11'}},ports:{'14345/tcp':[{HostIp:'127.0.0.1',HostPort:'4454'}]}};
 verifyIndependentContainer('core-app',facts);
 assert.throws(()=>verifyIndependentContainer('core-app',{...facts,networkMode:'container:platform'}));
 assert.throws(()=>verifyIndependentContainer('core-app',{...facts,ports:{...facts.ports,'14335/tcp':[{HostIp:'127.0.0.1',HostPort:'4455'}]}}));
 assert.throws(()=>verifyIndependentContainer('core-app',{...facts,ports:{'14345/tcp':[{HostIp:'0.0.0.0',HostPort:'4454'}]}}));
});
test('network ownership and reserved addresses fail closed; PostgreSQL attachment survives recreation',()=>{
 const id='a'.repeat(64),calls:string[][]=[];const network:any={Labels:{'io.codebiz.owner':'codeship'},IPAM:{Config:[{Subnet:'172.30.0.0/16',Gateway:'172.30.0.1'}]},Containers:{}};
 const docker=(args:string[])=>{calls.push(args);if(args[0]==='network'&&args[1]==='inspect')return JSON.stringify([network]);if(args[0]==='ps')return id;return '';};
 assert.equal(ensureApplicationNetwork(docker).addresses.platform,'172.30.0.10');assert.ok(calls.some(args=>args[1]==='connect'&&args.includes('postgres')&&args.includes(id)));
 network.Containers[id]={Name:'codebiz-infra-postgres-1',IPv4Address:'172.30.0.2/16'};calls.length=0;ensureApplicationNetwork(docker);assert.ok(!calls.some(args=>args[1]==='connect'));
 network.Containers.other={Name:'unrelated',IPv4Address:'172.30.0.11/16'};assert.throws(()=>ensureApplicationNetwork(docker),/occupied/);delete network.Containers.other;
 network.Labels={};assert.throws(()=>ensureApplicationNetwork(docker),/another owner/);
});
test('private connection bridges preserve Host, Origin, grant and binary body bytes',{timeout:10000},async()=>{
 const echo=createServer(socket=>socket.pipe(socket)),sockets=new Set<Socket>();await new Promise<void>(resolve=>echo.listen(0,'127.0.0.1',resolve));
 const bridge=createConnectionBridge({targetHost:'127.0.0.1',targetPort:(echo.address() as any).port},sockets);await new Promise<void>(resolve=>bridge.listen(0,'127.0.0.1',resolve));
 const payload=Buffer.concat([Buffer.from('POST /api/v1/upload HTTP/1.1\r\nHost: 127.0.0.1:4457\r\nOrigin: http://127.0.0.1:4457\r\nx-platform-grant: fixture\r\nContent-Length: 3\r\n\r\n'),Buffer.from([0,128,255])]);
 const client=connect({host:'127.0.0.1',port:(bridge.address() as any).port});
 try{const received=await new Promise<Buffer>((resolve,reject)=>{let bytes=Buffer.alloc(0);client.on('error',reject);client.on('data',chunk=>{bytes=Buffer.concat([bytes,chunk]);if(bytes.length>=payload.length)resolve(bytes);});client.on('connect',()=>client.write(payload));});assert.deepEqual(received,payload);}
 finally{client.destroy();for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>bridge.close(()=>resolve()));await new Promise<void>(resolve=>echo.close(()=>resolve()));}
});
