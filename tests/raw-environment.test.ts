import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {rawEnvironment,requireRawCompose} from '../.container/raw-environment.mjs';
test('Compose retains literal secret dollars, quote characters, hashes and empty values',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'codeship-env-'));
 const project='codeship-env-test-'+randomBytes(5).toString('hex'),file=path.join(root,'compose.json');
 const compose=(args:string[])=>execFileSync('docker',['compose','-p',project,'-f',file,...args],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
 try{
  const values={SECRET:'$HOME ${UNDEFINED_VAR} "double" \'single\' `tick` #hash',EMPTY:'',SPACES:'  intentional spaces  '};
  writeFileSync(path.join(root,'runtime.env'),rawEnvironment(values));
  writeFileSync(file,JSON.stringify({name:project,services:{fixture:{image:'node:26.13.1-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1',network_mode:'none',env_file:[{path:path.join(root,'runtime.env'),format:'raw'}]}}}));
  // config output re-escapes dollars for reusable Compose files. Inspect the created
  // container's actual environment; the fixture is never started and has no mounts/ports.
  compose(['create','--no-build']);const id=compose(['ps','--all','--quiet','fixture']).trim();
  const result=JSON.parse(execFileSync('docker',['inspect','--format','{{json .Config.Env}}',id],{encoding:'utf8',windowsHide:true}));
  const actual=Object.fromEntries(result.map((line:string)=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1)];}));
  for(const [key,value]of Object.entries(values))assert.equal(actual[key],value);
 }finally{try{compose(['rm','--force','--stop']);}finally{rmSync(root,{recursive:true,force:true});}}
});
test('literal runtime files reject line injection and require a supported Compose parser',()=>{
 for(const values of [{'BAD=KEY':'value'},{KEY:'first\nSECOND=unsafe'},{KEY:'nul\0'}])assert.throws(()=>rawEnvironment(values));
 assert.throws(()=>requireRawCompose('2.29.9'));requireRawCompose('2.30.0');requireRawCompose('5.7.0');
});
