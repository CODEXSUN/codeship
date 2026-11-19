import test from 'node:test';import assert from 'node:assert/strict';import {collectorCommand,isMetricsCollector} from '../scripts/metrics-process.ts';
test('metrics lease rejects a reused PID belonging to a browser or unrelated node process',async()=>{
 assert.equal(collectorCommand('chrome.exe --type=renderer'),false);assert.equal(collectorCommand('node src/api/server.ts'),false);
 assert.equal(collectorCommand('node C:/operator/scripts/collect-docker-metrics.ts --watch'),true);
 assert.equal(collectorCommand('node /operator/scripts/collect-docker-metrics.ts --once'),false);
 assert.equal(await isMetricsCollector(process.pid),false);assert.equal(await isMetricsCollector(-1),false);
});
