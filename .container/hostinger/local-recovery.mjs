import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import cp from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';import {pipeline} from 'node:stream/promises';
const postgresImage='postgres:18.7-alpine';
const nodeImage='node:26.13.1-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1';
const docker=(args,input)=>cp.execFileSync('docker',args,{input,stdio:['pipe','pipe','pipe'],windowsHide:true,maxBuffer:16*1024*1024});
const text=args=>docker(args).toString().trim();
function childDone(child){return new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('Recovery transfer/restore failed; migration is blocked')));});}
export async function verifyLocalRecovery(file,kind){
 if(!['postgresql','sqlite'].includes(kind))throw Error('Unsupported recovery scope');
 const image=kind==='postgresql'?postgresImage:nodeImage;
 try{docker(['image','inspect',image]);}catch{docker(['pull',image]);}
 const imageId=JSON.parse(text(['image','inspect',image]))[0].Id;
 if(kind==='sqlite'){
  const code="const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/recovery.sqlite',{readOnly:true});try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)process.exitCode=1;db.prepare('SELECT count(*) AS n FROM sqlite_schema').get();}finally{db.close();}";
  docker(['run','--rm','--network','none','--mount','type=bind,source='+path.resolve(file)+',target=/recovery.sqlite,readonly','--entrypoint','node',imageId,'-e',code]);
  return {offHostRestoreVerified:true,imageId,kind};
 }
 const name='codeship-recovery-'+randomUUID().slice(0,8);let created=false;
 try{
  docker(['run','-d','--name',name,'--tmpfs','/var/lib/postgresql:rw,size=2g','--label','codeship.recovery='+name,'--network','none','-e','POSTGRES_USER=recovery','-e','POSTGRES_PASSWORD=disposable-restore-only','-e','POSTGRES_DB=recovery',imageId]);created=true;
  let ready=false;for(let i=0;i<240;i++){try{docker(['exec','-e','PGPASSWORD=disposable-restore-only',name,'psql','-h','127.0.0.1','-U','recovery','-d','recovery','-tAc','SELECT 1']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}if(!ready)throw Error('Local restore PostgreSQL did not become ready');
  const restore=cp.spawn('docker',['exec','-i',name,'pg_restore','-U','recovery','-d','recovery','--single-transaction','--exit-on-error','--no-owner','--no-privileges'],{stdio:['pipe','ignore','ignore'],windowsHide:true});
  const completed=childDone(restore);await Promise.all([pipeline(fs.createReadStream(file),restore.stdin),completed]);
  docker(['exec',name,'psql','-U','recovery','-d','recovery','-tAc',"SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')"]);
  return {offHostRestoreVerified:true,imageId,kind};
 }finally{if(created){const c=JSON.parse(text(['inspect',name]))[0];if(c.Config.Labels['codeship.recovery']!==name)throw Error('Recovery container ownership changed');docker(['rm','-fv',name]);}}
}
export async function saveAndVerifyRecovery(request){
 if(!['codeitz','codeship'].includes(request.service)||!['postgresql','sqlite'].includes(request.kind)||!/^[a-f0-9-]{36}$/.test(request.exportId)||!/^[a-f0-9]{64}$/.test(request.sha256))throw Error('Invalid recovery request');
 const directory=path.join(os.homedir(),'.codeship','recovery',request.exportId);fs.mkdirSync(directory,{recursive:true,mode:0o700});
 if(process.platform==='win32'){const user=(process.env.USERDOMAIN?process.env.USERDOMAIN+String.fromCharCode(92):'')+process.env.USERNAME;cp.execFileSync('icacls',[directory,'/inheritance:r','/grant:r',user+':(OI)(CI)F'],{stdio:'ignore',windowsHide:true});}
 const file=path.join(directory,request.service+(request.kind==='sqlite'?'.sqlite':'.dump'));
 const command='sh /home/codebiz/devkit/codeship/.container/hostinger/update.sh '+request.service+' --export-recovery '+request.exportId;
 const source=cp.spawn('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','codexsun-hostinger',command],{stdio:['ignore','pipe','ignore'],windowsHide:true});
 const completed=childDone(source);await Promise.all([pipeline(source.stdout,fs.createWriteStream(file,{flags:'wx',mode:0o600})),completed]);
 const hash=createHash('sha256');for await(const b of fs.createReadStream(file))hash.update(b);if(hash.digest('hex')!==request.sha256)throw Error('Off-host recovery checksum differs; migration blocked');
 let proof;try{proof=await verifyLocalRecovery(file,request.kind);}catch{throw Error('Off-host restore verification failed locally; retain recovery, do not migrate');}
 fs.writeFileSync(path.join(directory,'verification.json'),JSON.stringify({at:new Date().toISOString(),service:request.service,sha256:request.sha256,...proof},null,2),{mode:0o600,flag:'wx'});
 return {sha256:request.sha256,offHostRestoreVerified:true,reference:request.exportId+'/'+path.basename(file)};
}
