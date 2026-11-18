import {sql,type Kysely} from 'kysely';
export async function up(db:Kysely<any>){await db.schema.createTable('infrastructure_services')
 .addColumn('id','integer',c=>c.primaryKey().autoIncrement()).addColumn('public_id','varchar(32)',c=>c.notNull().unique())
 .addColumn('kind','text',c=>c.notNull()).addColumn('name','text',c=>c.notNull()).addColumn('version','text',c=>c.notNull())
 .addColumn('environment','text',c=>c.notNull()).addColumn('project','text',c=>c.notNull().unique()).addColumn('host','text',c=>c.notNull()).addColumn('port','integer')
 .addColumn('username','text',c=>c.notNull()).addColumn('database','text',c=>c.notNull()).addColumn('storage','text',c=>c.notNull()).addColumn('notes','text',c=>c.notNull())
 .addColumn('encrypted_secrets','text').addColumn('revision','integer',c=>c.notNull().defaultTo(0))
 .addColumn('created_at','text',c=>c.notNull().defaultTo(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`)).addColumn('updated_at','text',c=>c.notNull().defaultTo(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`))
 .addColumn('created_by','text',c=>c.notNull()).addColumn('updated_by','text',c=>c.notNull()).execute();}
export async function down(db:Kysely<any>){await db.schema.dropTable('infrastructure_services').execute();}
