import {actor,insertPublic,type Database} from '../../../identity.ts';
import {applicationInput,mergeSecrets} from './service.ts';
import {decryptSecrets,encryptSecrets} from './vault.ts';
import {installationUsers} from './accounts.ts';
import {sql} from 'kysely';
import {parseEnv} from 'node:util';
import {currentEnvironment,environmentRows,updateEnvironment} from './environment.ts';
const columns=['public_id','name','owner','version','environment','project','host','port','username','notes','secret_revision','updated_at'] as const;
export function applicationRepository(db:Database){
 const safe=(row:any)=>{const {encrypted_secrets,...publicFields}=row,secrets=encrypted_secrets?decryptSecrets(row.public_id,encrypted_secrets):{};return {...publicFields,hasSecrets:!!encrypted_secrets,hasPassword:!!secrets.password,hasToken:!!secrets.token,hasSshKey:!!secrets.sshKey,environmentKeys:Object.keys(currentEnvironment(secrets)).sort(),users:installationUsers(secrets)};};
 const list=()=>db.selectFrom('applications').select(columns).select('encrypted_secrets').orderBy('name').execute().then(rows=>rows.map(safe));
 const find=async(id:string)=>{const row=await db.selectFrom('applications').selectAll().where('public_id','=',id).executeTakeFirst();if(!row)throw Object.assign(new Error('Application not found.'),{statusCode:404});return row;};
 return {list,
 async environment(id:string){const row=await find(id);return {revision:row.secret_revision,variables:environmentRows(row.encrypted_secrets?decryptSecrets(id,row.encrypted_secrets):{})};},
 async revealEnvironment(id:string,key:string,revision:number){const row=await find(id);if(row.secret_revision!==revision)throw Object.assign(new Error('Application changed. Reload before showing this value.'),{statusCode:409});const values=currentEnvironment(row.encrypted_secrets?decryptSecrets(id,row.encrypted_secrets):{});if(!Object.prototype.hasOwnProperty.call(values,key))throw Object.assign(new Error('Environment variable not found.'),{statusCode:404});return {key,value:values[key]};},
 async save(raw:unknown,id?:string){
 const {secrets,users,environmentChanges,clearSecrets,secretRevision,...input}=applicationInput.parse(raw);
 const secretUpdate={...secrets,...(users?{users:JSON.stringify(users)}:{})};
 const encrypted=(id:string,existing:string|null)=>{const merged=mergeSecrets(id,existing,secretUpdate,clearSecrets);if(!Object.keys(environmentChanges??{}).length)return merged;return encryptSecrets(id,updateEnvironment(merged?decryptSecrets(id,merged):{},environmentChanges!,input.environment));};
 if(!id)return insertPublic(async public_id=>{await db.insertInto('applications').values({...input,public_id,encrypted_secrets:encrypted(public_id,null),created_by:actor,updated_by:actor}).execute();return (await list()).find(row=>row.public_id===public_id)!;});
 return db.transaction().execute(async trx=>{const old=await trx.selectFrom('applications').selectAll().where('public_id','=',id).executeTakeFirst();if(!old)throw Object.assign(new Error('Application not found.'),{statusCode:404});if(secretRevision!==old.secret_revision)throw Object.assign(new Error('Application changed. Reload before saving.'),{statusCode:409});
 await trx.updateTable('applications').set({...input,encrypted_secrets:encrypted(id,old.encrypted_secrets),secret_revision:old.secret_revision+1,updated_at:new Date().toISOString(),updated_by:actor}).where('public_id','=',id).execute();
 return safe(await trx.selectFrom('applications').select(columns).select('encrypted_secrets').where('public_id','=',id).executeTakeFirstOrThrow());});
 }};
}
