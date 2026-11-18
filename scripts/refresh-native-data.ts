import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {actor} from '../src/api/identity.ts';
import {openDatabase,workspaceRoot} from '../src/api/database.ts';
import {encryptSecrets,decryptSecrets} from '../src/api/modules/master/application/vault.ts';
import {serializeDeploymentEnvironment,accountPrefixes,installationUsers} from '../src/api/modules/master/application/accounts.ts';
import {currentEnvironment} from '../src/api/modules/master/application/environment.ts';

const apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(arg=>!['--apply','--dry-run'].includes(arg))||process.argv.includes('--apply')&&process.argv.includes('--dry-run'))throw new Error('Use --dry-run or --apply.');
const readEnv=(file:string)=>existsSync(file)?parseEnv(readFileSync(file,'utf8')):{};
const good=(value:string|undefined)=>!!value&&!/^(?:change[_-]|example|placeholder)/i.test(value);
const registry=JSON.parse(readFileSync(path.join(workspaceRoot,'mcp-governance/ports.json'),'utf8')).apps as {directory:string;prefix:string;api:number}[];
const sources=registry.map(entry=>({...entry,env:readEnv(path.join(workspaceRoot,entry.directory,'.env')),pkg:JSON.parse(readFileSync(path.join(workspaceRoot,entry.directory,'package.json'),'utf8'))}));
const legacy=readEnv(path.resolve(workspaceRoot,'../codexsun/.env'));
const platform=sources.find(entry=>entry.directory==='apps/platform')!.env;
function connection(value:string|undefined){if(!value)return {};const url=new URL(value);return {host:url.hostname,port:Number(url.port||5432),username:decodeURIComponent(url.username),database:decodeURIComponent(url.pathname.slice(1)),password:decodeURIComponent(url.password)};}
const {db}=openDatabase();
try{
 const result=await db.transaction().execute(async trx=>{
  let variables=0,preservedEdits=0;
  const applications=[];
  for(const source of sources){
   const old=await trx.selectFrom('applications').selectAll().where('owner','=',source.directory).where('environment','=','development').executeTakeFirstOrThrow();
   const secrets=old.encrypted_secrets?decryptSecrets(old.public_id,old.encrypted_secrets):{};
   const previous=currentEnvironment(secrets),snapshot=parseEnv(secrets.sourceEnv??secrets.env??''),merged={...previous,...source.env};
   // Retain keys edited since the last imported snapshot, including newly added keys.
   for(const [key,value] of Object.entries(previous))if(!(key in snapshot)||value!==snapshot[key]){merged[key]=value;preservedEdits++;}
   const users=installationUsers(secrets).map(({hasPassword,...user})=>{const prefix=accountPrefixes[user.role];return {...user,username:user.username||merged[prefix+'_USERNAME']||'',email:user.email||merged[prefix+'_EMAIL']||'',name:user.name||merged[prefix+'_NAME']||''};});
   for(const user of users){const password=merged[accountPrefixes[user.role]+'_PASSWORD'];if(!secrets[user.role+'Password']&&good(password))secrets[user.role+'Password']=password!;}
   const database=connection(source.env.PLATFORM_MASTER_DATABASE_URL);
   const username=database.username||source.env.PGUSER||'';
   const password=database.password||source.env.PGPASSWORD;
   if(!secrets.password&&good(password))secrets.password=password!;
   Object.assign(secrets,{users:JSON.stringify(users),sourceEnv:serializeDeploymentEnvironment(source.env),env:serializeDeploymentEnvironment(merged)});
   const fields={version:String(source.pkg.version),host:source.env[source.prefix+'_HOST']||old.host,port:Number(source.env[source.prefix+'_PORT']||source.api),username:old.username||username,encrypted_secrets:encryptSecrets(old.public_id,secrets),secret_revision:old.secret_revision+1,updated_at:new Date().toISOString(),updated_by:actor};
   if(apply){await trx.updateTable('applications').set(fields).where('public_id','=',old.public_id).where('secret_revision','=',old.secret_revision).executeTakeFirstOrThrow();const saved=await trx.selectFrom('applications').select('encrypted_secrets').where('public_id','=',old.public_id).executeTakeFirstOrThrow();const verified=currentEnvironment(decryptSecrets(old.public_id,saved.encrypted_secrets!));for(const [key,value]of Object.entries(merged))if(verified[key]!==value)throw new Error('Encrypted environment verification failed.');}
   variables+=Object.keys(source.env).length;applications.push({owner:source.directory,sourceVariables:Object.keys(source.env).length});
  }
  const infrastructure=[];
  for(const old of await trx.selectFrom('infrastructure_services').selectAll().execute()){
   const secrets=old.encrypted_secrets?decryptSecrets(old.public_id,old.encrypted_secrets):{};
   let values:Record<string,any>={},serviceEnv:Record<string,string>={};
   if(old.kind==='postgres'){
    const {password,...metadata}=connection(platform.PLATFORM_MASTER_DATABASE_URL);values=metadata;if(!secrets.password&&good(password))secrets.password=password!;
    if(platform.PLATFORM_MASTER_DATABASE_URL)serviceEnv.PLATFORM_MASTER_DATABASE_URL=platform.PLATFORM_MASTER_DATABASE_URL;
   }else if(old.kind==='redis'&&legacy.CODEXSUN_REDIS_URL){
    const url=new URL(legacy.CODEXSUN_REDIS_URL);values={host:url.hostname,port:Number(url.port||6379),username:decodeURIComponent(url.username)};const password=decodeURIComponent(url.password);if(!secrets.password&&good(password))secrets.password=password;serviceEnv.REDIS_URL=legacy.CODEXSUN_REDIS_URL;
   }else if(old.kind==='mariadb'&&legacy.DB_DRIVER==='mariadb'){
    values={host:legacy.DB_HOST,port:Number(legacy.DB_PORT||3306),username:legacy.DB_USER,database:legacy.DB_MASTER_NAME};if(!secrets.password&&good(legacy.DB_PASSWORD))secrets.password=legacy.DB_PASSWORD!;
    for(const key of ['DB_DRIVER','DB_HOST','DB_PORT','DB_USER','DB_MASTER_NAME','DB_PASSWORD'])if(legacy[key]!==undefined)serviceEnv[key]=legacy[key];
   }
   // Keep nonblank operator metadata and credentials; fill only available source values.
   const fill=Object.fromEntries(Object.entries(values).filter(([key,value])=>value!==undefined&&value!==''&&((old as any)[key]===null||(old as any)[key]==='')));
   if(Object.keys(serviceEnv).length)secrets.env=serializeDeploymentEnvironment({...serviceEnv,...parseEnv(secrets.env??'')});
   if(apply)await trx.updateTable('infrastructure_services').set({...fill,encrypted_secrets:Object.keys(secrets).length?encryptSecrets(old.public_id,secrets):null,revision:old.revision+1,updated_at:new Date().toISOString(),updated_by:actor}).where('public_id','=',old.public_id).execute();
   infrastructure.push({kind:old.kind,hasPassword:!!secrets.password,missing:['host','port','username','database'].filter(key=>(key!=='database'||['postgres','mariadb'].includes(old.kind))&&!((fill as any)[key]||(old as any)[key]))});
  }
  return {applied:apply,applications,sourceVariables:variables,preservedEdits,infrastructure};
 });
 console.log(JSON.stringify(result));
}catch{console.error('Native refresh aborted; transaction rolled back. Check source formats and registry records. No credentials printed.');process.exitCode=1;}finally{await db.destroy();}
