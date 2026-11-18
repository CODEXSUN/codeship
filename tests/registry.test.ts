import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../src/api/database.ts';
import {migrator} from '../scripts/database.ts';
import {initializeVault,decryptSecrets} from '../src/api/modules/master/application/vault.ts';
import {createApplication} from '../src/api/application.ts';
import {migrationDecision} from '../.container/policy.mjs';
import {applicationRepository} from '../src/api/modules/master/application/repository.ts';
import {prepareDeploymentEnvironment} from '../src/api/modules/master/application/index.ts';
import {deploymentEnvironment} from '../src/api/modules/master/application/accounts.ts';
import {writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
const directory=mkdtempSync(path.join(tmpdir(),'codeship-vault-test-')),file=path.join(directory,'test.sqlite');
process.env.CODESHIP_VAULT_KEY_FILE=path.join(directory,'vault.key');initializeVault();
const {db,sqlite,schema}=openDatabase(file);
after(async()=>{await db.destroy();rmSync(directory,{recursive:true,force:true});});
test('registry encrypts secrets, never returns them, preserves blanks, rejects stale edits and clears explicitly',async()=>{
 const migration=await migrator(db,schema).migrateToLatest();assert.ifError(migration.error);
 const {app}=createApplication(db);await app.ready();const headers={host:'127.0.0.1:4350'},remoteAddress='127.0.0.1';
 const input={name:'Example',owner:'apps/example',version:'1.0.0',environment:'vps',project:'example-live',host:'example.invalid',port:443,username:'operator',notes:'Test application',secrets:{env:'PASSWORD=private-test-value',password:'private-password'}};
 try{
 const denied=await app.inject({method:'POST',url:'/api/v1/applications',headers:{...headers,origin:'https://other.invalid'},remoteAddress,payload:input});assert.equal(denied.statusCode,403);
 const response=await app.inject({method:'POST',url:'/api/v1/applications',headers,remoteAddress,payload:input});assert.equal(response.statusCode,201);assert.ok(!response.body.includes('private-'));const record=response.json();assert.equal(record.hasSecrets,true);
 const stored=await db.selectFrom('applications').selectAll().executeTakeFirstOrThrow();assert.ok(!stored.encrypted_secrets!.includes('private-'));assert.equal(decryptSecrets(stored.public_id,stored.encrypted_secrets!).password,'private-password');assert.throws(()=>decryptSecrets('wrong-id',stored.encrypted_secrets!));
 const listed=await app.inject({url:'/api/v1/applications',headers,remoteAddress});assert.ok(!listed.body.includes('encrypted_secrets'));assert.ok(!listed.body.includes('private-'));assert.deepEqual(listed.json()[0].environmentKeys,['PASSWORD']);
 const update={...input,name:'Updated',secrets:{password:''},secretRevision:record.secret_revision};const saved=await app.inject({method:'PUT',url:'/api/v1/applications/'+record.public_id,headers,remoteAddress,payload:update});assert.equal(saved.statusCode,200);
 assert.equal((await db.selectFrom('applications').select('encrypted_secrets').executeTakeFirstOrThrow()).encrypted_secrets,stored.encrypted_secrets);
 const conflict=await app.inject({method:'PUT',url:'/api/v1/applications/'+record.public_id,headers,remoteAddress,payload:update});assert.equal(conflict.statusCode,409);
 const cleared=await app.inject({method:'PUT',url:'/api/v1/applications/'+record.public_id,headers,remoteAddress,payload:{...update,secrets:{},clearSecrets:true,secretRevision:saved.json().secret_revision}});assert.equal(cleared.statusCode,200);assert.equal(cleared.json().hasSecrets,false);
 }finally{await app.close();}
});
test('SQLite online backup includes committed WAL records and is independently readable',async()=>{
 sqlite.exec('CREATE TABLE backup_probe(value TEXT); INSERT INTO backup_probe VALUES (\'retained\')');const output=path.join(directory,'backup.sqlite');
 const result=spawnSync(process.execPath,['scripts/backup.ts',output],{env:{...process.env,CODESHIP_SQLITE_FILE:file},encoding:'utf8'});assert.equal(result.status,0,result.stderr);const copy=new DatabaseSync(output,{readOnly:true});try{assert.equal(copy.prepare('SELECT value FROM backup_probe').get()!.value,'retained');}finally{copy.close();}
 assert.equal(readFileSync(process.env.CODESHIP_VAULT_KEY_FILE!).length,32);
});
test('deployment backs up only pending schema changes and rejects edited or removed applied migrations',()=>{
 assert.deepEqual(migrationDecision({applied:['one'],pending:[]},{one:'hash'},{one:'hash'}),{pending:[],backupRequired:false,migrateRequired:false});
 assert.equal(migrationDecision({applied:['one'],pending:['two']},{one:'hash'},{one:'hash',two:'new'}).backupRequired,true);
 assert.throws(()=>migrationDecision({applied:['one'],pending:[]},{one:'old'},{one:'changed'}));assert.throws(()=>migrationDecision({applied:['one'],pending:[]},{one:'hash'},{}));
});
test('isolated container refuses host deployment authority',async()=>{process.env.CODESHIP_EXECUTION_MODE='inventory';const {app}=createApplication(db);await app.ready();try{const response=await app.inject({url:'/api/v1/capabilities',headers:{host:'127.0.0.1:4350'},remoteAddress:'127.0.0.1'});assert.equal(response.json().execution,false);}finally{delete process.env.CODESHIP_EXECUTION_MODE;await app.close();}});
test('three installation users persist encrypted, map Platform prefixes and populate only a matching approved deployment',async()=>{
 const input={name:'Account fixture',owner:'apps/example',version:'1.0.0',environment:'local-docker',project:'example-docker',host:'127.0.0.1',port:4444,username:'operator',notes:'',users:[{role:'sa',username:'owner-login',email:'owner@example.test',name:'Owner'},{role:'admin',username:'tenant-login',email:'admin@example.test',name:'Admin'},{role:'user',username:'member-login',email:'user@example.test',name:'Member'}],secrets:{env:'APP_INSTALL_MODE=fixture',saPassword:'Synthetic-Owner-Password',adminPassword:'Synthetic-Admin-Password',userPassword:'Synthetic-User-Password'}};
 const repo=applicationRepository(db),saved=await repo.save(input);assert.equal(saved.users.length,3);assert.ok(saved.users.every((u:any)=>u.hasPassword));assert.ok(!JSON.stringify(saved).includes('Synthetic-'));
 const encrypted=await db.selectFrom('applications').select('encrypted_secrets').where('public_id','=',saved.public_id).executeTakeFirstOrThrow();assert.ok(!encrypted.encrypted_secrets!.includes('owner-login'));
 const envFile=path.join(directory,'deployment.env');writeFileSync(envFile,'COMPOSE_PROJECT_NAME=example-docker\nHOST_PORT=4444\nRETAIN=existing\n',{mode:0o600});
 await prepareDeploymentEnvironment(db,{owner:'apps/example',project:'example-docker',port:4444},envFile);const values=parseEnv(readFileSync(envFile,'utf8'));
 assert.equal(values.SUPER_ADMIN_USERNAME,'owner-login');assert.equal(values.TENANT_ADMIN_PASSWORD,'Synthetic-Admin-Password');assert.equal(values.TENANT_USER_EMAIL,'user@example.test');assert.equal(values.APP_INSTALL_MODE,'fixture');assert.equal(values.RETAIN,'existing');
 const before=readFileSync(envFile,'utf8');await assert.rejects(()=>prepareDeploymentEnvironment(db,{owner:'apps/example',project:'example-docker',port:5555},envFile));assert.equal(readFileSync(envFile,'utf8'),before);
 await repo.save({...input,secrets:{saPassword:''},secretRevision:saved.secret_revision},saved.public_id);await prepareDeploymentEnvironment(db,{owner:'apps/example',project:'example-docker',port:4444},envFile);assert.equal(parseEnv(readFileSync(envFile,'utf8')).SUPER_ADMIN_PASSWORD,'Synthetic-Owner-Password');
 assert.throws(()=>deploymentEnvironment({env:'CODESHIP_EXECUTION_MODE=local-operator'}));assert.throws(()=>deploymentEnvironment({env:'NODE_OPTIONS=--inspect'}));
 await assert.rejects(()=>repo.save({...input,users:[input.users[0],input.users[0],input.users[2]]}));
});
