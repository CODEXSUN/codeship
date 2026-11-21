import {createRequire} from 'node:module';
import {existsSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {lookup} from 'node:dns/promises';
import {networkInterfaces} from 'node:os';

/** Selected installation input only. Never log or serialize this account. */
export function validateIilabsOwner(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Private IILabs owner configuration required.');
  if(Object.keys(input).length!==4||Object.keys(input).some(key=>!['USERNAME','EMAIL','NAME','PASSWORD'].includes(key)))throw Error('Only the four private IILabs owner fields are accepted.');
  const value=Object.fromEntries(['USERNAME','EMAIL','NAME','PASSWORD'].map(key=>[key,input[key]]));
  if(value.USERNAME!=='codexsun'||value.EMAIL!=='iilabs@admin.com'||typeof value.NAME!=='string'||!value.NAME.trim()||value.NAME.length>180||/[\r\n\0]/.test(value.NAME)||typeof value.PASSWORD!=='string'||/[\r\n\0]/.test(value.PASSWORD)||value.PASSWORD.length<8||value.PASSWORD.length>128||Buffer.byteLength(value.PASSWORD)>512)throw Error('Private IILabs owner configuration differs from the approved installation.');
  return {username:value.USERNAME,email:value.EMAIL,name:value.NAME.trim(),password:value.PASSWORD};
}

export function iilabsTenantProfile(owner,connection){
  const account=validateIilabsOwner(owner);
  let url;try{url=new URL(connection);}catch{throw Error('Configure the selected IILabs tenant database.');}
  if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='postgres'||url.port!=='5432'||url.pathname!=='/platform_iilabs'||url.username!=='platform_iilabs'||!url.password||url.hash||url.search)throw Error('IILabs tenant database must use its independent private role and exact database.');
  return {corporateId:'iilabs',name:'IILabs',databaseName:'platform_iilabs',reference:'env:PLATFORM_TENANT_IILABS_DATABASE_URL',connection:url.href,account};
}

/** Reuses the released Platform tenant schemas/identity constructor unchanged.
 * The caller must first retain a checked master backup and fresh DB ownership.
 * No native tenant validator is loosened, and existing identities are refused.
 */
export async function prepareIilabsTenant(master,target,profile,{deploymentKey='hostinger-914719'}={}){
  if(!['hostinger-914719','ubuntu-staging'].includes(deploymentKey))throw Error('Unregistered IILabs tenant target.');
  if(deploymentKey==='ubuntu-staging'){
    const addresses=await lookup('postgres',{all:true});
    if(process.env.CODESHIP_IILABS_STAGING!=='1'||!existsSync('/.dockerenv')||!Object.values(networkInterfaces()).flat().some(row=>row?.address?.startsWith('172.30.40.'))||addresses.length!==1||addresses[0].address!=='172.30.40.2')throw Error('Synthetic staging tenant target differs.');
  }
  const checked=iilabsTenantProfile({USERNAME:profile.account?.username,EMAIL:profile.account?.email,NAME:profile.account?.name,PASSWORD:profile.account?.password},profile.connection);
  if(profile.corporateId!==checked.corporateId||profile.databaseName!==checked.databaseName||profile.reference!==checked.reference)throw Error('IILabs tenant profile identity differs.');
  const base='file:///opt/codebiz/apps/platform/';
  const {sql}=createRequire('/opt/codebiz/apps/platform/package.json')('kysely');
  const current=(await sql`SELECT public_id FROM public.tenants WHERE code_key='iilabs'`.execute(master)).rows;
  if(current.length)throw Error('IILabs tenant already exists; preserve it and verify its ownership rather than creating or resetting an owner.');
  const conflicts=(await sql`SELECT 1 FROM public.tenant_domains WHERE hostname_key='iilabs.in' UNION ALL SELECT 1 FROM public.shared_hosts WHERE hostname_key='iilabs.in'`.execute(master)).rows;
  if(conflicts.length)throw Error('IILabs hostname already has a registry owner; preserve it for review.');
  const identity=await sql`SELECT current_database() AS name`.execute(target);
  if(identity.rows[0]?.name!=='platform_iilabs')throw Error('IILabs tenant database identity differs.');
  const tables=(await sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`.execute(target)).rows;
  if(tables.length)throw Error('Fresh IILabs tenant database is not empty; installation stopped.');
  const {prepareTenant}=await import(base+'src/api/modules/tenant/registration.ts');
  const result=await prepareTenant(master,target,checked);
  await master.transaction().execute(async tx=>{
    await sql`UPDATE public.tenant_databases SET deployment_key=${deploymentKey} WHERE tenant_id=(SELECT id FROM public.tenants WHERE public_id=${result.tenantId}) AND database_name='platform_iilabs' AND connection_secret_ref='env:PLATFORM_TENANT_IILABS_DATABASE_URL'`.execute(tx);
    await sql`INSERT INTO public.shared_hosts(hostname_key,created_by,updated_by) VALUES('iilabs.in','system:iilabs-install','system:iilabs-install')`.execute(tx);
  });
  return {tenantId:result.tenantId,status:result.status,corporateId:'iilabs',database:'platform_iilabs',dataImported:false};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===realpathSync(process.argv[1])){
  let master,target;
  try{
    if(!existsSync('/.dockerenv')||process.cwd()!=='/opt/codebiz/apps/platform'||process.env.CODESHIP_IILABS_TENANT_SETUP!=='1')throw Error('Use the selected released IILabs installation entry.');
    const p='IILABS_OWNER_',owner=Object.fromEntries(['USERNAME','EMAIL','NAME','PASSWORD'].map(key=>[key,process.env[p+key]]));
    const profile=iilabsTenantProfile(owner,process.env.PLATFORM_TENANT_IILABS_DATABASE_URL);
    const {openMasterDatabase}=await import('file:///opt/codebiz/apps/platform/src/api/database/master-migrator.ts');
    const {openTenantDatabase}=await import('file:///opt/codebiz/apps/platform/src/api/database/tenant-migrator.ts');
    master=openMasterDatabase(process.env.PLATFORM_MASTER_DATABASE_URL);target=openTenantDatabase(profile.connection);
    console.log(JSON.stringify(await prepareIilabsTenant(master,target,profile)));
  }catch{console.error('IILabs tenant installation stopped; private configuration and partial state retained.');process.exitCode=1;}
  finally{await target?.destroy();await master?.destroy();}
}
