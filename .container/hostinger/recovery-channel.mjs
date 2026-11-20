import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import os from 'node:os';import {randomUUID,createHash} from 'node:crypto';
import {assertCleanCheckout} from './clean-checkout.mjs';
const state='/home/codebiz/.deployment/state';
async function digest(file){const h=createHash('sha256');for await(const b of fs.createReadStream(file))h.update(b);return h.digest('hex');}
export function runLifecycleWithRecovery({name,ticket,env,root,releaseSetFile,approve}){
 return new Promise((resolve,reject)=>{
  const child=cp.fork('.container/devkits/lifecycle.ts',['update',name,'--release-set',releaseSetFile],{cwd:root,env,stdio:['ignore','inherit','inherit','ipc']});
  let pending=false;
  child.on('message',async message=>{
   if(message?.type!=='recovery-required'||pending)return;
   pending=true;const exportId=randomUUID();const recordFile=state+'/devkits/recovery-exports/'+exportId+'.json';
   try{
    const r=message.recovery;
    if(r.service!==name||!/^[a-f0-9]{64}$/.test(r.sha256??''))throw Error('Recovery scope mismatch');
    if(name==='codeitz'){
     if(r.kind!=='postgresql'||!fs.realpathSync(r.file).startsWith(state+'/devkits/private/'))throw Error('Recovery path differs from selected database scope');
     if(await digest(r.file)!==r.sha256)throw Error('Recovery archive changed');
    }else if(name==='codeship'){
     if(r.kind!=='sqlite'||r.imageId!==ticket.manifest.imageId||!/^\/data\/backups\/devkits-[0-9TZ.\-]+\.sqlite$/.test(r.file))throw Error('SQLite recovery scope differs');
    }else throw Error('Stateless service has no migration scope');
    fs.mkdirSync(path.dirname(recordFile),{recursive:true,mode:0o700});
    fs.writeFileSync(recordFile,JSON.stringify({service:name,tooling:ticket.tooling,recovery:r,expiresAt:Date.now()+30*60*1000}),{mode:0o600,flag:'wx'});
    const proof=await approve({id:message.id,exportId,service:name,kind:r.kind,sha256:r.sha256});
    if(proof.sha256!==r.sha256||proof.offHostRestoreVerified!==true)throw Error('Off-host recovery approval missing');
    child.send({type:'recovery-approval',id:message.id,accepted:true,...proof});
   }catch{if(child.connected)child.send({type:'recovery-approval',id:message.id,accepted:false});}
   finally{if(fs.existsSync(recordFile))fs.unlinkSync(recordFile);pending=false;}
  });
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Selected deployment failed; recovery/state retained; fix locally')));
 });
}
export async function exportRecovery(root,name,id){
 if(process.platform!=='linux'||os.hostname()!=='srv914719'||process.getuid()!==0||root!=='/home/codebiz/devkit/codeship'||!['codeship','codeitz'].includes(name)||!/^[a-f0-9-]{36}$/.test(id??''))throw Error('Invalid recovery export');
 const record=JSON.parse(fs.readFileSync(state+'/devkits/recovery-exports/'+id+'.json','utf8'));
 if(record.service!==name||record.expiresAt<Date.now()||!fs.existsSync(state+'/devkits/operation.lock'))throw Error('Recovery export is not part of the active deployment');
 assertCleanCheckout(root,record.tooling);const r=record.recovery;
 if(r.kind==='postgresql'){
  if(!fs.realpathSync(r.file).startsWith(state+'/devkits/private/')||await digest(r.file)!==r.sha256)throw Error('Recovery export changed');
  for await(const b of fs.createReadStream(r.file))if(!process.stdout.write(b))await new Promise(resolve=>process.stdout.once('drain',resolve));
 }else{
  const code='process.stdout.write(require("node:fs").readFileSync('+JSON.stringify(r.file)+'))';
  const source=cp.spawn('docker',['run','--rm','--network','none','--mount','type=volume,source=codeship_data,target=/data,readonly','--entrypoint','node',r.imageId,'-e',code],{stdio:['ignore','pipe','ignore']});
  source.stdout.pipe(process.stdout);await new Promise((resolve,reject)=>{source.once('error',reject);source.once('close',code=>code===0?resolve():reject(Error('Recovery export failed')));});
 }
}
