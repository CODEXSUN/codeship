import test from 'node:test';
import assert from 'node:assert/strict';
import {releasedMetricsUnit,ensureReleasedHostMetrics} from '../.container/hostinger/metrics-service.mjs';
const previous='/home/codebiz/.deployment/operators/v-1.0.21/devkit/codeship';
const fixture='[Service]\nEnvironment=CODESHIP_METRICS_READER_UID=1000\nWorkingDirectory='+previous+'\nExecStart=/home/codebiz/.deployment/bin/node '+previous+'/scripts/collect-docker-metrics.ts --watch\nRestart=on-failure\n';
test('only the known metrics service moves to clean released source, preserving reader and restart policy',()=>{
 const next=releasedMetricsUnit(fixture);assert.match(next,/WorkingDirectory=\/home\/codebiz\/devkit\/codeship\n/);assert.match(next,/ExecStart=.*\/home\/codebiz\/devkit\/codeship\/scripts\/collect-docker-metrics.ts --watch/);assert.match(next,/METRICS_READER_UID=1000/);assert.match(next,/Restart=on-failure/);assert.equal(releasedMetricsUnit(next),next);
 for(const bad of [fixture.replace('UID=1000','UID=0'),fixture.replace(' --watch',' --watch; other'),fixture+'ExecStart=/another\n',fixture.replace(previous,'/unowned')])assert.throws(()=>releasedMetricsUnit(bad));
});
test('production service changes are refused on local and staging identities',async()=>{
 await assert.rejects(ensureReleasedHostMetrics('/srv/codebiz-staging',{commit:'a'.repeat(40)}),/Hostinger/);
});
