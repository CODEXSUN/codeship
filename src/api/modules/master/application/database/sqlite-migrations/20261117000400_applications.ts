import {sql,type Kysely} from 'kysely';
export async function up(db:Kysely<any>){
 await db.schema.createTable('applications')
 .addColumn('id','integer',c=>c.primaryKey().autoIncrement())
 .addColumn('public_id','varchar(32)',c=>c.notNull().unique())
 .addColumn('name','text',c=>c.notNull()).addColumn('owner','text',c=>c.notNull())
 .addColumn('version','text',c=>c.notNull()).addColumn('environment','text',c=>c.notNull())
 .addColumn('project','text',c=>c.notNull().unique()).addColumn('host','text',c=>c.notNull())
 .addColumn('port','integer').addColumn('username','text',c=>c.notNull())
 .addColumn('notes','text',c=>c.notNull()).addColumn('encrypted_secrets','text')
 .addColumn('secret_revision','integer',c=>c.notNull().defaultTo(0))
 .addColumn('created_at','text',c=>c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
 .addColumn('updated_at','text',c=>c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
 .addColumn('created_by','text',c=>c.notNull()).addColumn('updated_by','text',c=>c.notNull()).execute();
 // Technical singleton lease; deliberately no domain entity lifecycle fields.
 await db.schema.createTable('operator_lease').addColumn('id','integer',c=>c.primaryKey()).addColumn('token','text',c=>c.notNull()).addColumn('expires_at','integer',c=>c.notNull()).execute();
}
export async function down(db:Kysely<any>){await db.schema.dropTable('operator_lease').execute();await db.schema.dropTable('applications').execute();}
