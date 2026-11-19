import test from 'node:test';import assert from 'node:assert/strict';import {browserUrl,metricAppUrl,storagePercent} from '../src/web/modules/reports/presentation.ts';
test('app links use actual published ports when registry localhost metadata is stale',()=>{
 const row:any={ports:'127.0.0.1:14395->4395/tcp'};assert.equal(metricAppUrl(row,{host:'127.0.0.1',port:4459} as any),'http://127.0.0.1:14395/');assert.equal(metricAppUrl(row),'http://127.0.0.1:14395/');assert.equal(metricAppUrl({ports:'0.0.0.0:14350->4350/tcp'} as any),'http://127.0.0.1:14350/');
 assert.equal(metricAppUrl(row,{host:'https://crm.example.com',port:null} as any),'https://crm.example.com/');assert.equal(browserUrl('javascript:alert(1)',null),null);assert.equal(browserUrl('https://user:password@example.com',null),null);assert.equal(browserUrl('localhost',70000),null);assert.equal(metricAppUrl({ports:''} as any),null);
});
test('disk rings measure each container storage, not shared filesystem used bytes',()=>{
 assert.equal(storagePercent({storageBytes:25,diskTotalBytes:100}),25);assert.equal(storagePercent({storageBytes:0,diskTotalBytes:100}),0);assert.equal(storagePercent({storageBytes:null,diskTotalBytes:100}),null);assert.equal(storagePercent({storageBytes:25,diskTotalBytes:0}),null);assert.equal(storagePercent({storageBytes:500,diskTotalBytes:100}),100);
});
