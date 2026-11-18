import {sql,type Kysely} from 'kysely';
export async function up(db:Kysely<any>){
 await db.schema.alterTable('infrastructure_services').addColumn('docker_port','integer').execute();
 await db.schema.alterTable('infrastructure_services').addColumn('binding_mode','text',c=>c.notNull().defaultTo('local')).execute();
 await db.schema.alterTable('infrastructure_services').addColumn('allowed_ips','text',c=>c.notNull().defaultTo('')).execute();
 await sql`UPDATE infrastructure_services SET docker_port = CASE kind WHEN 'postgres' THEN 5432 WHEN 'mariadb' THEN 3306 WHEN 'redis' THEN 6379 WHEN 'file-manager' THEN 8080 END`.execute(db);
}
export async function down(db:Kysely<any>){for(const name of ['allowed_ips','binding_mode','docker_port'])await db.schema.alterTable('infrastructure_services').dropColumn(name).execute();}
