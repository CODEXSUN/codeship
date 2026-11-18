import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {openDatabase} from '../src/api/database.ts';
import {migrator} from '../scripts/database.ts';
import {initializeVault,decryptSecrets} from '../src/api/modules/master/application/vault.ts';
import {createApplication} from '../src/api/application.ts';
import {serializeDeploymentEnvironment} from '../src/api/modules/master/application/accounts.ts';
const directory=mkdtempSync(path.join(tmpdir(),'codeship-env-editor-'));process.env.CODESHIP_VAULT_KEY_FILE=path.join(directory,'vault.key');initializeVault();const {db,schema}=openDatabase(':memory:');after(async()=>{await db.destroy();rmSync(directory,{recursive:true,force:true});});
test('environment editor masks secrets, reveals one value explicitly, saves encrypted edits and preserves untouched values',async()=>{
 assert.ifError((await migrator(db,schema).migrateToLatest()).error);const {app}=createApplication(db);await app.ready();const headers={host:'127.0.0.1:4350'},remoteAddress='127.0.0.1';
 const input={name:'Environment fixture',owner:'apps/example',version:'1.0.0',environment:'local-docker',project:'example-editor',host:'127.0.0.1',port:4444,username:'',notes:'',secrets:{env:'APP_PORT=4444\nAPI_TOKEN=Private-Fixture-Token\nUNKNOWN_VALUE=Private-Unknown-Fixture\nKEEP_PASSWORD=Retained-Fixture-Password'}};
 try{
 const created=await app.inject({method:'POST',url:'/api/v1/applications',headers,remoteAddress,payload:input});assert.equal(created.statusCode,201);const record=created.json(),url='/api/v1/applications/'+record.public_id;
 const masked=await app.inject({url:url+'/environment',headers,remoteAddress});assert.equal(masked.statusCode,200);assert.equal(masked.headers['cache-control'],'no-store');assert.ok(!masked.body.includes('Private-'));assert.equal(masked.json().variables.find(v=>v.key==='APP_PORT').value,'4444');assert.equal(masked.json().variables.find(v=>v.key==='API_TOKEN').value,null);assert.equal(masked.json().variables.find(v=>v.key==='UNKNOWN_VALUE').secret,true);
 const denied=await app.inject({method:'POST',url:url+'/environment/reveal',headers:{...headers,origin:'https://other.invalid'},remoteAddress,payload:{key:'API_TOKEN',revision:record.secret_revision}});assert.equal(denied.statusCode,403);
 const revealed=await app.inject({method:'POST',url:url+'/environment/reveal',headers,remoteAddress,payload:{key:'API_TOKEN',revision:record.secret_revision}});assert.equal(revealed.statusCode,200);assert.equal(revealed.headers['cache-control'],'no-store');assert.equal(revealed.json().value,'Private-Fixture-Token');
 const list=await app.inject({url:'/api/v1/applications',headers,remoteAddress});assert.ok(!list.body.includes('Private-'));
 const {secrets,...metadata}=input;const saved=await app.inject({method:'PUT',url,headers,remoteAddress,payload:{...metadata,secretRevision:record.secret_revision,environmentChanges:{APP_PORT:'5555',API_TOKEN:'Edited-Fixture-Token',EMPTY_VALUE:'',NEW_PATH:'C:\\fixture\\files',COMPOSE_PROJECT_NAME:'must-not-override-runtime',SUPER_ADMIN_PASSWORD:'Edited-Owner-Fixture-Password'}}});assert.equal(saved.statusCode,200);assert.ok(!saved.body.includes('Edited-Fixture'));
 const stored=await db.selectFrom('applications').selectAll().where('public_id','=',record.public_id).executeTakeFirstOrThrow();assert.ok(!stored.encrypted_secrets!.includes('Edited-Fixture'));const vault=decryptSecrets(record.public_id,stored.encrypted_secrets!);const env=parseEnv(vault.env);assert.equal(env.APP_PORT,'5555');assert.equal(env.API_TOKEN,'Edited-Fixture-Token');assert.equal(env.KEEP_PASSWORD,'Retained-Fixture-Password');assert.equal(env.EMPTY_VALUE,'');assert.equal(env.NEW_PATH,'C:\\fixture\\files');assert.equal(env.COMPOSE_PROJECT_NAME,undefined);assert.equal(parseEnv(vault.sourceEnv).COMPOSE_PROJECT_NAME,'must-not-override-runtime');assert.equal(vault.saPassword,'Edited-Owner-Fixture-Password');
 const stale=await app.inject({method:'POST',url:url+'/environment/reveal',headers,remoteAddress,payload:{key:'API_TOKEN',revision:record.secret_revision}});assert.equal(stale.statusCode,409);
 const invalid=await app.inject({method:'PUT',url,headers,remoteAddress,payload:{...metadata,secretRevision:saved.json().secret_revision,environmentChanges:{'invalid-key':'x'}}});assert.equal(invalid.statusCode,400);
 }finally{await app.close();}
});
test('environment serialization preserves spaces, quotes, hashes, dollars and backslashes',()=>{
 for(const value of ['space value','a$b#c=d','a"quote',"a'quote",'back\\slash',''])assert.equal(parseEnv(serializeDeploymentEnvironment({TEST:value})).TEST,value);
});
