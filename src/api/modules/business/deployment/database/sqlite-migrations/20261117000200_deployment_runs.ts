// SQLite initial schema; published PostgreSQL migrations remain unchanged.
import {sql,type Kysely} from 'kysely';
export async function up(db:Kysely<any>) {
 await db.schema.createTable('deployment_runs').addColumn('id','integer',c=>c.autoIncrement().primaryKey()).addColumn('public_id','varchar(32)',c=>c.notNull().unique()).addColumn('target_id','integer',c=>c.notNull().references('deployment_targets.id')).addColumn('request_key','varchar(64)',c=>c.notNull().unique()).addColumn('action','varchar(16)',c=>c.notNull()).addColumn('state','varchar(16)',c=>c.notNull()).addColumn('output','text',c=>c.notNull().defaultTo('')).addColumn('exit_code','integer').addColumn('finished_at','text').addColumn('active','boolean',c=>c.notNull().defaultTo(true)).addColumn('created_at','text',c=>c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)).addColumn('updated_at','text',c=>c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)).addColumn('created_by','varchar(64)',c=>c.notNull()).addColumn('updated_by','varchar(64)',c=>c.notNull()).execute();
 await db.schema.createIndex('one_active_deployment').on('deployment_runs').column('target_id').unique().where(sql<boolean>`state = 'running'`).execute();
 await db.schema.createIndex('deployment_runs_created').on('deployment_runs').column('created_at').execute();
}
export async function down(db:Kysely<any>){await db.schema.dropTable('deployment_runs').execute();}
