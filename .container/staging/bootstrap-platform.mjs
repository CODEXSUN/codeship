import {existsSync} from 'node:fs';
import {networkInterfaces} from 'node:os';
import {lookup} from 'node:dns/promises';
import {createRequire} from 'node:module';

const root='/opt/codebiz/apps/platform';
class BootstrapError extends Error {}
function fail(message){throw new BootstrapError(message);}
function validateUrl(value,database){
 if(typeof value!=='string')fail('Database target missing');
 let url;try{url=new URL(value);}catch{fail('Invalid database target');}
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='postgres'||(url.port||'5432')!=='5432'||decodeURIComponent(url.username)!=='platform_service'||!url.password||url.pathname!=='/'+database||url.hash||[...url.searchParams.keys()].some(key=>key!=='sslmode')||(url.searchParams.has('sslmode')&&url.searchParams.get('sslmode')!=='disable'))fail('Database target is not the selected staging database');
 return url;
}
try{
 if(process.env.CODESHIP_STAGING_BOOTSTRAP!=='1'||process.env.PLATFORM_BIND_MODE!=='docker-direct'||!existsSync('/.dockerenv')||process.cwd()!==root)fail('Staging bootstrap guard failed');
 const interfaces=Object.values(networkInterfaces()).flat().filter(Boolean);if(!interfaces.some(row=>row.address==='172.30.40.10'))fail('Staging Platform address differs');
 const addresses=await lookup('postgres',{all:true});if(addresses.length!==1||addresses[0].address!=='172.30.40.2')fail('Staging PostgreSQL address differs');
 let text='';for await(const part of process.stdin){text+=part;if(Buffer.byteLength(text)>16384)fail('Input too large');}
 const input=JSON.parse(text);if(!input||Object.keys(input).sort().join(',')!=='masterURL,owner,tenantURL')fail('Invalid bootstrap input');
 const masterURL=validateUrl(input.masterURL,'platform_master'),tenantURL=validateUrl(input.tenantURL,'platform_codexsun');
 if(masterURL.origin!==tenantURL.origin||masterURL.password!==tenantURL.password)fail('Database connection scope differs');
 const owner=input.owner;if(!owner||Object.keys(owner).sort().join(',')!=='email,name,password,username'||owner.username!=='stageowner'||owner.email!=='stageowner@example.invalid'||owner.name!=='Staging owner'||typeof owner.password!=='string'||!/^[a-f0-9]{32,128}$/.test(owner.password))fail('Synthetic staging owner differs');
 const {sql}=createRequire(root+'/package.json')('kysely');
 const {openMasterDatabase,masterMigrator}=await import(root+'/src/api/database/master-migrator.ts');
 const {openTenantDatabase}=await import(root+'/src/api/database/tenant-migrator.ts');
 const {tenantPreparation,prepareTenant}=await import(root+'/src/api/modules/tenant/registration.ts');
 const master=openMasterDatabase(masterURL.href),tenant=openTenantDatabase(tenantURL.href);
 try{
  for(const [db,name] of [[master,'platform_master'],[tenant,'platform_codexsun']]){
   const actual=(await sql`SELECT current_database() AS name,current_user AS username`.execute(db)).rows[0];if(actual.name!==name||actual.username!=='platform_service')fail('Database identity differs');
   const objects=(await sql`SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f') UNION ALL SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' LIMIT 1`.execute(db)).rows;if(objects.length)fail('Staging database is not empty; bootstrap refused');
  }
  // Validate the credentials and profile with the existing native validator, using a
  // loopback-shaped validation URL only after checking the actual staging network.
  const validationURL=new URL(tenantURL.href);validationURL.hostname='127.0.0.1';
  const profile=tenantPreparation({corporateId:'codexsun',name:'Codexsun',databaseName:'platform_codexsun',connectionReference:'env:PLATFORM_TENANT_DATABASE_URL',ownerReference:'env:STAGING_OWNER'}, {PLATFORM_TENANT_DATABASE_URL:validationURL.href,STAGING_OWNER_USERNAME:owner.username,STAGING_OWNER_EMAIL:owner.email,STAGING_OWNER_NAME:owner.name,STAGING_OWNER_PASSWORD:owner.password});
  const result=await masterMigrator(master).migrateToLatest();if(result.error||result.results?.some(row=>row.status!=='Success'))fail('Master migration failed');
  const prepared=await prepareTenant(master,tenant,{...profile,connection:tenantURL.href});
  await master.transaction().execute(async tx=>{for(const hostname of ['127.0.0.1','localhost'])await sql`INSERT INTO public.shared_hosts(hostname_key,created_by,updated_by) VALUES(${hostname},'system:staging-bootstrap','system:staging-bootstrap')`.execute(tx);});
  const users=(await sql`SELECT public_id FROM public.users WHERE username_key=${owner.username} AND email_key=${owner.email}`.execute(tenant)).rows;if(users.length!==1||!/^[a-z0-9]{8}$/.test(users[0].public_id))fail('Staging owner identity differs');
  console.log(JSON.stringify({tenantId:prepared.tenantId,ownerId:users[0].public_id}));
 }finally{await Promise.all([master.destroy(),tenant.destroy()]);}
}catch(error){console.error('Staging bootstrap refused or failed: '+(error instanceof BootstrapError?error.message:'check private diagnostics'));process.exitCode=1;}
