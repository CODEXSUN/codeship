import {sql} from 'kysely';
import {actor,insertPublic,publicId,type Database} from '../../../identity.ts';
export function monitorRepository(db:Database){return {
 latest:async()=> (await db.selectFrom('observations as o').innerJoin('deployment_targets as t','t.id','o.target_id').select(['o.public_id','t.public_id as target_code','t.name as target_name','o.healthy','o.latency_ms','o.containers','o.cpu_percent','o.memory_bytes','o.details','o.created_at']).where('o.id','in',eb=>eb.selectFrom('observations').select(eb=>eb.fn.max<number>('id').as('id')).groupBy('target_id')).orderBy('o.target_id').execute()).map(row=>({...row,memory_bytes:row.memory_bytes===null?null:Number(row.memory_bytes)})),
 history:async(code:string)=> (await db.selectFrom('observations as o').innerJoin('deployment_targets as t','t.id','o.target_id').select(['o.public_id','t.public_id as target_code','t.name as target_name','o.healthy','o.latency_ms','o.containers','o.cpu_percent','o.memory_bytes','o.details','o.created_at']).where('t.public_id','=',code).orderBy('o.created_at','desc').limit(120).execute()).map(row=>({...row,memory_bytes:row.memory_bytes===null?null:Number(row.memory_bytes)})),
 incidents:()=>db.selectFrom('incidents as i').innerJoin('deployment_targets as t','t.id','i.target_id').select(['i.public_id','t.public_id as target_code','t.name as target_name','i.message','i.state','i.created_at','i.resolved_at']).orderBy('i.created_at','desc').limit(100).execute(),
 async record(targetId:number,observation:{healthy:boolean;latency_ms:number;containers:number;cpu_percent:number|null;memory_bytes:number|null;details:string}){
  // A collision retries the entire atomic observation/incident transaction.
  await insertPublic(public_id=>db.transaction().execute(async trx=>{
   await trx.insertInto('observations').values({public_id,target_id:targetId,...observation,created_by:actor,updated_by:actor}).execute();
   if(observation.healthy)await trx.updateTable('incidents').set({state:'resolved',resolved_at:new Date(),updated_at:new Date(),updated_by:actor}).where('target_id','=',targetId).where('state','=','open').execute();
   else await trx.insertInto('incidents').values({public_id:publicId(),target_id:targetId,message:'Deployment health check failed. Inspect health and run history.',state:'open',created_by:actor,updated_by:actor}).onConflict(oc=>oc.column('target_id').where(sql<boolean>`state = 'open'`).doNothing()).execute();
  }));
 },
 };}
