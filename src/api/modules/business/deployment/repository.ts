import {sql} from 'kysely';
import {actor,insertPublic,type Database} from '../../../identity.ts';
import type {Action} from '../../../../../contracts/operations.ts';
export function deploymentRepository(db:Database){
 const query=()=>db.selectFrom('deployment_runs as r').innerJoin('deployment_targets as t','t.id','r.target_id').select(['r.public_id','t.public_id as target_code','t.name as target_name','r.action','r.state','r.output','r.exit_code','r.created_at','r.finished_at']);
 return {
 maintenanceTargets:()=>db.selectFrom('deployment_runs as r').innerJoin('deployment_targets as t','t.id','r.target_id').select('t.public_id').where('r.state','=','running').where('r.action','in',['deploy','update']).execute(),
 list:()=>query().clearSelect().select(['r.public_id','t.public_id as target_code','t.name as target_name','r.action','r.state','r.exit_code','r.created_at','r.finished_at']).orderBy('r.created_at','desc').limit(100).execute(),
 find:(id:string)=>query().where('r.public_id','=',id).executeTakeFirst(),
 byKey:(key:string)=>db.selectFrom('deployment_runs').selectAll().where('request_key','=',key).executeTakeFirst(),
 create:(targetId:number,action:Action,key:string)=>insertPublic(public_id=>db.insertInto('deployment_runs').values({public_id,target_id:targetId,action,request_key:key,state:'running',created_by:actor,updated_by:actor}).returningAll().executeTakeFirstOrThrow()),
 append:(id:string,text:string)=>db.updateTable('deployment_runs').set({output:sql`substr(output || ${text}, 1, 250000)`,updated_at:new Date(),updated_by:actor}).where('public_id','=',id).execute(),
 finish:(id:string,state:string,exitCode:number|null)=>db.updateTable('deployment_runs').set({state,exit_code:exitCode,finished_at:new Date(),updated_at:new Date(),updated_by:actor}).where('public_id','=',id).where('state','=','running').execute(),
 recover:()=>db.updateTable('deployment_runs').set({state:'interrupted',finished_at:new Date(),updated_at:new Date(),updated_by:actor,output:sql`substr(output || '\nCodeship restarted. Inspect the deployment before retrying; no automatic rollback or retry was attempted.\n',1,250000)`}).where('state','=','running').execute(),
 };
}
