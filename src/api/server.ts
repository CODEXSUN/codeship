import {startHttpServer} from '@workspace/framework';
import {sql} from 'kysely';
import {preflight} from '../../scripts/preflight.ts';
import {openDatabase} from './database.ts';
import {createApplication} from './application.ts';



try{
 const config=await preflight();if(!['127.0.0.1','localhost','::1'].includes(config.host))throw new Error('Codeship MVP must bind to loopback.');
 const {db}=openDatabase();
 try{await db.connection().execute(async connection=>{
  const lock=await sql<{locked:boolean}>`select pg_try_advisory_lock(hashtext('codeship-local-operator')) as locked`.execute(connection);
  if(!lock.rows[0].locked)throw new Error('Another Codeship operator server is already running.');
  try{
   const {app,deployments,monitor}=createApplication(db);await deployments.repo.recover();let timer:ReturnType<typeof setInterval>|undefined;
   await new Promise<void>((resolve,reject)=>{
    app.addHook('onClose',async()=>{clearInterval(timer);await deployments.close();await monitor.close();resolve();});
    void startHttpServer(app,config).then(()=>{timer=setInterval(()=>void monitor.check().catch(()=>{}),60000);timer.unref();void monitor.check().catch(()=>{});},reject);
   });
  }finally{await sql`select pg_advisory_unlock(hashtext('codeship-local-operator'))`.execute(connection);}
 });}finally{await db.destroy();}
}catch(error){console.error(error instanceof Error?error.message:'Codeship startup failed.');process.exitCode=1;}
