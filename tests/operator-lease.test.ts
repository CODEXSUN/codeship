import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/api/database.ts';
import {acquireOperatorLease} from '../src/api/operator-lease.ts';

test('startup recovers an expiring lease without clearing a live owner',async()=>{
 const {db,sqlite}=openDatabase(':memory:');
 sqlite.exec('CREATE TABLE operator_lease (id INTEGER PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL)');
 let clock=1000,notifications=0;
 try{
  await db.insertInto('operator_lease').values({id:1,token:'old',expires_at:2000}).execute();
  await acquireOperatorLease(db,'replacement',{now:()=>clock,wait:async ms=>{assert.equal((await db.selectFrom('operator_lease').select('token').executeTakeFirst())!.token,'old');clock+=ms;},onWait:()=>notifications++});
  assert.equal(notifications,1);assert.equal(clock,2000);
  assert.equal((await db.selectFrom('operator_lease').select('token').executeTakeFirst())!.token,'replacement');
  await assert.rejects(acquireOperatorLease(db,'duplicate',{now:()=>clock,wait:async ms=>{clock+=ms;await db.updateTable('operator_lease').set({expires_at:clock+30000}).execute();}}),/still using this database/);
  assert.equal((await db.selectFrom('operator_lease').select('token').executeTakeFirst())!.token,'replacement');
 }finally{await db.destroy();}
});
