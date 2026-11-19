import test from 'node:test';
import assert from 'node:assert/strict';
import {businessTarget} from '../.container/apps/business-targets.mjs';
import {applicationAddresses,applyIndependentNetwork,verifyIndependentContainer} from '../.container/apps/network-topology.mjs';
import {bridgePlan} from '../.container/apps/runtime-network.mjs';

test('Zetro publishes 14405 to a bound 4405 ingress while retaining its private Platform relay',()=>{
 const addresses=applicationAddresses('172.30.0.0/16');
 const topology={name:'applications_backend',subnet:'172.30.0.0/16',gateway:'172.30.0.1',addresses,peers:''};
 const target=businessTarget('zetro');
 assert.equal(target.port,14405);assert.equal(target.apiPort,4405);assert.equal(target.publishedContainerPort,4405);
 const service:any=applyIndependentNetwork({},'zetro',topology);
 assert.deepEqual(service.ports,['127.0.0.1:14405:4405']);
 assert.equal(service.environment.CODESHIP_CONTAINER_ADDRESS,addresses.zetro);
 const routes=bridgePlan('zetro',service.environment.CODESHIP_CONTAINER_ADDRESS);
 assert.ok(routes.some(r=>r.host===addresses.zetro&&r.port===4405&&r.targetHost==='127.0.0.1'&&r.targetPort===4405));
 assert.ok(routes.some(r=>r.host==='0.0.0.0'&&r.port===14405&&r.targetHost==='127.0.0.1'&&r.targetPort===4405));
 assert.ok(bridgePlan('platform',addresses.platform).some(r=>r.host==='127.0.0.1'&&r.port===4405&&r.targetHost==='zetro'&&r.targetPort===14405));
 const facts={networkMode:'applications_backend',networks:{applications_backend:{IPAddress:addresses.zetro}},ports:{'4405/tcp':[{HostIp:'127.0.0.1',HostPort:'14405'}]}};
 verifyIndependentContainer('zetro',facts);
 assert.throws(()=>verifyIndependentContainer('zetro',{...facts,ports:{'14405/tcp':[{HostIp:'127.0.0.1',HostPort:'4460'}]}}));
});
