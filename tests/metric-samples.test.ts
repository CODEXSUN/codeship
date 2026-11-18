import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appendMetricSamples} from '../src/web/modules/reports/samples.ts';
import type {DockerMetricReport} from '../contracts/docker-metrics.ts';
test('graph samples reject stale and duplicate snapshots, reset gaps and cap retained history',()=>{
 const report=(seconds:number,stale=false):DockerMetricReport=>({category:'infra',available:true,stale,collectedAt:new Date(seconds*1000).toISOString(),containers:[{id:'fixture',cpuPercent:0,memoryBytes:1048576} as DockerMetricReport['containers'][number]]});
 let samples=appendMetricSamples({},report(100));
 assert.equal(samples.fixture![0]!.cpu,0);assert.equal(samples.fixture![0]!.memory,1);
 samples=appendMetricSamples(samples,report(100));assert.equal(samples.fixture!.length,1);
 samples=appendMetricSamples(samples,report(110,true));assert.equal(samples.fixture!.length,1);
 samples=appendMetricSamples(samples,report(110));assert.equal(samples.fixture!.length,2);
 samples=appendMetricSamples(samples,report(150));assert.equal(samples.fixture!.length,1);
 for(let i=1;i<=70;i++)samples=appendMetricSamples(samples,report(150+i*10));
 assert.equal(samples.fixture!.length,60);
 assert.deepEqual(appendMetricSamples(samples,{...report(900),containers:[]}),{});
});
