import type {Kysely} from 'kysely';
import type {CodeshipDatabase} from './database.ts';

/** A watch restart may arrive before its predecessor's 30-second lease expires. */
export async function acquireOperatorLease(db:Kysely<CodeshipDatabase>,token:string,options:{now?:()=>number;wait?:(ms:number)=>Promise<void>;onWait?:()=>void}={}){
 const now=options.now??Date.now,wait=options.wait??(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
 const deadline=now()+32000;let notified=false;
 while(true){
  const current=now();
  const lease=await db.insertInto('operator_lease').values({id:1,token,expires_at:current+30000})
   .onConflict(oc=>oc.column('id').doUpdateSet({token,expires_at:current+30000}).where('operator_lease.expires_at','<=',current))
   .returning('token').executeTakeFirst();
  if(lease?.token===token)return;
  if(current>=deadline)throw new Error('Another Codeship operator is still using this database. Stop the existing operator before starting another one.');
  if(!notified){options.onWait?.();notified=true;}
  await wait(Math.min(500,deadline-current));
 }
}
