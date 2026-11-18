import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {metricCategory,dockerMetricReport} from '../src/api/modules/business/monitor/docker-metrics.ts';
test('Docker categories use explicit group/service and registry ownership, excluding unrelated and native apps',()=>{
 const apps=[{owner:'devkit/codeship',project:'codeship',environment:'local-docker'},{owner:'apps/crm',project:'crm-docker',environment:'local-docker'},{owner:'apps/billing',project:'billing-dev',environment:'development'}];
 const group={project:'codebiz-infra',services:[{key:'postgres'},{key:'redis'}]};
 assert.equal(metricCategory('codebiz-infra','redis',apps,[],group)?.category,'infra');
 assert.equal(metricCategory('codeship','app',apps,[],group)?.category,'devkits');
 assert.equal(metricCategory('crm-docker','app',apps,[],group)?.category,'apps');
 assert.equal(metricCategory('billing-dev','app',apps,[],group),null);
 assert.equal(metricCategory('codebiz-infra','unregistered',apps,[],group),null);
 assert.equal(metricCategory('some-other-project','redis',apps,[],group),null);
});
test('Devkits group matches each service owner rather than assigning all containers to the first registry row',()=>{
 const records=['codeship','codeitz','uiux'].map(name=>({owner:'devkit/'+name,project:'devkits',environment:'local-docker'}));
 for(const name of ['codeship','codeitz','uiux'])assert.equal(metricCategory('devkits',name,records,[])?.owner,'devkit/'+name);
 assert.equal(metricCategory('devkits','app',records,[]),null);
});
test('metric reports filter categories, flag stale snapshots, and fail closed on malformed or missing data',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'codeship-metrics-')),file=path.join(dir,'snapshot.json'),now=Date.now();
 const row={id:'abc123abc123',name:'fixture',project:'fixture',service:'app',owner:'devkit/fixture',state:'running',health:'healthy',image:'fixture:1',ports:'',startedAt:'',restarts:0,cpuPercent:1,memoryBytes:1024,memoryLimitBytes:4096,networkRxBytes:null,networkTxBytes:null,blockReadBytes:null,blockWriteBytes:null,pids:1};
 try{
  await writeFile(file,JSON.stringify({collectedAt:new Date(now).toISOString(),available:true,containers:[{...row,category:'infra'},{...row,id:'def123def123',category:'devkits'}]}));
  const infra=await dockerMetricReport('infra',file,now);assert.equal(infra.containers.length,1);assert.equal(infra.stale,false);
  assert.equal((await dockerMetricReport('apps',file,now)).containers.length,0);
  assert.equal((await dockerMetricReport('infra',file,now+46000)).stale,true);
  await writeFile(file,'{}');assert.equal((await dockerMetricReport('infra',file,now)).available,false);
  assert.equal((await dockerMetricReport('infra',path.join(dir,'missing'),now)).available,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
