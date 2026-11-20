import {createHash} from 'node:crypto';
import {applyMigration} from '../migration-operation.mjs';

export function assertPlatformPostgresClients(serverVersion,dumpVersion,restoreVersion) {
 const value=String(serverVersion??'');
 if(!/^[1-9][0-9]{5}$/.test(value))throw Error('Platform PostgreSQL server version is unavailable');
 const major=Math.floor(Number(value)/10000);
 for(const [name,version]of [['pg_dump',dumpVersion],['pg_restore',restoreVersion]]){
  const match=new RegExp('^'+name+' \\(PostgreSQL\\) ([1-9][0-9]+)(?:\\.[0-9]+)?(?:\\s|$)').exec(String(version??''));
  if(!match||Number(match[1])!==major)throw Error('Platform PostgreSQL recovery clients must match the server major version');
 }
}

/** Resolve the current master/tenant registry, not a stale installation-time tenant list. */
export function platformRecoveryScopes(plans, registrations, marker, environment) {
 if(!Array.isArray(plans)||!plans.length||!Array.isArray(registrations)||marker?.role!=='platform_service'||!Array.isArray(marker.scopes))throw Error('Platform recovery ownership is incomplete');
 const connection=(key,database)=>{
  const url=new URL(environment[key]??'');
  if(!/^[_a-z][_a-z0-9]{0,62}$/.test(database)||!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='postgres'||url.port!=='5432'||url.pathname!=='/'+database||decodeURIComponent(url.username)!==marker.role||!url.password)throw Error('Platform recovery database binding differs');
  return {database,key};
 };
 const master=marker.scopes.find(scope=>scope.key==='PLATFORM_MASTER_DATABASE_URL');
 if(!master)throw Error('Platform master recovery ownership is missing');
 const scopes=[{scope:'master',...connection(master.key,master.database)}];
 for(const row of registrations){
  if(typeof row.public_id!=='string'||!row.public_id||!/^env:PLATFORM_TENANT(?:_[A-Z0-9]+)*_DATABASE_URL$/.test(row.connection_secret_ref??''))throw Error('Platform tenant recovery identity differs');
  scopes.push({scope:'tenant:'+row.public_id,...connection(row.connection_secret_ref.slice(4),row.database_name)});
 }
 if(new Set(scopes.map(scope=>scope.scope)).size!==scopes.length||new Set(scopes.map(scope=>scope.database)).size!==scopes.length||new Set(scopes.map(scope=>scope.key)).size!==scopes.length)throw Error('Platform recovery scopes overlap');
 if(plans.length!==scopes.length||new Set(plans.map(plan=>plan.scope)).size!==plans.length||plans.some(plan=>!scopes.some(scope=>scope.scope===plan.scope)))throw Error('Platform migration and recovery scopes differ');
 return scopes;
}

/** Every scoped snapshot must be checked and approved before any schema is changed. */
export async function applyPlatformMigration({decision,installed,requireOffhost,requireChannel,scopes,quiesce,backup,checkBackup,authorizeRecovery,migrate,record=async()=>{}}) {
 if(decision.migrateRequired&&(!Array.isArray(scopes)||!scopes.length))throw Error('Platform recovery scope is missing');
 if(decision.migrateRequired&&installed&&requireOffhost){if(typeof authorizeRecovery!=='function')throw Error('Platform off-host recovery provider is missing');requireChannel();}
 return applyMigration({decision,installed:decision.migrateRequired,requireOffhost:installed&&requireOffhost,
  quiesce:async()=>{if(installed)await quiesce();},
  backup:async()=>{
   if(!Array.isArray(scopes)||!scopes.length)throw Error('Platform recovery scope is missing');
   const snapshots=[];
   for(const scope of scopes){const snapshot=await backup(scope);if(!snapshot?.file||!/^[a-f0-9]{64}$/.test(snapshot.sha256??''))throw Error('Platform scoped recovery identity is missing');snapshots.push({...snapshot,scope});}
   return {snapshots,sha256:createHash('sha256').update(JSON.stringify(snapshots.map(item=>[item.scope.scope,item.sha256]))).digest('hex')};
  },
  checkBackup:async recovery=>{for(const snapshot of recovery.snapshots){await checkBackup(snapshot);await record('backup-'+snapshot.scope.database,'passed',{file:snapshot.file,sha256:snapshot.sha256});}},
  authorizeRecovery:async recovery=>{
   for(const snapshot of recovery.snapshots){const proof=await authorizeRecovery(snapshot);if(proof?.offHostRestoreVerified!==true||proof.sha256!==snapshot.sha256)throw Error('Platform scoped off-host recovery proof differs');await record('offhost-recovery-'+snapshot.scope.database,'passed',{sha256:proof.sha256,reference:proof.reference});}
   return {offHostRestoreVerified:true,sha256:recovery.sha256};
  },migrate,record});
}
