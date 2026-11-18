import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountedBytes,parseDu,containerStorage} from '../scripts/container-storage.ts';
test('mounted storage avoids nested same-device double counts and includes distinct devices',()=>{
 assert.equal(mountedBytes([{path:'/srv',bytes:100,device:'1'},{path:'/srv/app',bytes:40,device:'1'},{path:'/database',bytes:25,device:'1'}]),125);
 assert.equal(mountedBytes([{path:'/srv',bytes:100,device:'1'},{path:'/srv/app',bytes:40,device:'2'}]),140);
 assert.equal(mountedBytes([{path:'/a',bytes:100,device:'1'},{path:'/a/b',bytes:40,device:'1'},{path:'/a/b/c',bytes:10,device:'1'}]),100);
 assert.throws(()=>parseDu('permission denied'));assert.equal(parseDu('12\t/data\n'),12288);
});
test('container storage includes its writable layer and reports unavailable instead of false zero totals',async()=>{
 const run=async(args:string[])=>{
  if(args.includes('--size'))return '1024';
  if(args[0]==='inspect')return JSON.stringify([{Type:'volume',Name:'data',Source:'/host/data',Destination:'/data'}]);
  return args.includes('du')?'12\t/data\n':'123\n';
 };
 const result=await containerStorage('fixture',true,run);
 assert.equal(result.writableBytes,1024);assert.equal(result.volumeBytes,12288);assert.equal(result.storageBytes,13312);
 const stopped=await containerStorage('fixture',false,run);assert.equal(stopped.writableBytes,1024);assert.equal(stopped.storageBytes,null);
 const failed=await containerStorage('fixture',true,async args=>{if(args.includes('du'))throw new Error('denied');return run(args);});
 assert.equal(failed.volumeBytes,null);assert.equal(failed.storageBytes,null);
});
