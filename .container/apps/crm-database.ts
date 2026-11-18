import mysql from 'mysql2/promise';
import{randomBytes,createHash}from'node:crypto';import{readFile,writeFile,rename}from'node:fs/promises';import{existsSync}from'node:fs';import path from'node:path';
import{appRoot,openDatabase}from'../../src/api/database.ts';import{decryptSecrets}from'../../src/api/modules/master/application/vault.ts';
const database='app_crm_source';const validName=(name:string)=>/^[a-z][a-z0-9_]{0,63}$/.test(name);
export function crmTablePrivileges(table:string){
 if(/^core_contacts_(phones|emails|addresses|bank_accounts|social_links)$/.test(table))return 'select, insert, update, delete';
 if(['core_contacts','crm_enquiries','crm_tasks'].includes(table))return 'select, insert, update';
 if(table==='crm_enquiry_number_sequence')return 'select, update';
 if(['crm_enquiry_activity','crm_task_activity'].includes(table))return 'select, insert';
 return 'select';
}
export function crmImportUrl(value:string){const source=new URL(value);if(source.protocol!=='mysql:'||!['127.0.0.1','localhost'].includes(source.hostname)||(source.port||'3306')!=='3306')throw Error('CRM requires the explicitly configured native legacy source.');return source;}
const canonical=(rows:any[])=>JSON.stringify(rows,(_key,value)=>typeof value==='bigint'?String(value):value);
/** First-copy compatibility adapter only. Never resets, reimports or migrates native data. */
export async function prepareCrmDatabase(env:Record<string,string>,native:Record<string,string>,docker:(args:string[],input?:string|Buffer)=>string,persist:()=>Promise<void>,stage:(name:string,status:string,details?:Record<string,unknown>)=>Promise<void>){
 const root=path.join(appRoot,'.codeship/apps/crm'),marker=path.join(root,'legacy-import.json');
 const network=JSON.parse(docker(['network','inspect','applications_backend']))[0];
 const containers=docker(['ps','--no-trunc','-q','--filter','label=com.docker.compose.project=codebiz-infra','--filter','label=com.docker.compose.service=mariadb']).split('\n').filter(Boolean);
 if(containers.length!==1||!/^[a-f0-9]{64}$/.test(containers[0]))throw Error('Resolve the registered legacy MariaDB service.');
 if(!Object.hasOwn(network.Containers??{},containers[0]))docker(['network','connect','--alias','mariadb','applications_backend',containers[0]]);
 if(existsSync(marker)){
  const record=JSON.parse(await readFile(marker,'utf8'));const target=new URL(env.CRM_SOURCE_DATABASE_URL??'');
  if(record.status!=='imported'||record.database!==database||target.hostname!=='mariadb'||target.pathname!=='/'+database||decodeURIComponent(target.username)!==database)throw Error('Existing CRM copy binding differs. Retain it for recovery.');
  await stage('legacy-database','preserved',{database,recopied:false});return;
 }
 const sourceUrl=crmImportUrl(native.CRM_SOURCE_DATABASE_URL??'');
 if(!native.CRM_SOURCE_ACTORS||!native.CRM_PLATFORM_TENANT_ID)throw Error('Configure the reviewed source-account mapping before copying.');
 const registry=openDatabase();let config:any;
 try{const row=await registry.db.selectFrom('infrastructure_services').selectAll().where('kind','=','mariadb').where('environment','=','local-docker').executeTakeFirstOrThrow();const secrets=row.encrypted_secrets?decryptSecrets(row.public_id,row.encrypted_secrets):{};config={host:'127.0.0.1',port:row.port??3307,user:row.username,password:secrets.password};}finally{await registry.db.destroy();}
 const admin=await mysql.createConnection({...config,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false});
 const source=await mysql.createConnection({host:sourceUrl.hostname,port:3306,user:decodeURIComponent(sourceUrl.username),password:decodeURIComponent(sourceUrl.password),database:decodeURIComponent(sourceUrl.pathname.slice(1)),dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false});
 try{
  if((await admin.query<any[]>('select schema_name from information_schema.schemata where schema_name=?',[database]))[0].length||(await admin.query<any[]>('select user from mysql.user where user=?',[database]))[0].length)throw Error('CRM target database or role exists without a checked import marker.');
  const password=randomBytes(32).toString('hex');const target=new URL('mysql://mariadb:'+config.port+'/'+database);target.username=database;target.password=password;
  env.CRM_SOURCE_DATABASE_URL=target.href;env.CRM_SOURCE_ACTORS=native.CRM_SOURCE_ACTORS;env.CRM_SOURCE_WRITES_ENABLED='1';
  await persist();await stage('legacy-recovery-settings','passed',{encryptedRegistry:true});
  const [all]=await source.query<any[]>('show tables');const selected=new Set<string>(all.map(row=>String(Object.values(row)[0])).filter(name=>/^crm_|^contact_/.test(name)||/^core_contacts(?:_|$)/.test(name)||['app_users','core_contact_types','core_contact_groups','core_address_types','core_bank_names','core_countries','core_states','core_districts','core_cities','core_pincodes'].includes(name)));
  const [keys]=await source.query<any[]>('select table_name,referenced_table_name from information_schema.key_column_usage where table_schema=database() and referenced_table_name is not null');
  let changed=true;while(changed){changed=false;for(const key of keys)if(selected.has(key.table_name)&&!selected.has(key.referenced_table_name)){selected.add(key.referenced_table_name);changed=true;}}
  if([...selected].some(name=>!validName(name)))throw Error('Unexpected source table name.');
  await source.query("set time_zone='+00:00'");await source.query('set transaction isolation level repeatable read');await source.query('start transaction with consistent snapshot, read only');
  const snapshot:{table:string;ddl:string;rows:any[]}[]=[];
  for(const table of [...selected].sort()){
   const [definition]=await source.query<any[]>('show create table `'+table+'`');const [rows]=await source.query<any[]>('select * from `'+table+'` order by id');
   if(table==='app_users')for(const row of rows)row.password_hash='disabled:platform-owned';
   snapshot.push({table,ddl:definition[0]['Create Table'],rows});
  }
  const file=path.join(root,'private','legacy-source-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
  await writeFile(file,JSON.stringify({schema:1,scope:'CRM compatibility copy; password hashes excluded',tables:snapshot}),{mode:0o600});
  await source.commit();
  await admin.query('create database `'+database+'` character set utf8mb4');await admin.query("create user '"+database+"'@'%' identified by ?",[password]);
  await admin.query('use `'+database+'`');await admin.query("set time_zone='+00:00'");await admin.query('set foreign_key_checks=0');
  for(const entry of snapshot)await admin.query(entry.ddl.replace(/CONSTRAINT `[^`]+`/g,(_match:string,offset:number)=>'CONSTRAINT `fk_'+createHash('sha256').update(entry.table+':'+offset).digest('hex').slice(0,32)+'`'));
  for(const entry of snapshot){
   for(const row of entry.rows){const columns=Object.keys(row);if(columns.some(key=>!validName(key)))throw Error('Unexpected source column.');await admin.query('insert into `'+entry.table+'` ('+columns.map(key=>'`'+key+'`').join(',')+') values ('+columns.map(()=>'?').join(',')+')',Object.values(row));}
  }
  await admin.query('set foreign_key_checks=1');
  const counts:Record<string,number>={};
  for(const entry of snapshot){const [copied]=await admin.query<any[]>('select * from `'+entry.table+'` order by id');if(canonical(copied)!==canonical(entry.rows))throw Error('Copied CRM records or public identities differ.');counts[entry.table]=copied.length;
   await admin.query('grant '+crmTablePrivileges(entry.table)+' on `'+database+'`.`'+entry.table+'` to \''+database+'\'@\'%\'');
  }
  // FK checks were disabled only on this private import connection. Prove every copied relationship.
  for(const key of keys.filter(key=>selected.has(key.table_name))){
   const [relations]=await admin.query<any[]>('select column_name,referenced_column_name from information_schema.key_column_usage where table_schema=? and table_name=? and referenced_table_name=?',[database,key.table_name,key.referenced_table_name]);
   for(const relation of relations){if(!validName(relation.column_name)||!validName(relation.referenced_column_name))throw Error('Unexpected relationship column.');const [missing]=await admin.query<any[]>('select count(*) n from `'+key.table_name+'` c left join `'+key.referenced_table_name+'` p on p.`'+relation.referenced_column_name+'`=c.`'+relation.column_name+'` where c.`'+relation.column_name+'` is not null and p.`'+relation.referenced_column_name+'` is null');if(Number(missing[0].n))throw Error('A copied CRM relationship is missing.');}
  }
  const record={status:'imported',database,engine:'existing MariaDB compatibility store',tables:counts,backup:file,sha256:createHash('sha256').update(await readFile(file)).digest('hex'),passwordHashesCopied:false,nativeModified:false,at:new Date().toISOString()};
  await writeFile(marker+'.next',JSON.stringify(record,null,2),{mode:0o600});await rename(marker+'.next',marker);await stage('legacy-database','passed',{database,tables:snapshot.length,rows:Object.values(counts).reduce((sum,value)=>sum+value,0),nativeModified:false});
 }catch(error){const code=String((error as {code?:string}).code??'REVIEW_REQUIRED');throw Error('CRM legacy copy stopped; recovery files retained ('+(/^[A-Z0-9_]+$/.test(code)?code:'REVIEW_REQUIRED')+').');}finally{await source.end();await admin.end();}
}
