import {randomInt} from 'node:crypto';
import type {Kysely} from 'kysely';
import type {CodeshipDatabase} from './database.ts';
// Local single-operator scope; this is not tenant or public-cloud authentication.
export const actor='local-operator';
export function publicId(){return Array.from({length:8},()=> 'abcdefghijklmnopqrstuvwxyz0123456789'[randomInt(36)]).join('');}
export async function insertPublic<T>(insert:(id:string)=>Promise<T>):Promise<T>{
 for(let attempt=0;attempt<5;attempt++)try{return await insert(publicId());}catch(error){const e=error as {code?:string;constraint?:string};const collision=(e.code==='23505'&&e.constraint?.endsWith('_public_id_key'))||/UNIQUE constraint failed: [a-z_]+\.public_id$/.test((error as Error).message);if(!collision||attempt===4)throw error;}
 throw new Error('Unable to allocate a public ID.');
}
export type Database=Kysely<CodeshipDatabase>;
