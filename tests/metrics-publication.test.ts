import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {publishMetricSnapshot} from '../scripts/metrics-publication.ts';
test('snapshot publication is atomic and rejects an arbitrary reader',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'metric-publication-')),prior=process.env.CODESHIP_METRICS_READER_UID;
 try{delete process.env.CODESHIP_METRICS_READER_UID;await publishMetricSnapshot(path.join(directory,'snapshot.json'),'{"available":true}');assert.equal(await readFile(path.join(directory,'snapshot.json'),'utf8'),'{"available":true}');process.env.CODESHIP_METRICS_READER_UID='1001';await assert.rejects(publishMetricSnapshot(path.join(directory,'snapshot.json'),'bad'),/reader/);assert.equal(await readFile(path.join(directory,'snapshot.json'),'utf8'),'{"available":true}');}
 finally{if(prior===undefined)delete process.env.CODESHIP_METRICS_READER_UID;else process.env.CODESHIP_METRICS_READER_UID=prior;await rm(directory,{recursive:true,force:true});}
});
