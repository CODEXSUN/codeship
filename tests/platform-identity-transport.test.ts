import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import cp from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {parseSelectedUpdateArguments,validateIdentityPreservation,validateUpdateTicket} from '../.container/hostinger/update-policy.mjs';
import {validateRetirementRecoveryRequest,validateRetirementRecoveryProof,platformRetirementImage,platformRestoredIdentitySnapshotCode} from '../.container/hostinger/platform-retirement-recovery.mjs';
const sha='a'.repeat(64),commit='b'.repeat(40),manifest={schema:1,owner:'apps/platform',repository:'CODEXSUN/platform',version:'1.0.16',tag:'v-1.0.16',commit,imageId:platformRetirementImage,image:'ghcr.io/codexsun/platform@'+platformRetirementImage,archive:{name:'image.tar.gz',sha256:sha},migrations:{}};
const metadata=()=>({schema:1,source:'existing-native-tenant',rows:['aaaaaaa1','aaaaaaa2','aaaaaaa3'].map(public_id=>({public_id,source_digest:sha}))});
const envelope=()=>{const historicalMetadata=metadata();return {historicalMetadata,historicalMetadataSha256:createHash('sha256').update(JSON.stringify(historicalMetadata)).digest('hex')};};
const request=()=>({service:'platform',kind:'postgresql',scope:'master',database:'platform_master',requireIdentityRetirementProof:true,candidateImageId:platformRetirementImage,sha256:sha});
const attestation=()=>({legacyDigest:sha,legacyCounts:{users:3,user_credentials:3,sessions:0,tenant_memberships:3,platform_operators:1}});
const ticket=()=>({schema:1,source:'github',selected:'platform',action:'update',approvedAt:new Date().toISOString(),tooling:{version:'1.0.31',tag:'v-1.0.31',commit},manifest,archiveUrl:'https://release-assets.githubusercontent.com/disposable',preserveIdentity:envelope()});
test('preservation requires explicit Platform update and checked bounded metadata provenance',()=>{
 assert.equal(parseSelectedUpdateArguments('platform',['--preserve-identity','metadata.json']).preserveIdentityFile,'metadata.json');
 for(const [name,args]of [['platform',['--setup','--preserve-identity','m.json']],['codeitz',['--preserve-identity','m.json']],['platform',['--resume','id','--preserve-identity','m.json']],['platform',['--tag','v-1.0.13','--recover-prior','p.json','--preserve-identity','m.json']],['platform',['--receive','--preserve-identity','m.json']]] as const)assert.throws(()=>parseSelectedUpdateArguments(name,[...args]),/preservation|Remote action/);
 assert.equal(validateIdentityPreservation(envelope()).historicalMetadata.rows.length,3);
 assert.throws(()=>validateIdentityPreservation({...envelope(),historicalMetadataSha256:'c'.repeat(64)}),/provenance/);
 assert.throws(()=>validateIdentityPreservation({...envelope(),password:'forbidden'}),/envelope/);
 assert.equal(validateUpdateTicket(ticket(),'platform').manifest.version,'1.0.16');
 for(const t of [{...ticket(),action:'setup'},{...ticket(),resumeId:'12345678-1234-1234-1234-123456789abc'},{...ticket(),priorRecovery:{}},{...ticket(),manifest:{...manifest,version:'1.0.17'}}])assert.throws(()=>validateUpdateTicket(t,'platform'),/preservation/);
});
test('attestation is restricted to exact approved immutable Platform16 master restore',()=>{
 assert.equal(validateRetirementRecoveryRequest(request(),manifest),true);
 for(const r of [{...request(),service:'codeitz'},{...request(),kind:'sqlite'},{...request(),scope:'tenant:6qkkz9k8'},{...request(),database:'other'},{...request(),candidateImageId:'sha256:'+'c'.repeat(64)}])assert.throws(()=>validateRetirementRecoveryRequest(r,manifest),/Platform16 master/);
 assert.throws(()=>validateRetirementRecoveryRequest(request(),{...manifest,version:'1.0.17'}),/Platform16 master/);
 assert.throws(()=>validateRetirementRecoveryRequest({candidateImageId:platformRetirementImage},manifest),/Unrequested/);
 assert.equal(validateRetirementRecoveryRequest({},undefined),false);
});
test('only complete official digest plus exactly five nonnegative table counts passes',()=>{
 assert.equal(validateRetirementRecoveryProof(request(),attestation()).legacyCounts.users,3);
 for(const p of [{},{...attestation(),legacyDigest:'bad'},{...attestation(),legacyCounts:{users:3}},{...attestation(),legacyCounts:{...attestation().legacyCounts,users:-1}},{...attestation(),legacyCounts:{...attestation().legacyCounts,other:0}}])assert.throws(()=>validateRetirementRecoveryProof(request(),p),/attestation/);
 assert.throws(()=>validateRetirementRecoveryProof({},attestation()),/Unrequested/);
 assert.match(platformRestoredIdentitySnapshotCode,/legacyIdentitySnapshot/);assert.match(platformRestoredIdentitySnapshotCode,/SET TRANSACTION READ ONLY/);assert.doesNotMatch(platformRestoredIdentitySnapshotCode,/INSERT INTO|UPDATE public|migrateToLatest/);
});
for(const mode of ['valid','missing','invalid','wrong-sha'])test('retirement recovery IPC '+mode+' fails closed before migration',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'retirement-ipc-')),file=path.join(directory,'child.mjs');
 fs.writeFileSync(file,'import {requestOffhostRecovery} from '+JSON.stringify(new URL('../.container/offhost-recovery.mjs',import.meta.url).href)+';try{await requestOffhostRecovery('+JSON.stringify({...request(),file:'disposable'})+');process.exitCode=0;}catch{process.exitCode=7;}');
 try{const child=cp.fork(file,[],{stdio:['ignore','ignore','ignore','ipc']}),timer=setTimeout(()=>child.kill(),10000);child.once('message',m=>child.send({type:'recovery-approval',id:m.id,accepted:true,sha256:mode==='wrong-sha'?'c'.repeat(64):sha,offHostRestoreVerified:true,...(mode==='missing'?{}:mode==='invalid'?{legacyDigest:'invalid',legacyCounts:{}}:attestation())}));const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});clearTimeout(timer);assert.equal(code,mode==='valid'?0:7);}finally{fs.rmSync(directory,{recursive:true,force:true});}
});
