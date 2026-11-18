import {Kysely,SqliteDialect} from 'kysely';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {TargetDatabase} from './modules/master/deployment-target/database/types.ts';
import type {DeploymentDatabase} from './modules/business/deployment/database/types.ts';
import type {MonitorDatabase} from './modules/business/monitor/database/types.ts';
import type {RegistryDatabase} from './modules/master/application/database/types.ts';
import type {InfrastructureDatabase} from './modules/master/infrastructure-service/database/types.ts';
export type CodeshipDatabase=TargetDatabase & DeploymentDatabase & MonitorDatabase & RegistryDatabase & InfrastructureDatabase;
export const appRoot=fileURLToPath(new URL('../../',import.meta.url));
export const workspaceRoot=fileURLToPath(new URL('../../../../',import.meta.url));
export function databaseFile(){return path.resolve(process.env.CODESHIP_SQLITE_FILE??path.join(appRoot,'.codeship/data/codeship.sqlite'));}
export function openDatabase(file=databaseFile()){
 if(file!==':memory:')mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 const sqlite=new DatabaseSync(file);if(file!==':memory:')chmodSync(file,0o600);
 sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 const bind=(values:readonly unknown[])=>values.map(v=>v instanceof Date?v.toISOString():typeof v==='boolean'?Number(v):v) as any[];
 const normalize=(rows:Record<string,unknown>[])=>rows.map(row=>{for(const key of ['healthy','active'])if(key in row)row[key]=Boolean(row[key]);return row;});
 // Product transactions mutate registry/operation state. Reserve the writer before
 // reading a revision so a concurrent operator lease cannot invalidate a WAL snapshot.
 const adapter={close:()=>sqlite.close(),prepare(sql:string){const statement=sqlite.prepare(sql.trim().toLowerCase()==='begin'?'BEGIN IMMEDIATE':sql);return {
  reader:statement.columns().length>0,
  all:(values:readonly unknown[])=>normalize(statement.all(...bind(values))),
  run:(values:readonly unknown[])=>statement.run(...bind(values)),
  iterate:(values:readonly unknown[])=>statement.iterate(...bind(values)),
 };}};
 const db=new Kysely<CodeshipDatabase>({dialect:new SqliteDialect({database:adapter as any})});
 return {db,sqlite,schema:'main'};
}
