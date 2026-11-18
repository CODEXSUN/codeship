import {sql,type Kysely} from 'kysely';

async function rebuild(db:Kysely<any>,grouped:boolean){
 await sql`SAVEPOINT application_grouping`.execute(db);
 try{
  const sequence=(await sql<{seq:number}>`SELECT seq FROM sqlite_sequence WHERE name='applications'`.execute(db)).rows[0]?.seq??0;
  await sql.raw(`CREATE TABLE applications_grouped_next (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   public_id varchar(32) NOT NULL UNIQUE,
   name TEXT NOT NULL, owner TEXT NOT NULL, version TEXT NOT NULL,
   environment TEXT NOT NULL, project TEXT NOT NULL, host TEXT NOT NULL,
   port INTEGER, username TEXT NOT NULL, notes TEXT NOT NULL, encrypted_secrets TEXT,
   secret_revision INTEGER NOT NULL DEFAULT 0,
   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
   created_by TEXT NOT NULL, updated_by TEXT NOT NULL,
   ${grouped?'UNIQUE(project,owner,environment)':'UNIQUE(project)'}
  )`).execute(db);
  await sql`INSERT INTO applications_grouped_next SELECT * FROM applications`.execute(db);
  await sql`DROP TABLE applications`.execute(db);
  await sql`ALTER TABLE applications_grouped_next RENAME TO applications`.execute(db);
  await sql`UPDATE sqlite_sequence SET seq=MAX(seq,${sequence}) WHERE name='applications'`.execute(db);
  await sql`RELEASE SAVEPOINT application_grouping`.execute(db);
 }catch(error){await sql`ROLLBACK TO SAVEPOINT application_grouping`.execute(db);await sql`RELEASE SAVEPOINT application_grouping`.execute(db);throw error;}
}
export async function up(db:Kysely<any>){await rebuild(db,true);}
export async function down(db:Kysely<any>){
 const duplicates=await sql`SELECT project FROM applications GROUP BY project HAVING count(*)>1 LIMIT 1`.execute(db);
 if(duplicates.rows.length)throw new Error('Cannot restore global project uniqueness while grouped application records exist. No records were removed.');
 await rebuild(db,false);
}
