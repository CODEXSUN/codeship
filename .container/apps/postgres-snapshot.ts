import pg from 'pg';

/** Keep counts/identities and pg_dump on one read-only view while native writers continue. */
export async function withSourceSnapshot<T>(connectionString:string,operation:(snapshot:string,source:pg.Client)=>Promise<T>):Promise<T>{
 const source=new pg.Client({connectionString,connectionTimeoutMillis:5000});await source.connect();
 try{
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const snapshot=(await source.query<{snapshot:string}>('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
  return await operation(snapshot,source);
 }finally{try{await source.query('ROLLBACK');}finally{await source.end();}}
}
