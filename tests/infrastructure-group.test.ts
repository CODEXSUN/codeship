import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {groupCompose} from '../src/api/modules/master/infrastructure-service/group-compose.ts';
test('shared group retains images, physical volumes and secret targets while avoiding alias collisions',()=>{
 const definition={services:{database:{image:'fixture:1.0',volumes:['data:/database'],secrets:['password']}},volumes:{data:{name:'existing_data'}},secrets:{password:{file:'./private/password'}}};
 const result=groupCompose([{key:'postgres',definition,file:path.resolve('fixtures/postgres/compose.json')},{key:'mariadb',definition:{...definition,volumes:{data:{name:'maria_data'}}},file:path.resolve('fixtures/mariadb/compose.json'),extraMounts:[{name:'retained-anonymous-volume',target:'/srv'}]}]);
 assert.equal(result.name,'codebiz-infra');assert.equal(result.services.postgres.image,'fixture:1.0');
 assert.equal(result.volumes.postgres_data.name,'existing_data');assert.equal(result.volumes.postgres_data.external,true);
 assert.equal(result.volumes.mariadb_data.name,'maria_data');assert.equal(result.services.postgres.volumes[0],'postgres_data:/database');
 assert.deepEqual(result.services.postgres.secrets[0],{source:'postgres_password',target:'password'});
 assert.notEqual(result.secrets.postgres_password.file,result.secrets.mariadb_password.file);
 assert.ok(Object.values(result.volumes).some((volume:any)=>volume.name==='retained-anonymous-volume'));
 assert.equal(definition.services.database.volumes[0],'data:/database');
});
