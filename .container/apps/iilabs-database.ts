import pg from 'pg';
import {randomBytes} from 'node:crypto';

/** Fresh-only IILabs provisioning. Never reads a native database or copies records. */
export async function prepareIilabsDatabase(adminConfig:pg.ClientConfig,env:Record<string,string>,persist:()=>Promise<void>){
 const source=new URL(env.IILABS_DATABASE_URL??'');
 if(!['postgres:','postgresql:'].includes(source.protocol)||!['iilabs_app','app_iilabs_runtime'].includes(source.username)||!source.password||!['127.0.0.1','localhost','postgres'].includes(source.hostname)||!['/iilabs_db','/app_iilabs'].includes(source.pathname))throw Error('Configure the approved restricted IILabs runtime credential; never substitute infrastructure credentials.');
 const runtimeRole=source.username;
 const admin=new pg.Client(adminConfig);await admin.connect();
 try{
  const existing=await admin.query("select 1 from pg_database where datname='app_iilabs' union all select 1 from pg_roles where rolname in ($1,'app_iilabs_migrator')",[runtimeRole]);
  if(existing.rowCount)throw Error('IILabs database or roles already exist without a provisioning marker; preserve for recovery review.');
  const runtime=decodeURIComponent(source.password);
  const migrationURL=env.IILABS_MIGRATION_DATABASE_URL?new URL(env.IILABS_MIGRATION_DATABASE_URL):undefined;
  if(migrationURL&&(!['postgres:','postgresql:'].includes(migrationURL.protocol)||migrationURL.hostname!=='postgres'||migrationURL.pathname!=='/app_iilabs'||migrationURL.username!=='app_iilabs_migrator'||!migrationURL.password))throw Error('Review the configured IILabs migration credential.');
  const migration=migrationURL?decodeURIComponent(migrationURL.password):randomBytes(32).toString('hex');
  source.hostname='postgres';source.port='5432';source.pathname='/app_iilabs';source.search='';
  env.IILABS_DATABASE_URL=source.href;
  const migrationTarget=new URL(source);migrationTarget.username='app_iilabs_migrator';migrationTarget.password=migration;
  env.IILABS_MIGRATION_DATABASE_URL=migrationTarget.href;
  env.IILABS_VAULT_KEY ||= randomBytes(32).toString('hex');
  env.IILABS_DEMO_MODE='0';env.IILABS_SYNC_ENABLED='0';
  await persist();
  const literal=(value:string)=>"'"+value.replaceAll("'","''")+"'";
  await admin.query(`create role app_iilabs_migrator login password ${literal(migration)} nosuperuser nocreatedb nocreaterole nobypassrls`);
  await admin.query(`create role ${runtimeRole} login password ${literal(runtime)} nosuperuser nocreatedb nocreaterole nobypassrls`);
  await admin.query('create database app_iilabs owner app_iilabs_migrator');
  await admin.query('revoke all on database app_iilabs from public');
  await admin.query('grant connect on database app_iilabs to '+runtimeRole);
  const db=new pg.Client({...adminConfig,database:'app_iilabs'});await db.connect();
  try{await db.query('revoke all on schema public from public; grant usage,create on schema public to app_iilabs_migrator; grant usage on schema public to '+runtimeRole);}finally{await db.end();}
 }finally{await admin.end();}
}
export async function grantIilabsRuntime(adminConfig:pg.ClientConfig,env:Record<string,string>){
 const scope=new URL(env.IILABS_DATABASE_URL??'');const role=scope.username;
 if(scope.hostname!=='postgres'||scope.pathname!=='/app_iilabs'||!['iilabs_app','app_iilabs_runtime'].includes(role))throw Error('Invalid IILabs runtime grant scope.');
 const db=new pg.Client({...adminConfig,database:'app_iilabs'});await db.connect();
 try{
  await db.query(`grant select,insert,update,delete on iilabs_clients,iilabs_credentials,iilabs_campaigns,iilabs_influencers,iilabs_social_accounts,iilabs_insights,iilabs_client_access to ${role}; grant select on kysely_migration to ${role}; grant usage,select on all sequences in schema public to ${role}`);
 }finally{await db.end();}
}
