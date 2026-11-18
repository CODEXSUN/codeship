import test from 'node:test';
import assert from 'node:assert/strict';
import {businessTargets,businessTarget} from '../.container/apps/business-targets.mjs';
test('managed business ports are unique and dependencies are explicit and acyclic',()=>{
 const targets=Object.values(businessTargets);assert.equal(targets.length,8);
 for(const key of ['port','apiPort','relayPort'])assert.equal(new Set(targets.map(row=>row[key])).size,targets.length);
 const visited=new Set<string>();function visit(name:string,parents:string[]=[]){assert.ok(!parents.includes(name));for(const child of businessTarget(name).dependencies)visit(child,[...parents,name]);visited.add(name);}
 for(const row of targets){visit(row.name);assert.match(row.prefix,/^[A-Z_]+$/);if(row.database)assert.match(row.database,/^app_[a-z_]+$/);assert.ok(row.port>4453&&row.port<4462);}
 assert.equal(visited.size,8);for(const name of ['toString','__proto__','../platform','unknown'])assert.throws(()=>businessTarget(name));
});
