// Run only inside a released Platform image on the nested disposable test daemon.
import {Pool} from 'pg';
import {Kysely,PostgresDialect,sql} from 'kysely';
import {masterMigrator} from './src/api/database/master-migrator.ts';
import {installTenantIdentity} from './src/api/database/tenant-migrator.ts';
import {identityService} from './src/api/modules/identity/service.ts';
import {identityRepository} from './src/api/modules/identity/repository.ts';
import {existsSync} from 'node:fs';
if(process.env.CODESHIP_DISPOSABLE_PLATFORM_TEST!=='1'||!/^platform-lifecycle-[a-f0-9]{8}$/.test(process.env.CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN??'')||!existsSync('/.dockerenv'))throw Error('Disposable fixture container and run opt-in required');
const base='postgresql://postgres:disposable-admin-only@postgres:5432/';
const opened=[];
const open=name=>{const db=new Kysely({dialect:new PostgresDialect({pool:new Pool({connectionString:base+name,max:2})})});opened.push(db);return db;};
try{
 const admin=open('postgres');
 await sql`CREATE DATABASE fixture_master`.execute(admin);await sql`CREATE DATABASE fixture_tenant`.execute(admin);
 const master=open('fixture_master'),tenant=open('fixture_tenant');
 const migration=await masterMigrator(master).migrateToLatest();if(migration.error)throw migration.error;
 await installTenantIdentity(tenant,'tenant01');
 await sql`INSERT INTO tenants(public_id,code,name,status,created_by,updated_by) VALUES('tenant01','codexsun','Disposable Codexsun','active','test','test')`.execute(master);
 await sql`INSERT INTO tenant_databases(public_id,tenant_id,deployment_key,database_name,connection_secret_ref,status,created_by,updated_by) SELECT 'database',id,'hostinger','platform_codexsun','env:PLATFORM_TENANT_DATABASE_URL','ready','test','test' FROM tenants`.execute(master);
 const user=await identityService(identityRepository(tenant,true)).create({username:'fixture-owner',email:'owner@example.test',displayName:'Disposable owner',password:'disposable-fixture-password-only'},'test');
 await sql`INSERT INTO user_roles(user_id,role_id) SELECT u.id,r.id FROM users u CROSS JOIN roles r WHERE u.public_id=${user.publicId} AND r.code='sa'`.execute(tenant);
 await sql`CREATE TABLE business_records(value text);INSERT INTO business_records VALUES('synthetic source only')`.execute(tenant);
 const payload={schema:1,master:{},tenant:{}};
 for(const table of ['users','user_credentials','platform_operators','tenants','tenant_memberships','tenant_databases'])payload.master[table]=(await sql`SELECT * FROM ${sql.table(table)}`.execute(master)).rows;
 for(const table of ['users','user_credentials','roles','user_roles','user_app_grants','app_roles','app_role_grants','app_user_roles'])payload.tenant[table]=(await sql`SELECT * FROM ${sql.table(table)}`.execute(tenant)).rows;
 console.log(JSON.stringify(payload));
}finally{for(const db of opened)await db.destroy();}
