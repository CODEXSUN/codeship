export const retirementMigration='20261120000000_retire_master_identity';
export const platformRetirementProbeCode=`
import {sql} from 'kysely';
import {openMasterDatabase} from './src/api/database/master-migrator.ts';
import {legacyIdentitySnapshot} from './src/api/modules/identity/database/migrations/20261120000000_retire_master_identity.ts';
const db=openMasterDatabase(process.env.PLATFORM_MASTER_DATABASE_URL??'');
try{const snapshot=await db.transaction().execute(async tx=>{await sql.raw('SET TRANSACTION READ ONLY').execute(tx);await sql.raw(\"SET LOCAL TIME ZONE 'UTC'\").execute(tx);return legacyIdentitySnapshot(tx);});console.log(JSON.stringify({present:!!snapshot,counts:snapshot?.counts??{}}));}finally{await db.destroy();}
`;
/** Refuse an unsupported populated retirement before stopping the existing writer. */
export function assertPlatformRetirementPreflight(plans,probe){
 const selected=plans?.find(row=>row.scope==='master');
 if(!Array.isArray(selected?.pending))throw Error('Platform master migration plan missing');
 if(!selected.pending.includes(retirementMigration))return;
 const snapshot=probe();
 if(typeof snapshot?.present!=='boolean'||!snapshot.counts||typeof snapshot.counts!=='object'||Array.isArray(snapshot.counts))throw Error('Platform legacy retirement preflight unavailable');
 const expected=['users','user_credentials','sessions','tenant_memberships','platform_operators'];
 if(snapshot.present&&(Object.keys(snapshot.counts).length!==expected.length||expected.some(key=>!Number.isSafeInteger(snapshot.counts[key])||snapshot.counts[key]<0)))throw Error('Platform legacy retirement counts incomplete');
 if(!snapshot.present&&Object.keys(snapshot.counts).length)throw Error('Platform legacy retirement presence differs');
 if(Object.values(snapshot.counts).some(count=>count>0))throw Error('Populated Platform master identity retirement requires the separately verified preservation adapter; existing writer was not stopped');
}
