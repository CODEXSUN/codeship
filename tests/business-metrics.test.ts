import test from 'node:test';
import assert from 'node:assert/strict';
import {hasFreshApplicationMetrics} from '../.container/apps/business-metrics.mjs';

test('admission requires fresh metrics for the exact owned application container',()=>{
 const now=Date.parse('2026-11-20T06:00:00Z'),id='a'.repeat(64);
 const row={project:'applications',service:'core-app',owner:'apps/core-app',id:id.slice(0,12)};
 const report={available:true,collectedAt:new Date(now-1000).toISOString(),containers:[row]};
 assert.equal(hasFreshApplicationMetrics(report,'core-app',id,now),true);
 for(const invalid of [{...report,available:false},{...report,containers:undefined},{...report,collectedAt:new Date(now-45000).toISOString()},{...report,collectedAt:new Date(now+1000).toISOString()},{...report,containers:[{...row,owner:'apps/other'}]},{...report,containers:[{...row,id:'b'.repeat(12)}]}])assert.equal(hasFreshApplicationMetrics(invalid,'core-app',id,now),false);
 assert.equal(hasFreshApplicationMetrics(report,'core-app','',now),false);
});
