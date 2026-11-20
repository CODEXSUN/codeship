/** Historical records only; never derive these from the current tenant password. */
export function parseHistoricalIdentityMetadata(value){
 const sha=/^[a-f0-9]{64}$/;
 if(!value||value.schema!==1||value.source!=='existing-native-tenant'||Object.keys(value).sort().join(',')!=='rows,schema,source'||!Array.isArray(value.rows)||value.rows.length!==3||new Set(value.rows.map(row=>row?.public_id)).size!==3||value.rows.some(row=>!row||Object.keys(row).sort().join(',')!=='public_id,source_digest'||!/^[a-z0-9]{8}$/.test(row.public_id??'')||!sha.test(row.source_digest??'')))throw Error('Exactly three existing historical Platform identity proof records required');
 return value;
}
export const retirementMigration='20261120000000_retire_master_identity';
export const platformRetirementProbeCode=`
import {sql} from 'kysely';
import {openMasterDatabase} from './src/api/database/master-migrator.ts';
import {legacyIdentitySnapshot} from './src/api/modules/identity/database/migrations/20261120000000_retire_master_identity.ts';
const db=openMasterDatabase(process.env.PLATFORM_MASTER_DATABASE_URL??'');
try{const snapshot=await db.transaction().execute(async tx=>{await sql.raw('SET TRANSACTION READ ONLY').execute(tx);await sql.raw(\"SET LOCAL TIME ZONE 'UTC'\").execute(tx);return legacyIdentitySnapshot(tx);});console.log(JSON.stringify({present:!!snapshot,counts:snapshot?.counts??{}}));}finally{await db.destroy();}
`;
/** Refuse an unsupported populated retirement before stopping the existing writer. */
export function assertPlatformRetirementPreflight(plans,probe,preservation){
 const selected=plans?.find(row=>row.scope==='master');
 if(!Array.isArray(selected?.pending))throw Error('Platform master migration plan missing');
 if(!selected.pending.includes(retirementMigration)){if(preservation)throw Error('Identity preservation is restricted to the pending retirement boundary');return;}
 if(preservation){parseHistoricalIdentityMetadata(preservation.historicalMetadata);if(plans.some(row=>row.pending.some(name=>row.scope!=='master'||name!==retirementMigration)))throw Error('Historical identity preservation cannot include unrelated migrations');}
 const snapshot=probe();
 if(typeof snapshot?.present!=='boolean'||!snapshot.counts||typeof snapshot.counts!=='object'||Array.isArray(snapshot.counts))throw Error('Platform legacy retirement preflight unavailable');
 const expected=['users','user_credentials','sessions','tenant_memberships','platform_operators'];
 if(snapshot.present&&(Object.keys(snapshot.counts).length!==expected.length||expected.some(key=>!Number.isSafeInteger(snapshot.counts[key])||snapshot.counts[key]<0)))throw Error('Platform legacy retirement counts incomplete');
 if(!snapshot.present&&Object.keys(snapshot.counts).length)throw Error('Platform legacy retirement presence differs');
 if(preservation&&(!snapshot.present||['users','user_credentials','tenant_memberships'].some(key=>snapshot.counts[key]!==3)))throw Error('Historical preservation does not match the reviewed three-identity boundary');
 if(Object.values(snapshot.counts).some(count=>count>0)&&!preservation)throw Error('Populated Platform master identity retirement requires the separately verified preservation adapter; existing writer was not stopped');
}
