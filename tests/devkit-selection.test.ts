import test from 'node:test';import assert from 'node:assert/strict';
import {preserveUnselected,requireSelectedRegistry} from '../.container/devkits/selection.mjs';
test('a CodeShip-only replacement preserves other owners runtime contracts and physical volumes',()=>{
 const existing={services:{codeship:{image:'old'},codeitz:{image:'approved-codeitz',ports:['127.0.0.1:14305:4305'],command:['custom-entry'],environment:{MODE:'preserved'},volumes:['workspace:/workspace']},uiux:{image:'approved-uiux'}},volumes:{workspace:{external:true,name:'existing-volume'}},networks:{default:{external:true,name:'existing-network'}}};
 const before=structuredClone(existing),next={services:{codeship:{image:'new',ports:['127.0.0.1:14350:4350']},codeitz:{image:'unselected-default'}},volumes:{},networks:{}};
 preserveUnselected(next,existing,['codeship']);
 assert.deepEqual(next.services.codeitz,before.services.codeitz);assert.deepEqual((next.services as any).uiux,before.services.uiux);assert.deepEqual(next.volumes,before.volumes);assert.deepEqual(next.networks,before.networks);assert.deepEqual(existing,before);assert.equal(next.services.codeship.image,'new');
});
test('a single-service operation refuses a group-wide or duplicated registry payload before writes',()=>{
 const own=[{owner:'devkit/codeship',port:14350}];assert.equal(requireSelectedRegistry(own,['codeship']),own);
 assert.throws(()=>requireSelectedRegistry([...own,{owner:'devkit/codeitz',port:4451}],['codeship']),/unselected/);
 assert.throws(()=>requireSelectedRegistry([own[0],own[0]],['codeship','uiux']),/unselected/);
});
