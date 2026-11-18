import {actor,insertPublic,type Database} from '../../../identity.ts';
import {infrastructureInput} from './service.ts';
import {decryptSecrets} from '../application/vault.ts';
import {mergeSecrets} from '../application/service.ts';
const safe=(row:any)=>{const {id,encrypted_secrets,created_by,updated_by,created_at,...fields}=row;const secrets=encrypted_secrets?decryptSecrets(row.public_id,encrypted_secrets):{};return {...fields,hasSecrets:!!encrypted_secrets,hasToken:!!secrets.token,hasSshKey:!!secrets.sshKey,hasEnvironment:!!secrets.env,hasPassword:!!secrets.password,hasRootPassword:!!secrets.rootPassword};};
export function infrastructureRepository(db:Database){return {
 list:async()=> (await db.selectFrom('infrastructure_services').selectAll().orderBy('name').execute()).map(safe),
 find:(id:string)=>db.selectFrom('infrastructure_services').selectAll().where('public_id','=',id).executeTakeFirst(),
 async save(raw:unknown,id?:string){const {secrets,clearSecrets,revision,...values}=infrastructureInput.parse(raw);
 if(!id)return insertPublic(async public_id=>safe(await db.insertInto('infrastructure_services').values({...values,public_id,encrypted_secrets:mergeSecrets(public_id,null,secrets,clearSecrets),created_by:actor,updated_by:actor}).returningAll().executeTakeFirstOrThrow()));
 return db.transaction().execute(async trx=>{const old=await trx.selectFrom('infrastructure_services').selectAll().where('public_id','=',id).executeTakeFirst();if(!old)throw Object.assign(new Error('Infrastructure service not found.'),{statusCode:404});if(old.revision!==revision)throw Object.assign(new Error('Service changed. Reload before saving.'),{statusCode:409});if(old.kind!==values.kind)throw Object.assign(new Error('Service type cannot change after registration.'),{statusCode:409});return safe(await trx.updateTable('infrastructure_services').set({...values,encrypted_secrets:mergeSecrets(id,old.encrypted_secrets,secrets,clearSecrets),revision:old.revision+1,updated_at:new Date().toISOString(),updated_by:actor}).where('public_id','=',id).returningAll().executeTakeFirstOrThrow());});
 }};}
