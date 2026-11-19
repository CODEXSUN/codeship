import test from 'node:test';import assert from 'node:assert/strict';
import {platformIngressPeers} from '../.container/devkits/platform-ingress-peers.mjs';
const network={Name:'devkits_default',Containers:{a:{Name:'cloudflared',IPv4Address:'172.16.4.5/24'},b:{Name:'platform',IPv4Address:'172.16.4.2/24'},c:{Name:'unrelated',IPv4Address:'172.16.4.9/24'}}};
const infra={Name:'cxapp-network',Containers:{d:{Name:'cloudflared',IPv4Address:'172.18.0.10/16'}}};
test('Codeitz accepts the connector on both attached networks without trusting other endpoints',()=>{
 assert.deepEqual(platformIngressPeers(network,infra,'codeitz'),['172.16.4.5','172.16.4.2','172.18.0.10']);
 assert.deepEqual(platformIngressPeers(network,infra,'codeship'),['172.16.4.5','172.16.4.2']);
 assert.throws(()=>platformIngressPeers(network,{...infra,Containers:{}},'codeitz'));
 assert.throws(()=>platformIngressPeers({...network,Containers:{a:network.Containers.a}},infra,'uiux'));
});
