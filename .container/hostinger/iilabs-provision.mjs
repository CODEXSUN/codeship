import {createRequire} from 'node:module';
import {iilabsTenantProfile,prepareIilabsTenant} from './iilabs-tenant.mjs';
import {pathToFileURL} from 'node:url';
import {realpathSync} from 'node:fs';

export async function provisionIilabsDatabases(admin,settings) {
  const scopes=[['app_iilabs','app_iilabs_migrator','app_iilabs_runtime'],['platform_iilabs','platform_iilabs']];
  const urls={app_iilabs_migrator:settings.IILABS_MIGRATION_DATABASE_URL,app_iilabs_runtime:settings.IILABS_DATABASE_URL,platform_iilabs:settings.PLATFORM_TENANT_IILABS_DATABASE_URL};
  for(const [database,...roles] of scopes) {
    if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[database])).rowCount)throw Error('Selected database already exists; preserve partial ownership for review.');
    for(const role of roles){const url=new URL(urls[role]);if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='postgres'||url.port!=='5432'||url.pathname!=='/'+database||url.username!==role||!url.password||url.search||url.hash)throw Error('Independent database credential scope differs.');if((await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount)throw Error('Selected role already exists; preserve it.');}
  }
  for(const [database,...roles] of scopes){
    for(const role of roles){const password=decodeURIComponent(new URL(urls[role]).password);const q=(await admin.query("SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',$1::text,$2::text)",[role,password])).rows[0].format;await admin.query(q);}
    await admin.query('CREATE DATABASE '+database+' OWNER '+roles[0]);
    await admin.query('REVOKE ALL ON DATABASE '+database+' FROM PUBLIC');
    if(roles.length>1)await admin.query('GRANT CONNECT ON DATABASE '+database+' TO '+roles[1]);
  }
}
export async function grantIilabsTables(db) {
  await db.query('REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE,CREATE ON SCHEMA public TO app_iilabs_migrator; GRANT USAGE ON SCHEMA public TO app_iilabs_runtime');
  for(const table of ['iilabs_clients','iilabs_credentials','iilabs_campaigns','iilabs_influencers','iilabs_social_accounts','iilabs_insights','iilabs_client_access','iilabs_team_members','iilabs_team_clients','iilabs_public_profiles','iilabs_public_images']){
    if(!(await db.query('SELECT to_regclass($1) AS name',[table])).rows[0].name)throw Error('Required IILabs table is absent.');
    await db.query('GRANT SELECT,INSERT,UPDATE,DELETE ON '+table+' TO app_iilabs_runtime');
  }
  await db.query('GRANT SELECT ON kysely_migration TO app_iilabs_runtime; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO app_iilabs_runtime');
  const access=(await db.query("SELECT has_schema_privilege('app_iilabs_runtime','public','CREATE') AS schema_create,has_table_privilege('app_iilabs_runtime','kysely_migration','DELETE') AS history_delete,has_sequence_privilege('app_iilabs_runtime','iilabs_public_images_id_seq','USAGE') AS image_sequence,(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls FROM pg_roles WHERE rolname='app_iilabs_runtime') AS privileged")).rows[0];
  if(access.schema_create!==false||access.history_delete!==false||access.image_sequence!==true||access.privileged!==false)throw Error('IILabs runtime privileges exceed or miss the approved scope.');
}
export async function grantNewIilabsOwner(master,target,tenantId) {
  const base='file:///opt/codebiz/apps/platform/';const {sql}=createRequire('/opt/codebiz/apps/platform/package.json')('kysely');
  const identity=(await sql`SELECT public_id FROM tenant_identity_scope`.execute(target)).rows;
  if(identity.length!==1||identity[0].public_id!==tenantId)throw Error('New owner tenant scope differs.');
  const users=(await sql`SELECT id,public_id FROM users WHERE username_key='codexsun' AND email_key='iilabs@admin.com' AND active AND status='active'`.execute(target)).rows;
  const count=(await sql`SELECT count(*)::int AS n FROM users`.execute(target)).rows[0].n;
  if(users.length!==1||count!==1)throw Error('Only the explicitly provisioned fresh IILabs owner may receive access.');
  const apps=(await sql`SELECT permission_keys FROM apps WHERE app_key='iilabs' AND active AND status='active'`.execute(master)).rows;
  if(apps.length!==1||!apps[0].permission_keys.includes('iilabs/agency:manage'))throw Error('Registered IILabs permissions missing.');
  const {gatewayRepository}=await import(base+'src/api/modules/gateway/repository.ts');
  await gatewayRepository(target).setPermissions(users[0].id,'iilabs',apps[0].permission_keys,true,'system:codeship-iilabs-owner');
  return {ownerId:users[0].public_id,appKey:'iilabs',tenantId};
}
async function main(){
  if(process.cwd()!=='/opt/codebiz/apps/platform'||process.env.CODESHIP_IILABS_PROVISION!=='1')throw Error('Use selected IILabs provision adapter.');
  let bytes='';for await(const part of process.stdin){bytes+=part;if(Buffer.byteLength(bytes)>65536)throw Error('Private input exceeds limit.');}const input=JSON.parse(bytes),mode=process.argv[2];
  const require=createRequire(process.cwd()+'/package.json');const {Client}=require('pg');let db,master,target;
  try{
    if(mode==='databases'||mode==='grants'){
      db=new Client({...input.admin,database:mode==='grants'?'app_iilabs':'postgres'});await db.connect();
      if(mode==='databases')await provisionIilabsDatabases(db,input.settings);else await grantIilabsTables(db);
      console.log(JSON.stringify({mode,completed:true,dataImported:false}));return;
    }
    const base='file:///opt/codebiz/apps/platform/';const {openMasterDatabase}=await import(base+'src/api/database/master-migrator.ts');const {openTenantDatabase}=await import(base+'src/api/database/tenant-migrator.ts');
    master=openMasterDatabase(input.masterURL);
    if(mode==='hosts'){
      const {sql}=require('kysely');
      console.log(JSON.stringify((await sql`SELECT d.hostname_key AS hostname,d.verification_status,d.active,t.code AS tenant_code FROM tenant_domains d JOIN tenants t ON t.id=d.tenant_id WHERE d.hostname_key IN ('cx.codexsun.com','codeship.codexsun.com','codeitz.codexsun.com','uiux.codexsun.com') ORDER BY d.hostname_key`.execute(master)).rows));return;
    }
    const profile=iilabsTenantProfile(input.owner,input.settings.PLATFORM_TENANT_IILABS_DATABASE_URL);target=openTenantDatabase(profile.connection);
    if(mode==='tenant')console.log(JSON.stringify(await prepareIilabsTenant(master,target,profile,process.env.CODESHIP_IILABS_STAGING==='1'?{deploymentKey:'ubuntu-staging'}:{})));
    else if(mode==='owner')console.log(JSON.stringify(await grantNewIilabsOwner(master,target,input.tenantId)));
    else throw Error('Unsupported selected provisioning mode.');
  }finally{await db?.end();await target?.destroy();await master?.destroy();}
}
if(process.argv[1]&&pathToFileURL(realpathSync(process.argv[1])).href===import.meta.url)main().catch(()=>{console.error('IILabs provisioning stopped; private recovery retained.');process.exitCode=1;});
