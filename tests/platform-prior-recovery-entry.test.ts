import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePriorRecoveryProof,parseSelectedUpdateArguments,validateUpdateTicket} from '../.container/hostinger/update-policy.mjs';
const sha='a'.repeat(64),image='sha256:'+sha;
const baseline=(scope:string,database:string)=>({scope,database,backupSha256:sha,schemaSha256:sha,dataSha256:sha,legacyIdentitySha256:sha,offHostRestoreVerified:true});
const proof=()=>({schema:1,failedRun:'2026-11-20T07-21-21-112Z',baseline:[baseline('master','platform_master'),baseline('tenant:6qkkz9k8','platform_codexsun')]});
const ticket=()=>({schema:1,source:'github',selected:'platform',action:'update',approvedAt:new Date().toISOString(),tooling:{version:'1.0.30',tag:'v-1.0.30',commit:'b'.repeat(40)},manifest:{schema:1,owner:'apps/platform',repository:'CODEXSUN/platform',version:'1.0.13',tag:'v-1.0.13',commit:'c'.repeat(40),image:'ghcr.io/codexsun/platform@'+image,imageId:image,archive:{name:'image.tar.gz',sha256:sha},migrations:{}},archiveUrl:'https://release-assets.githubusercontent.com/disposable',priorRecovery:proof()});
test('prior recovery needs an explicit prior approved release and only Platform update',()=>{
 assert.deepEqual(parseSelectedUpdateArguments('platform',['--tag','v-1.0.13','--recover-prior','proof.json','--check']),{action:'update',releaseTag:'v-1.0.13',priorRecoveryFile:'proof.json',resumeId:undefined,mode:'--check',id:undefined});
 for(const [name,args]of [['platform',['--recover-prior','proof.json']],['codeitz',['--tag','v-1.0.13','--recover-prior','proof.json']],['platform',['--setup','--tag','v-1.0.13','--recover-prior','proof.json']],['platform',['--resume','id','--tag','v-1.0.13','--recover-prior','proof.json']],['platform',['--tag','v-1.0.13','--recover-prior','proof.json','--receive']]] as const)assert.throws(()=>parseSelectedUpdateArguments(name,[...args]),/Prior recovery|Remote action/);
 assert.throws(()=>parseSelectedUpdateArguments('platform',['--tag','v-1.0.13','--tag','v-1.0.16']),/Invalid/);
});
test('prior proof admits only unique bounded complete restore-tested digest records',()=>{
 assert.equal(validatePriorRecoveryProof(proof()).schema,1);
 for(const bad of [{...proof(),schema:2},{...proof(),failedRun:'../../x'},{...proof(),baseline:[baseline('master','platform_master')]},{...proof(),baseline:[baseline('master','same'),baseline('tenant:6qkkz9k8','same')]},{...proof(),baseline:[baseline('master','platform_master'),{...baseline('tenant:6qkkz9k8','platform_codexsun'),offHostRestoreVerified:false}]},{...proof(),password:'secret'},{...proof(),baseline:[baseline('master','platform_master'),{...baseline('tenant:6qkkz9k8','platform_codexsun'),schemaSha256:'bad'}]}])assert.throws(()=>validatePriorRecoveryProof(bad),/proof|overlap/);
});
test('prior recovery cannot be smuggled through setup, another app or resume ticket',()=>{
 assert.equal(validateUpdateTicket(ticket(),'platform').priorRecovery.schema,1);
 assert.throws(()=>validateUpdateTicket({...ticket(),action:'setup'},'platform'),/Prior recovery/);
 assert.throws(()=>validateUpdateTicket({...ticket(),resumeId:'12345678-1234-1234-1234-123456789abc'},'platform'),/Prior recovery/);
 assert.throws(()=>validateUpdateTicket(ticket(),'uiux'),/Prior recovery/);
});
test('runner only fingerprints/starts/verifies and never restores, migrates or rewrites prior successful files',()=>{
 const source=fs.readFileSync(new URL('../.container/apps/platform-prior-recovery-runner.ts',import.meta.url),'utf8');
 assert.match(source,/snapshotPlatformPriorDatabase/);assert.match(source,/recheck:inspectProof/);assert.match(source,/readOnly:true/);assert.match(source,/backupSha256/);assert.match(source,/hashPlatformPriorArchiveSchema/);assert.ok(source.includes("pgTool('pg_restore',['--file=-','--schema-only','--no-owner','--no-privileges']"));
 assert.doesNotMatch(source,/['"]migrate['"]|UPDATE public|INSERT INTO|CREATE DATABASE|DROP DATABASE|writeFile\(files\./);
 const controller=fs.readFileSync(new URL('../.container/hostinger/latest-update.mjs',import.meta.url),'utf8');assert.match(controller,/!ticket\.priorRecovery&&updateDecision/);assert.match(controller,/platform-prior-recovery-runner\.ts/);
});
