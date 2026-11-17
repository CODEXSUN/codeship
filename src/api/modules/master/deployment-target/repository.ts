import {actor,insertPublic,type Database} from '../../../identity.ts';
import type {Profile} from './service.ts';
export function targetRepository(db:Database){return {
 list:()=>db.selectFrom('deployment_targets').select(['public_id','name','owner','project','port','active','created_at']).orderBy('name').execute(),
 find:(code:string)=>db.selectFrom('deployment_targets').selectAll().where('public_id','=',code).where('active','=',true).executeTakeFirst(),
 async register(p:Profile){return insertPublic(async public_id=>db.insertInto('deployment_targets').values({public_id,profile_key:p.key,name:p.name,owner:p.owner,project:p.project,port:p.port,created_by:actor,updated_by:actor}).onConflict(oc=>oc.column('profile_key').doUpdateSet({profile_key:p.key})).returning(['public_id','name','owner','project','port','active','created_at']).executeTakeFirstOrThrow());},
};}
