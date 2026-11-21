import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {verifyLocalRecovery} from '../hostinger/local-recovery.mjs';
const ssh=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','D:/workspace/codebiz/deploy/.ssh/ubuntu_local_ed25519','cx@192.168.1.34'];
const remote=command=>cp.execFileSync('ssh',[...ssh,command],{stdio:['ignore','pipe','pipe'],windowsHide:true,maxBuffer:256*1024*1024});
const root='/srv/codebiz-staging/state/iilabs';
const request=JSON.parse(remote('cat '+root+'/backup-request.json'));
if(request.target!=='ubuntu-staging'||request.service!=='iilabs'||request.database!=='platform_master'||request.file!==root+'/private/master-before.dump'||!/^[a-f0-9]{64}$/.test(request.sha256))throw Error('Staging backup request differs.');
const directory=path.resolve('.codeship/staging/recovery/'+request.sha256);fs.mkdirSync(directory,{recursive:true,mode:0o700});
if(process.platform==='win32'){
 const user=(process.env.USERDOMAIN?process.env.USERDOMAIN+'\\':'')+process.env.USERNAME;
 cp.execFileSync('icacls',[directory,'/inheritance:r','/grant:r',user+':(OI)(CI)F'],{stdio:'ignore',windowsHide:true});
}
const file=directory+'/platform_master.dump';const archive=remote('cat '+request.file);
if(createHash('sha256').update(archive).digest('hex')!==request.sha256)throw Error('Staging off-host checksum differs.');
if(fs.existsSync(file)){if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==request.sha256)throw Error('Retained backup differs.');}else fs.writeFileSync(file,archive,{mode:0o600,flag:'wx'});
const proof={target:'ubuntu-staging',sha256:request.sha256,...await verifyLocalRecovery(file,'postgresql'),verifiedAt:new Date().toISOString()};
fs.writeFileSync(directory+'/verification.json',JSON.stringify(proof,null,2),{mode:0o600});
const receiver="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',()=>{const f=require('fs'),p=JSON.parse(s);if(require('os').hostname()!=='cxserver'||process.getuid()!==1000||p.target!=='ubuntu-staging'||p.offHostRestoreVerified!==true)throw Error('Wrong staging proof');f.writeFileSync('/srv/codebiz-staging/state/iilabs/backup-proof.json',JSON.stringify(p),{mode:0o600});});";
const quote=value=>"'"+value.replaceAll("'","'\"'\"'")+"'";
cp.execFileSync('ssh',[...ssh,'/srv/codebiz-staging/bin/node -e '+quote(receiver)],{input:JSON.stringify(proof),stdio:['pipe','ignore','pipe'],windowsHide:true});
console.log('Staging Platform master backup transferred privately and restored successfully in disposable local PostgreSQL; activation admitted.');
