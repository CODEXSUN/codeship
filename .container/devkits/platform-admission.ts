// Mounted into the approved Platform image as scripts/codeship-devkit-admission.ts.
import {sql} from 'kysely';
import {openMasterDatabase} from '../src/api/database/master-migrator.ts';
import {openTenantDatabase} from '../src/api/database/tenant-migrator.ts';
import {readGatewayConfiguration} from '../src/api/modules/gateway/configuration.ts';
import {containerReleaseProfile,prepareContainerRelease,completeContainerRelease} from '../src/api/modules/installation/container.ts';
let text='';for await(const chunk of process.stdin){text+=chunk;if(text.length>32768)throw Error('Admission input too large.');}
const input=JSON.parse(text),configuration=readGatewayConfiguration(process.env,'production');
if(!configuration||!['prepare','complete'].includes(input.action)||!['codeship','codeitz','uiux'].includes(input.profile?.manifest?.appKey))throw Error('Select one approved devkit admission.');
const profile=containerReleaseProfile(input.profile,configuration),master=openMasterDatabase(process.env.PLATFORM_MASTER_DATABASE_URL??'');
try{
 const result=input.action==='prepare'?await prepareContainerRelease(master,profile):await completeContainerRelease(master,profile,configuration);
 let granted=0;
 if(input.action==='complete'&&input.approvedSuperAdministrators?.length){
  const ids=input.approvedSuperAdministrators;
  if(!Array.isArray(ids)||ids.length>100||new Set(ids).size!==ids.length||ids.some((id:unknown)=>typeof id!=='string'||!/^[a-z0-9]{8}$/.test(id)))throw Error('Invalid existing super administrator decision.');
  const tenant=openTenantDatabase(process.env.PLATFORM_TENANT_DATABASE_URL??'');
  try{await tenant.transaction().execute(async tx=>{
   for(const id of ids){
    const users=(await sql<{id:number}>`SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.public_id=${id} AND u.active AND u.status='active' AND ur.status='active' AND r.active AND r.code='sa'`.execute(tx)).rows;
    if(users.length!==1)throw Error('An approved existing super administrator changed; review access before continuing.');
    const existing=(await sql`SELECT 1 FROM user_app_grants WHERE user_id=${users[0].id} AND app_key=${profile.manifest.appKey}`.execute(tx)).rows;
    if(existing.length)continue;
    await sql`INSERT INTO user_app_grants(user_id,app_key,permissions,created_by,updated_by) VALUES(${users[0].id},${profile.manifest.appKey},${JSON.stringify(profile.manifest.permissionKeys)}::jsonb,'system:approved-existing-sa','system:approved-existing-sa')`.execute(tx);granted++;
   }
  });}finally{await tenant.destroy();}
 }
 console.log(JSON.stringify({...result,grantedExistingSuperAdministrators:granted}));
}catch{console.error('Selected devkit admission failed. Existing identities and permissions were retained; inspect the stage record.');process.exitCode=1;}finally{await master.destroy();}
