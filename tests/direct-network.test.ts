import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/api/database.ts';
import {migrator} from '../scripts/database.ts';
import {createApplication} from '../src/api/application.ts';
import {codeshipAccessPolicy} from '../src/api/local-access.ts';
const {db,schema}=openDatabase(':memory:');after(()=>db.destroy());
test('direct Docker supports local UI/API/docs and rejects foreign peers, origins and forwarded spoofing',async()=>{
 assert.ifError((await migrator(db,schema).migrateToLatest()).error);
 process.env.CODESHIP_BIND_MODE='docker-direct';process.env.CODESHIP_DOCKER_PEERS='172.19.0.1';
 const {app}=createApplication(db);delete process.env.CODESHIP_BIND_MODE;delete process.env.CODESHIP_DOCKER_PEERS;await app.ready();
 const headers={host:'127.0.0.1:4450'},remoteAddress='172.19.0.1';
 try{
  for(const url of ['/api/live','/api/ready','/api/v1/applications','/api/v1/infrastructure','/api/docs','/api/openapi.json'])assert.equal((await app.inject({url,headers,remoteAddress})).statusCode,200,url);
  assert.equal((await app.inject({url:'/api/v1/applications',headers:{...headers,origin:'http://127.0.0.1:4450'},remoteAddress})).statusCode,200);
  for(const extra of [{remoteAddress:'172.19.0.9'},{headers:{host:'example.invalid'}},{headers:{...headers,origin:'https://example.invalid'}},{headers:{host:'127.0.0.1:999999'}},{remoteAddress:'172.19.0.9',headers:{...headers,'x-forwarded-for':'127.0.0.1','x-forwarded-host':'localhost','x-forwarded-proto':'https'}}])assert.equal((await app.inject({url:'/api/v1/applications',headers,remoteAddress,...extra})).statusCode,403);
 }finally{await app.close();}
});
test('Docker policy accepts explicit IPs only',()=>{assert.throws(()=>codeshipAccessPolicy(['172.19.0.0/16']));assert.throws(()=>codeshipAccessPolicy(['0.0.0.0']));assert.throws(()=>codeshipAccessPolicy(['any']));});
