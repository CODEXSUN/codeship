// Explicit one-time, read-only source import. PostgreSQL remains intact.
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import path from 'node:path';
import pg from 'pg';
import {appRoot,openDatabase} from '../src/api/database.ts';
const env=parseEnv(readFileSync(path.join(appRoot,'.env'),'utf8'));
if(!['127.0.0.1','localhost','::1'].includes(env.PGHOST??''))throw new Error('This importer only accepts the existing local PostgreSQL source.');
const source=new pg.Client({host:env.PGHOST,port:Number(env.PGPORT),database:env.PGDATABASE,user:env.PGUSER,password:env.PGPASSWORD});
const {db}=openDatabase();try{await source.connect();await source.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const schema=env.CODESHIP_PG_SCHEMA??'codeship';if(!/^[a-z][a-z0-9_]*$/.test(schema))throw new Error('Invalid source schema.');
 const tables=['deployment_targets','deployment_runs','observations','incidents'] as const;const rows:Record<string,any[]>={};for(const table of tables)rows[table]=(await source.query(`SELECT * FROM "${schema}"."${table}" ORDER BY id`)).rows;
 await db.transaction().execute(async trx=>{for(const table of tables){if(await trx.selectFrom(table).select('id').limit(1).executeTakeFirst())throw new Error('Destination operations tables must be empty.');for(const row of rows[table]){for(const [key,value]of Object.entries(row))if(value instanceof Date)row[key]=value.toISOString();await (trx as any).insertInto(table).values(row).execute();}}});
 await source.query('COMMIT');console.log(JSON.stringify(Object.fromEntries(tables.map(t=>[t,rows[t].length]))));
}finally{await source.end();await db.destroy();}
