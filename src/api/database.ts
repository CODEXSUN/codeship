import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { loadServerEnvironment } from '@workspace/framework';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type {TargetDatabase} from './modules/master/deployment-target/database/types.ts';
import type {DeploymentDatabase} from './modules/business/deployment/database/types.ts';
import type {MonitorDatabase} from './modules/business/monitor/database/types.ts';
export type CodeshipDatabase=TargetDatabase & DeploymentDatabase & MonitorDatabase;
export const appRoot = fileURLToPath(new URL('../../', import.meta.url));
export const workspaceRoot = fileURLToPath(new URL('../../../../', import.meta.url));
export function settings() { return loadServerEnvironment({root:appRoot,prefix:'CODESHIP',defaultPort:4350}); }
export function openDatabase() {
 const v=settings().values;
 const host=v.PGHOST??'127.0.0.1', schema=v.CODESHIP_PG_SCHEMA??'codeship', mode=v.PGSSLMODE??'verify-full';
 if(!/^[a-z][a-z0-9_]{0,50}$/.test(schema))throw new Error('Invalid Codeship schema.');
 if(mode!=='verify-full'&&!(mode==='disable'&&['127.0.0.1','localhost','::1'].includes(host)))throw new Error('Remote PostgreSQL requires verified TLS.');
 const db=new Kysely<CodeshipDatabase>({dialect:new PostgresDialect({pool:new Pool({host,port:Number(v.PGPORT??5432),database:v.PGDATABASE??'codeship',user:v.PGUSER,password:v.PGPASSWORD,max:5,connectionTimeoutMillis:5000,ssl:mode==='disable'?false:{rejectUnauthorized:true,...(v.PGSSLROOTCERT?{ca:readFileSync(v.PGSSLROOTCERT,'utf8')}:{})}})})}).withSchema(schema);
 return {db,schema};
}
