import type {Kysely} from 'kysely';
export async function up(db:Kysely<any>){await db.schema.dropIndex('one_active_deployment').ifExists().execute();}
export async function down(_db:Kysely<any>){throw new Error('Do not restore a deployment lock over concurrent operation records.');}
