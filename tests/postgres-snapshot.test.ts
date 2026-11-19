import test from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {randomBytes} from 'node:crypto';
import {waitForDatabaseDependencies} from '../.container/apps/runtime-network.mjs';
import pg from 'pg';import {withSourceSnapshot} from '../.container/apps/postgres-snapshot.ts';
test('copy verification keeps the exported snapshot when source writers add records',{timeout:90000},async()=>{
 const password=randomBytes(24).toString('hex');
 const docker=(args:string[])=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,POSTGRES_PASSWORD:password}}).trim();
 let id:string|undefined,writer:pg.Client|undefined;
 try{
  id=docker(['run','-d','--rm','--label','codeship.test=source-snapshot','--tmpfs','/var/lib/postgresql/data:rw,size=256m','-p','127.0.0.1::5432','-e','POSTGRES_PASSWORD','postgres:17.12-alpine']);assert.match(id,/^[a-f0-9]{64}$/);
  const port=docker(['port',id,'5432/tcp']).split(':').at(-1),url=new URL('postgresql://postgres@127.0.0.1:'+port+'/postgres');url.password=password;
  for(let attempt=0;attempt<80;attempt++){const client=new pg.Client({connectionString:url.href,connectionTimeoutMillis:1000});try{await client.connect();writer=client;break;}catch{await client.end();await new Promise(resolve=>setTimeout(resolve,250));}}
  if(!writer)throw Error('Disposable PostgreSQL unavailable.');
  await waitForDatabaseDependencies({CODESHIP_TEST_DATABASE_URL:url.href},{timeoutMs:10000});
  await writer.query('CREATE TABLE snapshot_records(public_id text PRIMARY KEY)');await writer.query("INSERT INTO snapshot_records VALUES ('first001')");
  await withSourceSnapshot(url.href,async(snapshot,source)=>{
   assert.match(snapshot,/^[a-zA-Z0-9-]+$/);assert.equal((await source.query('SELECT count(*)::int AS n FROM snapshot_records')).rows[0].n,1);
   await writer!.query("INSERT INTO snapshot_records VALUES ('second02')");
   assert.equal((await source.query('SELECT count(*)::int AS n FROM snapshot_records')).rows[0].n,1,'verification sees the dump snapshot, not later native changes');
   const dumpReader=new pg.Client({connectionString:url.href});await dumpReader.connect();try{await dumpReader.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await dumpReader.query("SET TRANSACTION SNAPSHOT '"+snapshot+"'");assert.equal((await dumpReader.query('SELECT count(*)::int AS n FROM snapshot_records')).rows[0].n,1);}finally{await dumpReader.end();}
  });
  assert.equal((await writer.query('SELECT count(*)::int AS n FROM snapshot_records')).rows[0].n,2,'native writes are preserved');
 }finally{await writer?.end();if(id&&/^[a-f0-9]{64}$/.test(id))docker(['rm','-f',id]);}
});
