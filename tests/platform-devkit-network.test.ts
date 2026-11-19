import test from 'node:test';import assert from 'node:assert/strict';
import {platformDevkitNetwork} from '../.container/devkits/platform-network.mjs';
const network={Name:'applications_backend',Labels:{'io.codebiz.owner':'codeship'},IPAM:{Config:[{Subnet:'172.25.0.0/16',Gateway:'172.25.0.1'}]},Containers:{}};
test('devkit endpoints share only the approved bridge and reject capacity, ownership or reservation conflicts',()=>{
 const result=platformDevkitNetwork(network);assert.equal(result.platform,'172.25.0.10');assert.equal(new Set(Object.values(result.addresses)).size,3);
 assert.throws(()=>platformDevkitNetwork({...network,Labels:{}}));assert.throws(()=>platformDevkitNetwork({...network,IPAM:{Config:[{Subnet:'172.25.0.0/27',Gateway:'172.25.0.1'}]}}));
 assert.throws(()=>platformDevkitNetwork({...network,Containers:{other:{Name:'foreign-service',IPv4Address:result.addresses.codeship+'/16'}}}));
 assert.deepEqual(platformDevkitNetwork({...network,Containers:{owned:{Name:'codeship',IPv4Address:result.addresses.codeship+'/16'}}}).addresses,result.addresses);
});
