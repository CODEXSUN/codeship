import {readFileSync,existsSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {parseEnv} from 'node:util';
import path from 'node:path';
import pg from 'pg';
const root=path.resolve(import.meta.dirname,'..'),workspace=path.resolve(root,'../..'),apply=process.argv.includes('--apply'),dockerOnly=process.argv.includes('--docker-only');
if(process.argv.slice(2).some(arg=>!['--apply','--dry-run','--docker-only'].includes(arg)))throw new Error('Use --dry-run or --apply, optionally --docker-only.');
if(process.argv.includes('--apply')&&process.argv.includes('--dry-run'))throw new Error('Choose either --dry-run or --apply.');
const origin='http://127.0.0.1:14350';
const request=async route=>{const response=await fetch(origin+'/api/v1/'+route);if(!response.ok)throw new Error('Current Codeship inventory is unavailable.');return response.json();};
const existing=await request('applications'),infra=await request('infrastructure');
const readEnv=file=>existsSync(file)?parseEnv(readFileSync(file,'utf8')):{};
const good=value=>typeof value==='string'&&value!==''&&!/^change[_-]|^placeholder/i.test(value);
const owners=['devkit/codeitz','apps/platform','devkit/codeship'],sources=new Map(),applications=[];
function databaseSettings(env){
 const result={username:env.PGUSER??'',password:env.PGPASSWORD??'',database:env.PGDATABASE??'',host:env.PGHOST??'',port:env.PGPORT?Number(env.PGPORT):null};
 if(env.PLATFORM_MASTER_DATABASE_URL){const url=new URL(env.PLATFORM_MASTER_DATABASE_URL);Object.assign(result,{username:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:decodeURIComponent(url.pathname.slice(1)),host:url.hostname,port:Number(url.port||5432)});}
 return result;
}
for(const owner of owners){
 const directory=path.join(workspace,owner),pkg=JSON.parse(readFileSync(path.join(directory,'package.json'),'utf8')),name=owner.split('/')[1],env=readEnv(path.join(directory,'.env'));
 const prefix=name.toUpperCase().replaceAll('-','_'),db=databaseSettings(env),old=existing.find(r=>r.owner===owner&&r.project===name+'-development');
 const details={name:old?.name??name,owner,version:String(pkg.version),environment:'development',project:name+'-development',host:env[prefix+'_HOST']??old?.host??'',port:env[prefix+'_PORT']?Number(env[prefix+'_PORT']):old?.port??null,username:db.username||old?.username||'',notes:old?.notes||'Current manifest and native .env snapshot; installation credentials do not reset live identities.'};
 const accountPrefixes={sa:'SUPER_ADMIN',admin:'TENANT_ADMIN',user:'TENANT_USER'},users=[],passwords={};
 for(const [role,accountPrefix]of Object.entries(accountPrefixes)){const oldUser=old?.users?.find(u=>u.role===role);users.push({role,username:env[accountPrefix+'_USERNAME']||oldUser?.username||'',email:env[accountPrefix+'_EMAIL']||oldUser?.email||'',name:env[accountPrefix+'_NAME']||oldUser?.name||''});if(good(env[accountPrefix+'_PASSWORD']))passwords[role+'Password']=env[accountPrefix+'_PASSWORD'];}
 applications.push({details,env,users,passwords:{...passwords,...(good(db.password)?{password:db.password}:{})},id:old?.public_id,revision:old?.secret_revision,source:owner+'/.env',docker:false});sources.set(owner,{pkg,env,db});
}
const profiles=JSON.parse(readFileSync(path.join(root,'.codeship/targets.json'),'utf8'));
const ownProfile=readEnv(path.join(root,'.codeship/docker/deploy.env'));
profiles.push({owner:'devkit/codeship',project:ownProfile.COMPOSE_PROJECT_NAME,port:Number(ownProfile.HOST_PORT),envFile:'.codeship/docker/deploy.env',name:'Codeship Local'});
for(const profile of profiles){
 if(!sources.has(profile.owner))continue;const source=sources.get(profile.owner),env=readEnv(path.join(workspace,profile.owner,profile.envFile));
 const id=execFileSync('docker',['ps','-q','--filter','label=com.docker.compose.project='+profile.project,'--filter','label=com.docker.compose.service=app'],{encoding:'utf8',windowsHide:true}).trim();
 if(!id)continue;const container=JSON.parse(execFileSync('docker',['inspect',id],{encoding:'utf8',windowsHide:true}))[0],runtime=Object.fromEntries(container.Config.Env.map(value=>{const split=value.indexOf('=');return [value.slice(0,split),value.slice(split+1)];}));
 const old=existing.find(r=>r.owner===profile.owner&&r.project===profile.project),db=databaseSettings(runtime);
 const selectedRuntime=Object.fromEntries(Object.entries(runtime).filter(([key])=>/^(?:PG|CODESHIP_|CODEITZ_|SUPER_ADMIN_|TENANT_ADMIN_|TENANT_USER_)/.test(key)));
 applications.push({details:{name:old?.name??profile.name??source.pkg.name,owner:profile.owner,version:container.Config.Labels?.['org.opencontainers.image.version']??String(source.pkg.version),environment:'local-docker',project:profile.project,host:'127.0.0.1',port:Number(profile.port),username:db.username||old?.username||'',notes:old?.notes||'Existing Docker deployment; snapshot from approved private profile and running app configuration.'},env:{...env,...selectedRuntime},users:null,passwords:good(db.password)?{password:db.password}:{},id:old?.public_id,revision:old?.secret_revision,source:profile.owner+'/'+profile.envFile,docker:true});
}
const infrastructure=[];
const postgresSourceNote='Connection credentials refreshed from Platform native master configuration; native connection, not proof of a shared Docker PostgreSQL installation.';
const platform=sources.get('apps/platform');const postgres=infra.find(r=>r.kind==='postgres');
if(!dockerOnly&&postgres&&platform.env.PLATFORM_MASTER_DATABASE_URL){
 const db=platform.db;let version='';
 if(['127.0.0.1','localhost','::1','[::1]'].includes(db.host)){
  const client=new pg.Client({connectionString:platform.env.PLATFORM_MASTER_DATABASE_URL,connectionTimeoutMillis:2000,statement_timeout:2000});try{await client.connect();await client.query('BEGIN READ ONLY');version=String((await client.query('SHOW server_version')).rows[0].server_version);await client.query('ROLLBACK');}catch{}finally{await client.end().catch(()=>{});}
 }
 infrastructure.push({id:postgres.public_id,revision:postgres.revision,details:{host:db.host,port:db.port,username:db.username,database:db.database,...(version?{version}:{}),notes:postgres.notes.includes(postgresSourceNote)?postgres.notes:postgres.notes+'\n'+postgresSourceNote},password:good(db.password)?db.password:null});
}
const payload={applications:dockerOnly?applications.filter(entry=>entry.docker):applications,infrastructure};
if(!apply){console.log(JSON.stringify({dryRun:true,applications:payload.applications.map(row=>({owner:row.details.owner,environment:row.details.environment,project:row.details.project,source:row.source,variables:Object.keys(row.env).length,accountPasswords:Object.keys(row.passwords).filter(k=>k!=='password').length,existing:!!row.id})),infrastructure:infrastructure.map(()=>({kind:'postgres',source:'Platform native master connection'})),unavailableCredentials:infra.filter(r=>r.kind!=='postgres'&&!r.hasPassword).map(r=>r.kind)}));process.exit(0);}
const importer=`
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {openDatabase} from './src/api/database.ts';
import {publicId,actor} from './src/api/identity.ts';
import {encryptSecrets,decryptSecrets} from './src/api/modules/master/application/vault.ts';
import {serializeDeploymentEnvironment} from './src/api/modules/master/application/accounts.ts';
const payload=JSON.parse(readFileSync(0,'utf8'));const {db}=openDatabase();
const control=key=>/^(?:NODE_|LD_|DYLD_|DOCKER_|COMPOSE_|CODESHIP_(?:HOST|PORT|BIND_MODE|DOCKER_PEERS|EXECUTION_MODE|SQLITE_FILE|VAULT_KEY_FILE)|PATH$|HOME$|SHELL$|HOST_PORT$)/.test(key);
try{const result=await db.transaction().execute(async trx=>{let updated=0,created=0,variables=0;
for(const entry of payload.applications){const old=entry.id?await trx.selectFrom('applications').selectAll().where('public_id','=',entry.id).executeTakeFirst():null;if(entry.id&&(!old||old.secret_revision!==entry.revision))throw new Error('Application revision changed.');
const id=old?.public_id??publicId(),secrets=old?.encrypted_secrets?decryptSecrets(id,old.encrypted_secrets):{};
const previous=parseEnv(secrets.env??''),merged={...previous,...entry.env};
if(entry.docker)for(const key of Object.keys(merged))if(control(key))delete merged[key];
Object.assign(secrets,entry.passwords,{env:serializeDeploymentEnvironment(merged),sourceEnv:serializeDeploymentEnvironment(entry.env)});if(entry.users)secrets.users=JSON.stringify(entry.users);
const fields={...entry.details,encrypted_secrets:encryptSecrets(id,secrets),updated_by:actor,updated_at:new Date().toISOString()};
if(old){await trx.updateTable('applications').set({...fields,secret_revision:old.secret_revision+1}).where('public_id','=',id).execute();updated++;}else{await trx.insertInto('applications').values({...fields,public_id:id,created_by:actor}).execute();created++;}variables+=Object.keys(entry.env).length;
const saved=await trx.selectFrom('applications').selectAll().where('public_id','=',id).executeTakeFirstOrThrow();const verified=decryptSecrets(id,saved.encrypted_secrets);const archived=parseEnv(verified.sourceEnv);for(const [key,value]of Object.entries(entry.env))if(archived[key]!==value)throw new Error('Environment verification failed.');
}
for(const entry of payload.infrastructure){const old=await trx.selectFrom('infrastructure_services').selectAll().where('public_id','=',entry.id).executeTakeFirstOrThrow();if(old.revision!==entry.revision)throw new Error('Infrastructure revision changed.');const secrets=old.encrypted_secrets?decryptSecrets(old.public_id,old.encrypted_secrets):{};if(entry.password)secrets.password=entry.password;await trx.updateTable('infrastructure_services').set({...entry.details,encrypted_secrets:encryptSecrets(old.public_id,secrets),revision:old.revision+1,updated_at:new Date().toISOString(),updated_by:actor}).where('public_id','=',old.public_id).execute();}
return {updated,created,environmentVariables: variables,infrastructureUpdated:payload.infrastructure.length,verified:true};});console.log(JSON.stringify(result));
}catch{console.error('Refresh aborted. Review source formats and concurrent revisions; no secrets printed.');process.exitCode=1;}finally{await db.destroy();}
`;
const result=spawnSync('docker',['exec','-i','codeship-local-app-1','node','--input-type=module','-e',importer],{input:JSON.stringify(payload),encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
if(result.status!==0){console.error('Current-data refresh did not complete; no raw environment or credentials printed.');process.exitCode=1;}else console.log(result.stdout.trim());
