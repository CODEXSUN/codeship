import {startHttpServer} from '@workspace/framework';
import {randomUUID} from 'node:crypto';
import {preflight} from '../../scripts/preflight.ts';
import {openDatabase} from './database.ts';
import {createApplication} from './application.ts';
import {acquireOperatorLease} from './operator-lease.ts';
import {ensureMetricsCollector} from '../../scripts/metrics-runtime.ts';
try{
 const config=await preflight();
 const {db}=openDatabase(),token=randomUUID();let timer:ReturnType<typeof setInterval>|undefined,heartbeat:ReturnType<typeof setInterval>|undefined,metricsTimer:ReturnType<typeof setInterval>|undefined;
 try{
  await acquireOperatorLease(db,token,{onWait:()=>console.log('[codeship] Waiting up to 32 seconds for the previous operator lease to expire…')});
  const {app,deployments,monitor}=createApplication(db);await deployments.repo.recover();
  await new Promise<void>((resolve,reject)=>{
   app.addHook('onClose',async()=>{clearInterval(timer);clearInterval(heartbeat);clearInterval(metricsTimer);await deployments.close();await monitor.close();resolve();});
   void startHttpServer(app,config).then(()=>{
    if(process.env.CODESHIP_EXECUTION_MODE!=='inventory'){const ensure=()=>void ensureMetricsCollector().catch(()=>console.error('[codeship] Metrics collector startup failed; retrying in 15 seconds.'));ensure();metricsTimer=setInterval(ensure,15000);metricsTimer.unref();}
    if(process.env.CODESHIP_EXECUTION_MODE!=='inventory'){timer=setInterval(()=>void monitor.check().catch(()=>{}),60000);timer.unref();void monitor.check().catch(()=>{});}
    heartbeat=setInterval(()=>{void db.updateTable('operator_lease').set({expires_at:Date.now()+30000}).where('id','=',1).where('token','=',token).where('expires_at','>',Date.now()).returning('token').executeTakeFirst().then(row=>{if(!row)void app.close();}).catch(()=>void app.close());},5000);heartbeat.unref();
   },reject);
  });
 }finally{clearInterval(timer);clearInterval(heartbeat);clearInterval(metricsTimer);await db.deleteFrom('operator_lease').where('token','=',token).execute().catch(()=>{});await db.destroy();}
}catch(error){console.error(error instanceof Error?error.message:'Codeship startup failed.');process.exitCode=1;}
