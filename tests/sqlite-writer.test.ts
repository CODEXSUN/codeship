import test from 'node:test';import assert from 'node:assert/strict';import {Worker} from 'node:worker_threads';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {sql} from 'kysely';
import {openDatabase} from '../src/api/database.ts';
test('registry transactions reserve the writer before reads while another process updates a lease',{timeout:15000},async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'codeship-writer-')),file=path.join(directory,'state.sqlite');const {db}=openDatabase(file);let worker:Worker|undefined;
 try{
  await sql`CREATE TABLE state(value integer NOT NULL)`.execute(db);await sql`INSERT INTO state VALUES(0)`.execute(db);
  await db.transaction().execute(async trx=>{
   assert.equal((await sql<{value:number}>`SELECT value FROM state`.execute(trx)).rows[0].value,0);
   worker=new Worker("const {parentPort,workerData}=require('node:worker_threads');const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(workerData);db.exec('PRAGMA busy_timeout=5000');parentPort.postMessage('ready');db.exec('UPDATE state SET value=value+10');db.close();parentPort.postMessage('done');",{eval:true,workerData:file});
   await new Promise<void>((resolve,reject)=>{worker!.once('message',()=>resolve());worker!.once('error',reject);});
   await new Promise(resolve=>setTimeout(resolve,25));
   await sql`UPDATE state SET value=value+1`.execute(trx);
  });
  await new Promise<void>((resolve,reject)=>{worker!.once('exit',code=>code===0?resolve():reject(Error('Concurrent writer failed')));worker!.once('error',reject);});
  assert.equal((await sql<{value:number}>`SELECT value FROM state`.execute(db)).rows[0].value,11);
 }finally{await worker?.terminate();await db.destroy();await rm(directory,{recursive:true,force:true});}
});
