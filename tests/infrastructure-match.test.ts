import test from 'node:test';
import assert from 'node:assert/strict';
import {infrastructureRecord} from '../src/web/modules/reports/infrastructure-match.ts';
import type {InfrastructureService} from '../contracts/infrastructure.ts';

function record(kind:InfrastructureService['kind'],project:string,environment='vps'):InfrastructureService {
  return {public_id:kind,kind,name:kind,version:'',project,environment,host:'127.0.0.1',port:null,username:'',database:'',storage:'',notes:'',revision:0,hasPassword:false,hasRootPassword:false,hasSecrets:false,updated_at:''};
}

test('existing VPS Redis and MariaDB metrics match their saved cards once',()=>{
  const records=[record('redis','cxapp-redis'),record('mariadb','cxapp-mariadb')];
  const metrics=[{project:'cxapp-redis',service:'redis'},{project:'cxapp-mariadb',service:'mariadb'}];
  const configured=records.filter(service=>!metrics.some(metric=>infrastructureRecord(metric,records)?.public_id===service.public_id));
  assert.deepEqual(configured,[]);
  assert.equal(infrastructureRecord(metrics[0],records),records[0]);
});

test('local Docker records still match and other projects never hide a configured service',()=>{
  const row=record('mariadb','cxapp-mariadb','local-docker');
  assert.equal(infrastructureRecord({project:row.project,service:'mariadb'},[row]),row);
  assert.equal(infrastructureRecord({project:'devkit',service:'mariadb'},[row]),undefined);
  assert.equal(infrastructureRecord({project:row.project,service:'redis'},[row]),undefined);
});

test('File Browser aliases match only within the exact registered project',()=>{
  const row=record('file-manager','cxapp-media');
  for(const service of ['filemanager','file-manager','filebrowser','media'])assert.equal(infrastructureRecord({project:row.project,service},[row]),row);
  assert.equal(infrastructureRecord({project:'other-media',service:'media'},[row]),undefined);
});

test('missing and ambiguous registrations remain visible instead of choosing another target',()=>{
  const metric={project:'cxapp-redis',service:'redis'};
  assert.equal(infrastructureRecord(metric,[]),undefined);
  assert.equal(infrastructureRecord(metric,[record('redis',metric.project),{...record('redis',metric.project,'local-docker'),public_id:'another'}]),undefined);
});
