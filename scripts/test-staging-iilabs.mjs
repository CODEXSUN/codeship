import cp from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const ssh=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','D:/workspace/codebiz/deploy/.ssh/ubuntu_local_ed25519','cx@192.168.1.34'];
const credentials=JSON.parse(cp.execFileSync('ssh',[...ssh,'cat /srv/codebiz-staging/private/credentials.json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assert.equal(credentials.target,'ubuntu-staging');
const base='http://127.0.0.1:24435',selector=randomBytes(16).toString('hex');let cookie='',csrf='';
async function send(path,{method='GET',body,origin=base}={}){
 const r=await fetch(base+path,{method,headers:{origin,'x-platform-tab':selector,...(cookie?{cookie}:{}),...(csrf?{'x-csrf-token':csrf}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 if(r.headers.getSetCookie().length)cookie=r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:r.status,data};
}
assert.equal((await send('/api/ready')).status,200);
assert.equal((await send('/platform-api/v1/identity/login',{method:'POST',body:{corporateId:'iilabs',identifier:'codexsun',password:credentials.ownerPassword,realm:'user'}})).status,200);
const session=await send('/platform-api/v1/identity/session');assert.equal(session.status,200);assert.equal(session.data.tenant.code,'iilabs');csrf=session.data.csrfToken;assert.equal(typeof csrf,'string');
const me=await send('/platform-api/v1/gateway/iilabs/me');assert.equal(me.status,200);assert.equal(me.data.role,'agency');
const created=await send('/platform-api/v1/gateway/iilabs/clients',{method:'POST',body:{businessName:'Staging promotion proof '+Date.now(),industry:'Fixture',bio:'Synthetic staging only',website:'',contactName:'',email:'',phone:'',city:'Fixture',goals:'Save and reopen',status:'onboarding'}});assert.equal(created.status,201);assert.ok(created.data.id);
const rows=await send('/platform-api/v1/gateway/iilabs/clients');assert.equal(rows.status,200);assert.ok(rows.data.some(row=>row.id===created.data.id));
assert.equal((await send('/platform-api/v1/identity/session',{origin:'https://example.invalid'})).status,403);
for(const route of ['/','/services','/approach','/studio'])assert.equal((await send(route)).status,200);
assert.equal((await send('/platform-api/v1/identity/logout',{method:'POST',body:{}})).status,200);
assert.equal((await send('/platform-api/v1/gateway/iilabs/me')).status,401);
fs.writeFileSync('.codeship/staging/iilabs-proof.json',JSON.stringify({at:new Date().toISOString(),target:'ubuntu-staging',version:'0.1.15',newTenantLogin:true,agencyPermissions:true,jsonSaveReopen:true,foreignOriginDenied:true,logout:true,publicPages:true},null,2));
console.log('IILabs staging login, independent tenant, permissions, save/reopen, public pages and logout passed.');
