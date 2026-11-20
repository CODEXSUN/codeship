import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import cp from 'node:child_process';
import {requireRecoveryChannel} from '../.container/offhost-recovery.mjs';
test('direct migration cannot bypass the local recovery operator',()=>{assert.throws(()=>requireRecoveryChannel(),/released local updater/);});
for(const mode of ['approved','rejected','disconnect'])test('recovery IPC '+mode+' completes without applying unapproved migration',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'updater-recovery-ipc-'));const file=path.join(directory,'child.mjs');
 fs.writeFileSync(file,'import {requestOffhostRecovery} from '+JSON.stringify(new URL('../.container/offhost-recovery.mjs',import.meta.url).href)+'; try{await requestOffhostRecovery({kind:"postgresql",service:"codeitz",file:"disposable",sha256:"a".repeat(64)});process.exitCode=0;}catch{process.exitCode=7;}');
 try{const child=cp.fork(file,[],{stdio:['ignore','ignore','ignore','ipc']});const timer=setTimeout(()=>child.kill(),15000);child.once('message',m=>{if(mode==='disconnect')child.disconnect();else child.send({type:'recovery-approval',id:m.id,accepted:mode==='approved',sha256:'a'.repeat(64),offHostRestoreVerified:mode==='approved'});});const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});clearTimeout(timer);assert.equal(code,mode==='approved'?0:7);}finally{fs.rmSync(directory,{recursive:true,force:true});}
});
