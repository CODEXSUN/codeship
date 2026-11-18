import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/api/database.ts';
import {up as original} from '../src/api/modules/master/application/database/sqlite-migrations/20261117000400_applications.ts';
import {up,down} from '../src/api/modules/master/application/database/sqlite-migrations/20261118000100_application_grouping.ts';
test('group migration preserves IDs, credentials, timestamps and sequence while permitting distinct service owners',async()=>{
 const {db,sqlite}=openDatabase(':memory:');
 try{
  await original(db);
  const record={id:17,public_id:'aaaaaaaa',name:'CodeShip',owner:'devkit/codeship',project:'devkits',environment:'local-docker',version:'1.0.2',host:'127.0.0.1',port:4450,username:'',notes:'saved',encrypted_secrets:'ciphertext-retained-byte-for-byte',secret_revision:9,created_at:'2026-11-17T00:00:00Z',updated_at:'2026-11-18T00:00:00Z',created_by:'owner',updated_by:'owner'};
  await db.insertInto('applications').values(record).execute();sqlite.exec("UPDATE sqlite_sequence SET seq=200 WHERE name='applications'");
  await up(db);assert.deepEqual({...await db.selectFrom('applications').selectAll().executeTakeFirst()},record);
  const {id,...other}=record;
  await db.insertInto('applications').values({...other,public_id:'bbbbbbbb',owner:'devkit/codeitz',name:'Codeitz'}).execute();
  assert.equal((await db.selectFrom('applications').select('id').where('public_id','=','bbbbbbbb').executeTakeFirst())!.id,201);
  await assert.rejects(db.insertInto('applications').values({...other,public_id:'cccccccc'}).execute(),/UNIQUE/);
  await assert.rejects(down(db),/No records were removed/);
  assert.equal((await db.selectFrom('applications').selectAll().execute()).length,2);
 }finally{await db.destroy();}
});
