import test from 'node:test';import assert from 'node:assert/strict';import {dockerBrowserOrigins} from '../.container/apps/browser-origins.mjs';
test('Docker browser metadata uses assigned published bindings without changing native settings',()=>{
 const native={BILLING_WEB_PORT:'4330',BILLING_WEB_ORIGIN:'http://127.0.0.1:4330',BILLING_PUBLIC_ORIGIN:'http://127.0.0.1:4330',BILLING_CORE_PUBLIC_ORIGIN:'http://127.0.0.1:4340',BILLING_CORE_API_URL:'http://127.0.0.1:4345'};
 const result=dockerBrowserOrigins(native,'billing');assert.equal(result.BILLING_PUBLIC_ORIGIN,'http://127.0.0.1:14335');assert.equal(result.BILLING_CORE_PUBLIC_ORIGIN,'http://127.0.0.1:14345');assert.equal(result.BILLING_CORE_API_URL,native.BILLING_CORE_API_URL);assert.equal(native.BILLING_WEB_PORT,'4330');
 assert.equal(dockerBrowserOrigins({},'core-app').CORE_APP_PUBLIC_ORIGIN,'http://127.0.0.1:14345');
});
