import {sql} from 'kysely';
import {openMasterDatabase} from '/opt/codebiz/apps/platform/src/api/database/master-migrator.ts';
import {openTenantDatabase} from '/opt/codebiz/apps/platform/src/api/database/tenant-migrator.ts';
import {preserveHistoricalProofsAndRetire} from './platform-identity-retirement.mjs';
let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>16384)throw Error('Bounded historical recovery input required');}
const options=JSON.parse(input),master=openMasterDatabase(process.env.PLATFORM_MASTER_DATABASE_URL??''),connections=[];
try{
 const registrations=(await sql`SELECT d.database_name,d.connection_secret_ref,t.public_id,t.code_key FROM public.tenant_databases d JOIN public.tenants t ON t.id=d.tenant_id WHERE d.active AND t.active`.execute(master)).rows;
 if(registrations.length!==1||registrations[0].code_key!=='codexsun')throw Error('Reviewed preservation covers the existing Codexsun tenant only');
 const targets=[];
 for(const row of registrations){
  if(!/^env:PLATFORM_TENANT(?:_[A-Z0-9]+)*_DATABASE_URL$/.test(row.connection_secret_ref??''))throw Error('Unresolved tenant preservation secret');
  const value=process.env[row.connection_secret_ref.slice(4)];if(!value||new URL(value).pathname!=='/'+row.database_name)throw Error('Tenant preservation scope mismatch');
  const db=openTenantDatabase(value);connections.push(db);targets.push({publicId:row.public_id,database:row.database_name,db});
 }
 console.log(JSON.stringify(await preserveHistoricalProofsAndRetire(master,targets,options)));
}finally{await Promise.all(connections.map(db=>db.destroy()));await master.destroy();}
