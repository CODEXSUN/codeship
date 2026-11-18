// SQLite initial schema; published PostgreSQL migrations remain unchanged.
import {sql,type Kysely} from 'kysely';
export async function up(db:Kysely<any>) {
 await db.schema.createTable('deployment_targets').addColumn('id','integer',c=>c.autoIncrement().primaryKey()).addColumn('public_id','varchar(32)',c=>c.notNull().unique()).addColumn('profile_key','varchar(64)',c=>c.notNull().unique()).addColumn('name','varchar(100)',c=>c.notNull()).addColumn('owner','varchar(160)',c=>c.notNull()).addColumn('project','varchar(64)',c=>c.notNull().unique()).addColumn('port','integer',c=>c.notNull().unique()).addColumn('active','boolean',c=>c.notNull().defaultTo(true)).addColumn('created_at','text',c=>c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)).addColumn('updated_at','text',c=>c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)).addColumn('created_by','varchar(64)',c=>c.notNull()).addColumn('updated_by','varchar(64)',c=>c.notNull()).execute();
}
export async function down(db:Kysely<any>){await db.schema.dropTable('deployment_targets').execute();}
