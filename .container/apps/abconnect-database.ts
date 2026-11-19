import pg from 'pg';
import {randomBytes} from 'node:crypto';

/** Reviewed fresh installation. Native business data is deliberately never imported. */
export async function prepareAbconnectDatabase(adminConfig:pg.ClientConfig, env:Record<string,string>, persist:()=>Promise<void>) {
 const admin=new pg.Client(adminConfig);await admin.connect();
 try {
  const exists=await admin.query("select 1 from pg_database where datname='app_abconnect' union all select 1 from pg_roles where rolname in ('app_abconnect_runtime','app_abconnect_migrator')");
  if(exists.rowCount)throw Error('Fresh Abconnect database/roles already exist without a provisioning marker. Retain them for reviewed recovery.');
  const runtime=randomBytes(32).toString('hex'),migration=randomBytes(32).toString('hex');
  env.ABCONNECT_DATABASE_URL=`postgresql://app_abconnect_runtime:${runtime}@postgres:5432/app_abconnect`;
  env.ABCONNECT_MIGRATION_DATABASE_URL=`postgresql://app_abconnect_migrator:${migration}@postgres:5432/app_abconnect`;
  env.ABCONNECT_DATABASE_TRANSPORT='private-docker';
  await persist(); // Encrypted recovery credentials precede irreversible provisioning.
  await admin.query(`create role app_abconnect_migrator login password '${migration}' nosuperuser nocreatedb nocreaterole nobypassrls`);
  await admin.query(`create role app_abconnect_runtime login password '${runtime}' nosuperuser nocreatedb nocreaterole nobypassrls`);
  await admin.query('create database app_abconnect owner app_abconnect_migrator');
  await admin.query('revoke all on database app_abconnect from public');
  await admin.query('grant connect on database app_abconnect to app_abconnect_runtime');
  const db=new pg.Client({...adminConfig,database:'app_abconnect'});await db.connect();
  try{await db.query('revoke all on schema public from public; grant usage,create on schema public to app_abconnect_migrator; grant usage on schema public to app_abconnect_runtime');}finally{await db.end();}
 }finally{await admin.end();}
}
export async function grantAbconnectRuntime(adminConfig:pg.ClientConfig){
 const db=new pg.Client({...adminConfig,database:'app_abconnect'});await db.connect();
 try{await db.query(`grant select,insert,update on companies,members,enquiries,products,requirements,events,insights,social_campaigns,social_posts,social_leads,public_intake_limits to app_abconnect_runtime;
 grant select,insert on activity_events,public_submission_requests to app_abconnect_runtime;
 grant usage,select on all sequences in schema public to app_abconnect_runtime;`);}finally{await db.end();}
}
