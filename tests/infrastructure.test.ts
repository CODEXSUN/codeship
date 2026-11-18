import {parseEnv} from 'node:util';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,rmSync,readFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {compareSync} from 'bcryptjs';
import {openDatabase} from '../src/api/database.ts';
import {migrator} from '../scripts/database.ts';
import {initializeVault} from '../src/api/modules/master/application/vault.ts';
import {createApplication} from '../src/api/application.ts';
import {infrastructureCompose} from '../src/api/modules/master/infrastructure-service/compose.ts';
import {infrastructureEnvironment,infrastructureNetwork,infrastructureInput} from '../src/api/modules/master/infrastructure-service/service.ts';
import {appVolumeBindings,fileManagerDefinition} from '../src/api/modules/master/infrastructure-service/file-manager.ts';
const directory=mkdtempSync(path.join(tmpdir(),'codeship-infra-'));process.env.CODESHIP_SQLITE_FILE=path.join(directory,'test.sqlite');process.env.CODESHIP_VAULT_KEY_FILE=path.join(directory,'vault.key');initializeVault();const {db,sqlite,schema}=openDatabase();
after(async()=>{await db.destroy();rmSync(directory,{recursive:true,force:true});});
test('infrastructure persists encrypted credentials, prepares private artifacts, preserves blanks and rejects stale edits',async()=>{
 assert.ifError((await migrator(db,schema).migrateToLatest()).error);const {app}=createApplication(db);await app.ready();const headers={host:'127.0.0.1:4350'},remoteAddress='127.0.0.1';
 const input={kind:'postgres',name:'PostgreSQL fixture',version:'postgres:17',environment:'local-docker',project:'fixture-postgres-local',host:'127.0.0.1',port:5432,docker_port:5432,binding_mode:'whitelist',allowed_ips:'192.168.1.20',username:'fixture_user',database:'fixture_db',storage:'fixture-pgdata',notes:'',secrets:{password:'Synthetic-Infrastructure-Password'}};
 try{const denied=await app.inject({method:'POST',url:'/api/v1/infrastructure',headers:{...headers,origin:'https://other.invalid'},remoteAddress,payload:input});assert.equal(denied.statusCode,403);
 const created=await app.inject({method:'POST',url:'/api/v1/infrastructure',headers,remoteAddress,payload:input});assert.equal(created.statusCode,201);assert.ok(!created.body.includes('Synthetic-'));const row=created.json();assert.equal(row.hasPassword,true);assert.equal(row.docker_port,5432);assert.equal(row.binding_mode,'whitelist');assert.equal(row.allowed_ips,'192.168.1.20');
 const stored=sqlite.prepare('SELECT encrypted_secrets FROM infrastructure_services').get()!;assert.ok(!String(stored.encrypted_secrets).includes('Synthetic-'));
 const prepared=await app.inject({method:'POST',url:'/api/v1/infrastructure/'+row.public_id+'/prepare',headers,remoteAddress,payload:{purpose:'install',revision:row.revision}});assert.equal(prepared.statusCode,200);assert.ok(!prepared.body.includes('Synthetic-'));const policy=JSON.parse(readFileSync(path.join(directory,'infrastructure',row.public_id,'install.network.json'),'utf8'));assert.equal(policy.bindAddress,'127.0.0.1');assert.equal(policy.requiresFirewall,true);const file=path.join(directory,prepared.json().artifact);assert.equal(parseEnv(readFileSync(file,'utf8')).POSTGRES_PASSWORD,'Synthetic-Infrastructure-Password');if(process.platform!=='win32')assert.equal(statSync(file).mode&0o777,0o600);
 const saved=await app.inject({method:'PUT',url:'/api/v1/infrastructure/'+row.public_id,headers,remoteAddress,payload:{...input,revision:row.revision,secrets:{password:''}}});assert.equal(saved.statusCode,200);assert.equal(sqlite.prepare('SELECT encrypted_secrets FROM infrastructure_services').get()!.encrypted_secrets,stored.encrypted_secrets);
 const stale=await app.inject({method:'PUT',url:'/api/v1/infrastructure/'+row.public_id,headers,remoteAddress,payload:{...input,revision:row.revision}});assert.equal(stale.statusCode,409);
 const changed=await app.inject({method:'PUT',url:'/api/v1/infrastructure/'+row.public_id,headers,remoteAddress,payload:{...input,kind:'redis',binding_mode:'local',revision:saved.json().revision}});assert.equal(changed.statusCode,409);
 }finally{await app.close();}
});
test('service env contracts support PostgreSQL, Redis, legacy MariaDB and Codexsun File Browser',()=>{
 const base={username:'example',database:'example_db',storage:''};assert.equal(infrastructureEnvironment({...base,kind:'redis'},{password:'test-password'},'maintenance').REDIS_PASSWORD,'test-password');
 assert.throws(()=>infrastructureEnvironment({...base,kind:'mariadb'},{password:'app-password'},'install'));const maria=infrastructureEnvironment({...base,kind:'mariadb'},{password:'app-password',rootPassword:'root-password'},'install');assert.equal(maria.MARIADB_ROOT_PASSWORD,'root-password');assert.equal(maria.MARIADB_DATABASE,'example_db');
 assert.equal(infrastructureEnvironment({...base,kind:'mariadb',username:'root',database:''},{password:'root-connection-password'},'install').MARIADB_ROOT_PASSWORD,'root-connection-password');
 assert.throws(()=>infrastructureEnvironment({...base,kind:'postgres'},{},'install'));assert.throws(()=>infrastructureEnvironment({...base,kind:'postgres'},{},'maintenance'));
 const media=infrastructureEnvironment({...base,kind:'file-manager',storage:'apps/one=one_uploads\napps/two=two_uploads'},{password:'media-password'},'install');assert.equal(media.MEDIA_ADMIN_USER,'example');assert.ok(!String(media.MEDIA_APP_VOLUMES).includes('\n'));
});
test('standalone File Browser binds named app file volumes and hashes bootstrap credentials',()=>{
 const definition=fileManagerDefinition({project:'files-local',version:'filebrowser/filebrowser:v2.63.5',port:7090,username:'files-operator',storage:'devkit/codeitz=codeitz-docker-local_workspace\napps/crm=crm_uploads'},'Synthetic-File-Password');assert.equal(definition.services.filemanager.ports[0],'127.0.0.1:7090:8080');assert.ok(compareSync('Synthetic-File-Password',definition.services.filemanager.environment.FB_PASSWORD));assert.equal(definition.services.filemanager.environment.FB_DISABLE_EXEC,'true');assert.equal(definition.volumes.app_0.external,true);
 assert.equal(appVolumeBindings('devkit/codeitz=codeitz-docker-local_workspace')[0].target,'/srv/devkit/codeitz');assert.throws(()=>appVolumeBindings('apps/crm=../../outside'));assert.throws(()=>appVolumeBindings('apps/crm=codeship-local_keys'));assert.throws(()=>appVolumeBindings('apps/crm=codeitz-docker-local_pgdata'));assert.throws(()=>appVolumeBindings('apps/crm=files\napps/crm=other_files'));
 assert.throws(()=>fileManagerDefinition({project:'files-local',version:'filebrowser/filebrowser:latest',port:7090,username:'admin',storage:'apps/crm=crm_uploads'},'Synthetic-File-Password'));
});

