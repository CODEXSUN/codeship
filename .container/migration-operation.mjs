/** Writes are quiesced before recovery; failures never trigger a database downgrade. */
export async function applyMigration({decision,installed,quiesce,backup,checkBackup,migrate,requireOffhost=false,authorizeRecovery,record=async()=>{}}){
 if(!decision?.migrateRequired){await record('migration','skipped');return {migrated:false,backup:false};}
 if(!Array.isArray(decision.pending)||!decision.pending.length)throw Error('Invalid migration decision');
 if(installed&&requireOffhost&&typeof authorizeRecovery!=='function')throw Error('Off-host restore approval is required before stopping the writer');
 if(installed){
  if(typeof quiesce!=='function'||typeof backup!=='function'||typeof checkBackup!=='function')throw Error('Existing service migration requires quiescence and checked recovery');
  await quiesce();
  const recovery=await backup();
  if(!recovery)throw Error('Recovery reference missing');
  await checkBackup(recovery);
  await record('backup','passed',recovery);
  if(requireOffhost){const proof=await authorizeRecovery(recovery);if(proof?.offHostRestoreVerified!==true||proof.sha256!==recovery.sha256)throw Error('Off-host recovery proof differs; migration stopped');await record('offhost-recovery','passed',{sha256:proof.sha256,reference:proof.reference});}
 }
 await migrate();await record('migration','passed');
 return {migrated:true,backup:!!installed};
}
