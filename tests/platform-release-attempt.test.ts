import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {preparePlatformReleaseAttempt,markPlatformAttemptReplaced,validatePlatformResume,completePlatformReleaseAttempt,validatePlatformResumeMigrations} from '../.container/apps/platform-release-attempt.mjs';

const imageId='sha256:'+'a'.repeat(64);
const approvedManifest={schema:1,owner:'apps/platform',repository:'CODEXSUN/platform',version:'1.0.13',tag:'v-1.0.13',commit:'b'.repeat(40),image:'ghcr.io/codexsun/platform@sha256:'+'c'.repeat(64),imageId,migrations:{'src/api/modules/test/database/migrations/20261119000100_test.ts':'d'.repeat(64)}};
const candidateState={...approvedManifest,image:imageId,releaseImage:approvedManifest.image,migrations:{'master:20261119000100_test':'d'.repeat(64)},previousImage:'sha256:'+'e'.repeat(64),compose:'fixture-compose',network:{name:'fixture-network',address:'172.20.0.10'}};
async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'codeship-platform-attempt-'));
 const files={stateFile:path.join(root,'state.json'),envFile:path.join(root,'runtime.env'),composeFile:path.join(root,'compose.json'),markerFile:path.join(root,'database-import.json')};
 for(const [key,file]of Object.entries(files))await writeFile(file,key==='envFile'?'PASSWORD=disposable-never-journal\n':JSON.stringify({fixture:key}));
 const directory=path.join(root,'attempts');
 const prepare=()=>preparePlatformReleaseAttempt({directory,action:'update',approvedManifest,candidateState,...files});
 return {root,directory,files,prepare,check:(id:string,overrides:Record<string,unknown>={})=>validatePlatformResume({directory,resumeId:id,approvedManifest,actualImageId:imageId,...files,...overrides}),close:()=>rm(root,{recursive:true,force:true})};
}

test('only explicitly recorded successful replacement can resume; completion consumes the attempt',async()=>{
 const f=await fixture();try{
  const attempt=await f.prepare();assert.equal(attempt.phase,'prepared');
  await assert.rejects(f.check(attempt.id),/pending replacement/);
  await markPlatformAttemptReplaced(f.directory,attempt.id);const resumed=await f.check(attempt.id);assert.equal(resumed.candidateState.imageId,imageId);
  await completePlatformReleaseAttempt(f.directory,attempt.id);await assert.rejects(f.check(attempt.id),/pending replacement/);
 }finally{await f.close();}
});

test('matching candidate image without a recorded operation never permits recovery',async()=>{
 const f=await fixture();try{
  await assert.rejects(f.check('00000000-0000-0000-0000-000000000000'),/ENOENT/);
  await assert.rejects(f.check('../state'),/exact Platform resume operation ID/);
 }finally{await f.close();}
});

for(const key of ['stateFile','envFile','composeFile','markerFile'] as const)test('changed '+key+' blocks resume',async()=>{
 const f=await fixture();try{
  const attempt=await f.prepare();await markPlatformAttemptReplaced(f.directory,attempt.id);await writeFile(f.files[key],'changed');
  await assert.rejects(f.check(attempt.id),/changed since replacement/);
 }finally{await f.close();}
});

test('different release or actual image blocks resume despite an existing attempt',async()=>{
 const f=await fixture();try{
  const attempt=await f.prepare();await markPlatformAttemptReplaced(f.directory,attempt.id);
  await assert.rejects(f.check(attempt.id,{approvedManifest:{...approvedManifest,commit:'f'.repeat(40)}}),/release differs/);
  await assert.rejects(f.check(attempt.id,{actualImageId:'sha256:'+'0'.repeat(64)}),/running image differs/);
 }finally{await f.close();}
});

test('journal stores input hashes instead of secret environment contents and rejects candidate-state changes',async()=>{
 const f=await fixture();try{
  const attempt=await f.prepare();await markPlatformAttemptReplaced(f.directory,attempt.id);
  const file=path.join(f.directory,attempt.id+'.json'),raw=await readFile(file,'utf8');assert.ok(!raw.includes('PASSWORD'));assert.ok(!raw.includes('disposable-never-journal'));
  const record=JSON.parse(raw);record.candidateState.network.address='172.20.0.99';await writeFile(file,JSON.stringify(record));
  await assert.rejects(f.check(attempt.id),/recorded candidate state changed/);
 }finally{await f.close();}
});

test('fresh setup journal cannot be mistaken for an interrupted update',async()=>{
 const f=await fixture();try{
  await rm(f.files.stateFile);const record=await preparePlatformReleaseAttempt({directory:f.directory,action:'setup',approvedManifest,candidateState,...f.files});
  await markPlatformAttemptReplaced(f.directory,record.id);await assert.rejects(f.check(record.id),/pending replacement/);
 }finally{await f.close();}
});

test('resume requires the complete compatible candidate migration plan with nothing pending',()=>{
 const plans=[{scope:'master',applied:['20261119000100_test'],pending:[]}];
 validatePlatformResumeMigrations(plans,candidateState.migrations,approvedManifest);
 assert.throws(()=>validatePlatformResumeMigrations([{scope:'master',applied:[],pending:['20261119000100_test']}],candidateState.migrations,approvedManifest),/cannot run pending migrations/);
 assert.throws(()=>validatePlatformResumeMigrations(plans,{'master:20261119000100_test':'f'.repeat(64)},approvedManifest),/Applied migration changed/);
 assert.throws(()=>validatePlatformResumeMigrations([{scope:'master',applied:[],pending:[]}],candidateState.migrations,approvedManifest),/differs from the approved manifest/);
 assert.throws(()=>validatePlatformResumeMigrations([...plans,...plans],candidateState.migrations,approvedManifest),/ambiguous/);
});
