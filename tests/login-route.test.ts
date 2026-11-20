import test from 'node:test';
import assert from 'node:assert/strict';
import {withLoginRoute} from '../src/web/login-route.ts';
test('SA entry replaces a denied tenant session only after successful explicit login',async()=>{
 let reads=0,completed=0;let submitted:unknown;
 const session={realm:'sa'};
 const client=withLoginRoute({async session(){reads++;return session;},async login(input:unknown){submitted=input;}},{pathname:'/sa/login'},()=>completed++);
 await assert.rejects(client.session(),{statusCode:401});assert.equal(reads,0);assert.equal(completed,0);
 await client.login({identifier:'existing-sa',password:'disposable-test'});
 assert.deepEqual(submitted,{identifier:'existing-sa',password:'disposable-test',realm:'sa'});
 assert.equal(completed,1);assert.equal(await client.session(),session);assert.equal(reads,1);
});
test('failed login stays at original form and does not reuse the old tenant session',async()=>{
 let complete=false;const client=withLoginRoute({async session(){throw Error('must not reuse');},async login(){throw Error('credentials rejected');}},{pathname:'/sa/login'},()=>{complete=true;});
 await assert.rejects(client.login({identifier:'wrong',password:'test'}),/credentials rejected/);
 await assert.rejects(client.session(),{statusCode:401});assert.equal(complete,false);
});
test('ordinary pages preserve session and supplied credentials without forcing a realm',async()=>{
 let request:unknown;const session={realm:'user'};const client=withLoginRoute({async session(){return session;},async login(input:unknown){request=input;}},{pathname:'/registry'},()=>assert.fail('no login route'));
 assert.equal(await client.session(),session);await client.login({identifier:'existing',password:'test'});assert.deepEqual(request,{identifier:'existing',password:'test'});
});
