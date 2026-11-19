import test from 'node:test';
import assert from 'node:assert/strict';
import {businessTargets,businessTarget,businessServiceProfile,productionServiceToken} from '../.container/apps/business-targets.mjs';
test('managed business ports are unique and dependencies are explicit and acyclic',()=>{
 const targets=Object.values(businessTargets);assert.equal(targets.length,10);
 for(const key of ['port','apiPort','relayPort'])assert.equal(new Set(targets.map(row=>row[key])).size,targets.length);
 const visited=new Set<string>();function visit(name:string,parents:string[]=[]){assert.ok(!parents.includes(name));for(const child of businessTarget(name).dependencies)visit(child,[...parents,name]);visited.add(name);}
 for(const row of targets){visit(row.name);assert.match(row.prefix,/^[A-Z_]+$/);if(row.database)assert.match(row.database,/^app_[a-z_]+$/);assert.ok(Number.isInteger(row.port)&&row.port>0&&row.port<=65535);if(row.name==='abconnect')assert.equal(row.port,14420);}
 assert.equal(visited.size,10);for(const name of ['toString','__proto__','../platform','unknown'])assert.throws(()=>businessTarget(name));
});
test('production credentials do not reuse native service credentials and preserve independent saved settings',()=>{
 const native='a'.repeat(64),saved='b'.repeat(64),first=productionServiceToken(native,native),second=productionServiceToken(undefined,native);
 assert.match(first,/^[a-f0-9]{64}$/);assert.notEqual(first,native);assert.notEqual(first,second);
 assert.equal(productionServiceToken(saved,native),saved);assert.equal(productionServiceToken(saved,undefined),saved);
 assert.throws(()=>productionServiceToken('invalid',native));
});
test('production profiles explicitly bind database-free native manifests without widening tenant scope',()=>{
 for(const target of Object.values(businessTargets)){
  const service={appKey:target.name,environment:'development',internalOrigin:'http://127.0.0.1:9999'};
  const profile=businessServiceProfile(target,service,{token:'a'.repeat(64),version:'1.0.0',image:'ghcr.io/codexsun/'+target.name+'@sha256:'+'b'.repeat(64)});
  assert.equal(profile.manifest.tenantCorporateId,'codexsun');assert.equal(profile.manifest.environment,'production');assert.equal(profile.manifest.internalOrigin,'http://127.0.0.1:'+target.apiPort);assert.equal(service.environment,'development');
  assert.throws(()=>businessServiceProfile(target,{...service,appKey:'wrong'},profile));
  assert.throws(()=>businessServiceProfile(target,{...service,tenantCorporateId:'another-company'},profile));
 }
});
