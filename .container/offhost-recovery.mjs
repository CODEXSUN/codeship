import {randomUUID} from 'node:crypto';
export function requireRecoveryChannel(){if(!process.send||!process.connected)throw Error('VPS migration requires the released local updater and off-host restore approval');}
export function requestOffhostRecovery(recovery){
 requireRecoveryChannel();
 return new Promise((resolve,reject)=>{
  const id=randomUUID();
  const done=(error,value)=>{clearTimeout(timer);process.off('message',message);process.off('disconnect',disconnected);process.channel?.unref();error?reject(error):resolve(value);};
  const message=value=>{if(value?.type!=='recovery-approval'||value.id!==id)return;if(value.accepted!==true||value.sha256!==recovery.sha256||value.offHostRestoreVerified!==true)return done(Error('Off-host recovery was not approved; migration stopped'));done(null,value);};
  const disconnected=()=>done(Error('Local recovery operator disconnected; migration stopped'));
  const timer=setTimeout(()=>done(Error('Off-host restore approval timed out; migration stopped')),30*60*1000);
  process.on('message',message);process.once('disconnect',disconnected);
  process.send({type:'recovery-required',id,recovery});
 });
}
