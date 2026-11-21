import cp from 'node:child_process';
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const names=process.argv.slice(2);if(!names.length||names.some(n=>!['codeship','codeitz','uiux'].includes(n)))throw Error('Select staging devkits explicitly.');
const values=cp.execFileSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','D:/workspace/codebiz/deploy/.ssh/ubuntu_local_ed25519','cx@192.168.1.34','cat /srv/codebiz-staging/private/credentials.json /srv/codebiz-staging/state/platform/bootstrap.json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});
const boundary=values.indexOf('}\n{');if(boundary<0)throw Error('Invalid private staging fixture configuration.');
const credentials=JSON.parse(values.slice(0,boundary+1)),identity=JSON.parse(values.slice(boundary+2));
if(credentials.target!=='ubuntu-staging'||credentials.ownerUsername!=='stageowner'||credentials.ownerEmail!=='stageowner@example.invalid')throw Error('Use only the synthetic staging fixture.');
const ports={codeship:24350,codeitz:24305,uiux:24315},report=[];
for(const name of names){
 const base='http://127.0.0.1:'+ports[name];
 const client=()=>({selector:randomBytes(16).toString('hex'),cookie:'',csrf:''});
 async function send(session,path,{method='GET',body,origin=base,csrf=session.csrf,cookie=session.cookie,selector=session.selector}={}){
  const response=await fetch(base+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{'x-platform-tab':selector,...(cookie?{cookie}:{}),...(origin?{origin}:{}),...(method!=='GET'?{'content-type':'application/json',...(csrf?{'x-csrf-token':csrf}:{})}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const cookies=response.headers.getSetCookie();if(cookies.length)session.cookie=cookies.map(v=>v.split(';')[0]).join('; ');
  let data;try{data=await response.json();}catch{data=null;}
  return {status:response.status,data};
 }
 const first=client(),second=client();
 for(const session of [first,second]){
  const login=await send(session,'/platform-api/v1/identity/login',{method:'POST',body:{identifier:credentials.ownerUsername,password:credentials.ownerPassword,realm:'sa',corporateId:'codexsun'}});
  assert.equal(login.status,200,name+' staging original login failed');
  const current=await send(session,'/platform-api/v1/identity/session');assert.equal(current.status,200);session.csrf=current.data.csrfToken;assert.equal(typeof session.csrf,'string');
  const workspace=await send(session,'/api/v1/workspace');assert.equal(workspace.status,200,name+' staging workspace denied');assert.equal(workspace.data.tenantId,identity.tenantId);assert.equal(workspace.data.userId,identity.ownerId);
 }
 assert.equal((await send(first,'/api/v1/workspace',{origin:'https://example.invalid'})).status,403,name+' foreign origin not denied');
 const selected=await send(first,'/api/v1/workspace',{selector:randomBytes(16).toString('hex')});assert.ok([401,403].includes(selected.status));
 const cross=await send(first,'/platform-api/v1/identity/logout',{method:'POST',body:{},csrf:second.csrf});assert.equal(cross.status,403,name+' cross-session CSRF not denied');
 assert.equal((await send(first,'/api/v1/workspace')).status,200);assert.equal((await send(second,'/api/v1/workspace')).status,200);
 const logout=await send(first,'/platform-api/v1/identity/logout',{method:'POST',body:{}});assert.equal(logout.status,200);
 assert.ok([401,403].includes((await send(first,'/api/v1/workspace')).status));assert.equal((await send(second,'/api/v1/workspace')).status,200,name+' sibling session was lost');
 assert.equal((await send(second,'/platform-api/v1/identity/logout',{method:'POST',body:{}})).status,200);
 report.push({name,login:true,workspaceIdentity:true,foreignOriginDenied:true,wrongSelectorDenied:true,crossCsrfDenied:true,logout:true,siblingPreserved:true});console.log(name+': staging original SA login, workspace identity, CSRF/origin/tab isolation and logout verified.');
}
fs.mkdirSync('.codeship/staging',{recursive:true});fs.writeFileSync('.codeship/staging/auth-proof.json',JSON.stringify({at:new Date().toISOString(),target:'ubuntu-staging',syntheticCredentialsOnly:true,report},null,2));