test('Docker Compose retains the File Browser bootstrap hash without variable interpolation',()=>{
 const definition=fileManagerDefinition({project:'codeship-files-fixture',version:'filebrowser/filebrowser:v2.63.5',port:7090,username:'files-fixture',storage:'apps/crm=crm_uploads'},'Synthetic-Compose-Password');
 definition.services.filemanager.environment.FB_PASSWORD=definition.services.filemanager.environment.FB_PASSWORD.split('$').join('$$');
 const file=path.join(directory,'fixture.compose.json');writeFileSync(file,JSON.stringify(definition),{mode:0o600});
 const result=JSON.parse(execFileSync('docker',['compose','-f',file,'config','--format','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 // Compose config re-escapes literal dollars so its output can be used as Compose input.
 assert.equal(result.services.filemanager.environment.FB_PASSWORD,definition.services.filemanager.environment.FB_PASSWORD);
 assert.ok(compareSync('Synthetic-Compose-Password',result.services.filemanager.environment.FB_PASSWORD.split('$$').join('$')));
});

test('database exposure defaults local and validates SQL-only whitelist policies',()=>{
 const base={kind:'postgres',port:15432,docker_port:5432};
 assert.equal(infrastructureNetwork(base).bindAddress,'127.0.0.1');
 assert.equal(infrastructureNetwork({...base,binding_mode:'public'}).bindAddress,'0.0.0.0');
 const restricted=infrastructureNetwork({...base,binding_mode:'whitelist',allowed_ips:'192.168.1.20\n10.0.0.0/24'});
 assert.equal(restricted.bindAddress,'127.0.0.1');assert.equal(restricted.requiresFirewall,true);assert.equal(restricted.containerPort,5432);assert.equal(restricted.hostPort,15432);assert.equal(restricted.allowedSources.length,2);
 for(const allowed_ips of ['', '0.0.0.0/0','not-an-ip','10.0.0.1/33'])assert.throws(()=>infrastructureNetwork({...base,binding_mode:'whitelist',allowed_ips}));
 assert.throws(()=>infrastructureNetwork({...base,kind:'redis',binding_mode:'public'}));
});

test('File Manager Docker port maps to its configured internal listener',()=>{
 const definition=fileManagerDefinition({project:'files-fixture',version:'filebrowser/filebrowser:v2.63.5',port:7090,docker_port:8090,username:'fixture',storage:'apps/crm=crm_uploads'},'Synthetic-Password-Only');
 assert.equal(definition.services.filemanager.ports[0],'127.0.0.1:7090:8090');assert.equal(definition.services.filemanager.environment.FB_PORT,'8090');
});

test('SQLite-driven Compose definitions validate for all four service types without plaintext passwords',()=>{
 const base={public_id:'abcdefgh',name:'Fixture',environment:'local-docker',host:'127.0.0.1',port:15432,docker_port:5432,username:'fixture',database:'fixture_db',storage:'apps/crm=crm_uploads',notes:'',revision:1,hasPassword:true,hasRootPassword:true,hasSecrets:true,updated_at:'',binding_mode:'local' as const};
 const templates=path.resolve('.container/infrastructure');
 const fixtures=[{kind:'postgres',version:'postgres:17.6',docker_port:5432},{kind:'mariadb',version:'mariadb:11.8',docker_port:3306},{kind:'redis',version:'redis:7.4-alpine',docker_port:6379},{kind:'file-manager',version:'filebrowser/filebrowser:v2.63.5',docker_port:8080}] as const;
 for(const fixture of fixtures){
  const generated=infrastructureCompose({...base,...fixture,project:'fixture-'+fixture.kind},{password:'Synthetic$Compose-Secret',rootPassword:'Synthetic-Root-Secret'},templates);
  if(fixture.kind==='file-manager'){const hash=generated.compose.services.filemanager.environment.FB_PASSWORD;assert.ok(hash.startsWith('$$2'));assert.ok(compareSync('Synthetic$Compose-Secret',hash.split('$$').join('$')));}
  const encoded=JSON.stringify(generated.compose);assert.ok(!encoded.includes('Synthetic'));assert.equal(generated.compose.name,'fixture-'+fixture.kind);assert.ok(Object.keys(generated.compose.services).length===1);
  const folder=path.join(directory,fixture.kind);mkdirSync(path.join(folder,'private'),{recursive:true});
  for(const [name,value]of Object.entries(generated.files))writeFileSync(path.join(folder,'private',name),value);
  const file=path.join(folder,'compose.json');writeFileSync(file,encoded);
  execFileSync('docker',['compose','-f',file,'config','--quiet'],{stdio:['ignore','pipe','pipe']});
  if(fixture.kind==='redis'){assert.ok(generated.files['users.acl'].includes('user default off'));assert.ok(!generated.files['users.acl'].includes('Synthetic'));}
 }
 const root=infrastructureCompose({...base,kind:'mariadb',project:'fixture-root',version:'mariadb:11.8',username:'root',docker_port:3306},{password:'Synthetic-Root-Only'},templates);
 assert.equal(root.compose.services.mariadb.environment.MARIADB_USER,undefined);
 const restricted=infrastructureCompose({...base,kind:'postgres',project:'fixture-restricted',version:'postgres:18.1',binding_mode:'whitelist',allowed_ips:'10.0.0.0/24'},{password:'Synthetic-Restricted'},templates);
 assert.equal(restricted.compose.services.postgres.ports[0],'127.0.0.1:15432:5432');assert.equal(restricted.network.requiresFirewall,true);assert.equal(restricted.compose.services.postgres.volumes[0],'data:/var/lib/postgresql');
 assert.throws(()=>infrastructureCompose({...base,kind:'postgres',project:'fixture-invalid',version:'postgres:latest'},{password:'Synthetic'},templates));
});
