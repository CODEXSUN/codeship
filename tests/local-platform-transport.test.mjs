import test from 'node:test';
import assert from 'node:assert/strict';
import {localPlatformBrowserOrigins,ensureLocalPlatformTransport} from '../.container/apps/local-platform-transport.mjs';
test('managed local origins activate private service context without adding public exposure',()=>{
 const values=localPlatformBrowserOrigins({});for(const port of [14385,14350,14305,14315,14435])assert.ok(values.includes('http://127.0.0.1:'+port));
 assert.equal(new Set(values).size,values.length);assert.ok(values.every(value=>value.startsWith('http://127.0.0.1:')));
});
test('existing exact public origins are preserved and reconciliation is idempotent',()=>{
 const first=localPlatformBrowserOrigins({PLATFORM_BROWSER_ORIGINS:'["https://cx.example.com"]'});
 assert.ok(first.includes('https://cx.example.com'));assert.deepEqual(localPlatformBrowserOrigins({PLATFORM_BROWSER_ORIGINS:JSON.stringify(first)}),first);
 for(const value of ['{}','["*"]','["https://user:pass@example.com"]','["https://example.com/path"]'])assert.throws(()=>localPlatformBrowserOrigins({PLATFORM_BROWSER_ORIGINS:value}));
});
test('the local configuration adapter cannot run on a Linux VPS',async()=>{
 if(process.platform!=='win32')await assert.rejects(ensureLocalPlatformTransport('/home/codebiz/devkit/codeship'),/Windows-only/);
});
