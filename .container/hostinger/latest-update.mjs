import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {latestRelease,updateDecision} from '../latest-release.mjs';
import {validateUpdateTicket,remoteUpdateCommand} from './update-policy.mjs';
import {assertCleanCheckout} from './clean-checkout.mjs';
import readline from 'node:readline';
import {runLifecycleWithRecovery,exportRecovery} from './recovery-channel.mjs';
import {saveAndVerifyRecovery} from './local-recovery.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
const cleanSource=tooling=>assertCleanCheckout(root,tooling);
function linkExisting(destination,source){
 if(!fs.existsSync(source))throw Error('Existing operator dependency/state missing; fix locally, do not improvise on VPS');
 if(fs.existsSync(destination)||fs.lstatSync(path.dirname(destination)).isSymbolicLink()){
  if(fs.realpathSync(destination)!==fs.realpathSync(source))throw Error('Existing checkout runtime link differs');
 }else fs.symlinkSync(source,destination,'dir');
}
export async function receiveUpdate(name,ticket,approve){
 validateUpdateTicket(ticket,name);cleanSource(ticket.tooling);
 if(process.platform!=='linux'||os.hostname()!=='srv914719'||process.getuid()!==0||root!=='/home/codebiz/devkit/codeship'||process.env.CODESHIP_HOSTINGER_FLOCK!=='1')throw Error('Use the approved selected VPS update entry and exclusive lock');
 const stateRoot='/home/codebiz/.deployment/state';
 const target=JSON.parse(fs.readFileSync(stateRoot+'/target.json','utf8'));
 if(target.id!=='hostinger-914719'||target.host!=='69.62.81.166'||target.operator!=='/home/codebiz/.deployment/operators/v-1.0.21/devkit/codeship'||target.publicExposure!==false||target.binding!=='127.0.0.1'||target.dataPolicy!=='fresh'||target.infraNetwork!=='cxapp-network')throw Error('Registered private deployment target differs');
 for(const file of ['data/codeship.sqlite','keys/vault.key'])if(!fs.existsSync(stateRoot+'/'+file))throw Error('Existing private operator state missing; update cannot initialize it');
 const state=JSON.parse(fs.readFileSync(stateRoot+'/devkits/state.json','utf8'));
 const actual=cp.execFileSync('docker',['inspect',name,'--format','{{.Image}}'],{encoding:'utf8'}).trim();
 if(updateDecision(state.services?.[name],ticket.manifest,actual)==='current'){console.log(name+': already on latest approved '+ticket.manifest.version+'; no replacement or migration');return;}
 const expected=JSON.parse(fs.readFileSync(root+'/package.json','utf8')).dependencies;
 for(const dependency of ['kysely','pg','zod','mysql2','bcryptjs']){
  const actualPackage=JSON.parse(fs.readFileSync(target.operator+'/node_modules/'+dependency+'/package.json','utf8'));
  if(actualPackage.version!==expected[dependency])throw Error('Installed operator dependency differs; prepare a released runtime locally');
 }
 linkExisting(root+'/.codeship',stateRoot);
 linkExisting(root+'/node_modules',target.operator+'/node_modules');
 cleanSource(ticket.tooling);
 const approved=stateRoot+'/devkits/approved';fs.mkdirSync(approved,{recursive:true,mode:0o700});
 const releaseSetFile=path.join(approved,name+'-'+randomUUID()+'.json');
 fs.writeFileSync(releaseSetFile,JSON.stringify({schema:1,source:'github',approvedAt:ticket.approvedAt,services:{[name]:ticket.manifest}}),{mode:0o600,flag:'wx'});
 const env={...process.env,CODESHIP_DEVKIT_SCRIPT_ENTRY:'1',CODESHIP_RELEASED_UPDATE_ENTRY:'1',CODESHIP_EXECUTION_MODE:'inventory',CODESHIP_RELEASE_ASSETS_JSON:JSON.stringify({[ticket.manifest.repository+'@'+ticket.manifest.tag]:ticket.archiveUrl}),CODESHIP_KEEP_RELEASE_ARCHIVES:'0'};
 await runLifecycleWithRecovery({name,ticket,env,root,releaseSetFile,approve});
 console.log(name+': updated to '+ticket.manifest.version+' using published tooling '+ticket.tooling.version);
}
async function sendUpdate(name,ticket){
 const child=cp.spawn('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','codexsun-hostinger',remoteUpdateCommand(ticket.tooling,name)],{stdio:['pipe','pipe','ignore'],windowsHide:true});
 child.stdin.on('error',()=>{});
 child.stdin.write(JSON.stringify(ticket)+'\n');
 const lines=readline.createInterface({input:child.stdout,crlfDelay:Infinity});
 let handling=Promise.resolve();
 lines.on('line',line=>{
  if(!line.startsWith('CODESHIP_RECOVERY:')){console.log(line);return;}
  handling=handling.then(async()=>{
   const request=JSON.parse(line.slice('CODESHIP_RECOVERY:'.length));
   try{console.log(name+': verifying recovery in isolated local Docker');const proof=await saveAndVerifyRecovery(request);child.stdin.write(JSON.stringify({id:request.id,...proof})+'\n');}
   catch{child.stdin.write(JSON.stringify({id:request.id,offHostRestoreVerified:false})+'\n');}
  });
 });
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 await handling;lines.close();if(!child.stdin.destroyed)child.stdin.end();if(code!==0)throw Error('VPS update stopped; live data/recovery retained. Correct the blocker locally.');
}
async function main(){
 const [name,mode,id]=process.argv.slice(2);if(!['codeship','codeitz','uiux'].includes(name)||mode&&!['--receive','--check','--export-recovery'].includes(mode))throw Error('Use update.sh codeship|codeitz|uiux [--check]');
 if(mode==='--export-recovery'){await exportRecovery(root,name,id);return;}
 if(mode==='--receive'){
  const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});const iterator=lines[Symbol.asyncIterator]();
  try{const first=await iterator.next();if(first.done||first.value.length>256000)throw Error('Approved update ticket missing');
   await receiveUpdate(name,JSON.parse(first.value),async request=>{
    console.log('CODESHIP_RECOVERY:'+JSON.stringify(request));
    let timer;try{const next=await Promise.race([iterator.next(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Local restore approval timed out')),30*60*1000);})]);if(next.done||next.value.length>8192)throw Error('Local restore approval missing');const proof=JSON.parse(next.value);if(proof.id!==request.id)throw Error('Recovery approval scope differs');return proof;}finally{clearTimeout(timer);}
   });
  }finally{lines.close();process.stdin.pause();}return;
 }
 const selected=await latestRelease(name);const tooling=name==='codeship'?selected:await latestRelease('codeship');
 const ticket={schema:1,source:'github',selected:name,approvedAt:new Date().toISOString(),tooling:{version:tooling.manifest.version,tag:tooling.manifest.tag,commit:tooling.manifest.commit},manifest:selected.manifest,archiveUrl:selected.archiveUrl};
 validateUpdateTicket(ticket,name);cleanSource(ticket.tooling);
 console.log(name+': latest successful stable GitHub release '+selected.manifest.tag);
 if(mode==='--check')return;
 await sendUpdate(name,ticket);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1]))main().catch(error=>{console.log('update: blocked; '+(error instanceof SyntaxError?'invalid approved metadata':error.message));process.exitCode=1;});
