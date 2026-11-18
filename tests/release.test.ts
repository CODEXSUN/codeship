import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateContract} from '../.container/release.mjs';
import {validateManifest,compatibleMigrationHistory} from '../.container/release-policy.mjs';
const contract={schema:1,name:'codeship',area:'devkit',owner:'devkit/codeship',repository:'CODEXSUN/codeship',baseImage:'node:26.13.1-bookworm-slim@sha256:'+'a'.repeat(64),dependencies:[{path:'packages/ui',repository:'CODEXSUN/ui',commit:'b'.repeat(40),sshSecret:'RELEASE_UI_KEY'}]};
test('release identity rejects mutable dependencies, duplicate paths and mismatched tags',()=>{
 assert.equal(validateContract(contract,'1.0.3','v-1.0.3'),contract);
 for(const dependencies of [[{...contract.dependencies[0],commit:'main'}],[...contract.dependencies,...contract.dependencies],[{...contract.dependencies[0],path:'../escape'}]])assert.throws(()=>validateContract({...contract,dependencies},'1.0.3','v-1.0.3'));
 assert.throws(()=>validateContract(contract,'1.0.3','v-1.0.2'));
 assert.throws(()=>validateContract({...contract,baseImage:'node:latest'},'1.0.3','v-1.0.3'));
});
test('legacy migration adoption permits only declared equivalent line endings, never a different code hash',()=>{
 const file='src/api/modules/master/demo/database/sqlite-migrations/001.ts',manifest={owner:'devkit/codeship',migrations:{[file]:'new'},migrationLineEndings:{[file]:['old','new']}};
 assert.equal(compatibleMigrationHistory(manifest,{'001':'old'})['001'],'new');
 assert.equal(compatibleMigrationHistory(manifest,{'001':'changed-code'})['001'],'changed-code');
 assert.equal(compatibleMigrationHistory({...manifest,migrationLineEndings:{[file]:['old','other']}},{'001':'old'})['001'],'old');
});
test('deployment manifests require exact owner, tagged commit and repository-scoped digest',()=>{
 const expected={owner:'devkit/codeship',repository:'CODEXSUN/codeship',tag:'v-1.0.3',commit:'a'.repeat(40)},manifest={schema:1,...expected,version:'1.0.3',image:'ghcr.io/codexsun/codeship@sha256:'+'b'.repeat(64),migrations:{}};
 assert.equal(validateManifest(manifest,expected),manifest);
 for(const patch of [{image:'ghcr.io/other/image@sha256:'+'b'.repeat(64)},{image:'ghcr.io/codexsun/codeship:latest'},{commit:'c'.repeat(40)},{owner:'apps/platform'},{version:'1.0.2'}])assert.throws(()=>validateManifest({...manifest,...patch},expected));
});
