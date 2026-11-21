import {product,deploymentProduct,installedProduct} from '../product.mjs';
import {parseEnv} from 'node:util';
import {validateIilabsOwner} from './iilabs-tenant.mjs';
import {serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {latestRelease,updateDecision} from '../latest-release.mjs';
import {validateUpdateTicket,remoteUpdateCommand,validatePriorRecoveryProof,parseSelectedUpdateArguments,validateIdentityPreservation} from './update-policy.mjs';
import {assertCleanCheckout} from './clean-checkout.mjs';
import readline from 'node:readline';
import {runLifecycleWithRecovery,exportRecovery} from './recovery-channel.mjs';
import {saveAndVerifyRecovery} from './local-recovery.mjs';
import {ensureReleasedHostMetrics} from './metrics-service.mjs';
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
 if(process.platform!=='linux'||os.hostname()!=='srv914719'||process.getuid()!==0||root!=='/home/codebiz/devkit/codeship')throw Error('Use the approved selected VPS update entry');
 const stateRoot='/home/codebiz/.deployment/state';
 const target=JSON.parse(fs.readFileSync(stateRoot+'/target.json','utf8'));
 if(target.id!=='hostinger-914719'||target.host!=='69.62.81.166'||target.operator!=='/home/codebiz/.deployment/operators/v-1.0.21/devkit/codeship'||target.publicExposure!==false||target.binding!=='127.0.0.1'||target.dataPolicy!=='fresh'||target.infraNetwork!=='cxapp-network')throw Error('Registered private deployment target differs');
 for(const file of ['data/codeship.sqlite','keys/vault.key'])if(!fs.existsSync(stateRoot+'/'+file))throw Error('Existing private operator state missing; update cannot initialize it');
 const descriptor=deploymentProduct(name,ticket.runtimeMode),action=ticket.action??'update';
 const stateFile=stateRoot+'/'+descriptor.state;
 const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):undefined;
 const installed=installedProduct(name,state);
 if(action==='setup'&&installed)throw Error(name+' is installed; use update.sh; no reset or replacement performed');
 if(action==='update'&&!installed)throw Error(name+' is not installed; use setup.sh separately');
 const actual=installed?cp.execFileSync('docker',['inspect',name,'--format','{{.Image}}'],{encoding:'utf8'}).trim():undefined;
 const current=action==='update'&&!ticket.resumeId&&!ticket.priorRecovery&&updateDecision(installed,ticket.manifest,actual)==='current';

 const expected=JSON.parse(fs.readFileSync(root+'/package.json','utf8')).dependencies;
 for(const dependency of ['kysely','pg','zod','mysql2','bcryptjs']){
  const actualPackage=JSON.parse(fs.readFileSync(target.operator+'/node_modules/'+dependency+'/package.json','utf8'));
  if(actualPackage.version!==expected[dependency])throw Error('Installed operator dependency differs; prepare a released runtime locally');
 }
 linkExisting(root+'/.codeship',stateRoot);
 linkExisting(root+'/node_modules',target.operator+'/node_modules');
 cleanSource(ticket.tooling);
 const env={...process.env,CODESHIP_SQLITE_FILE:stateRoot+'/data/codeship.sqlite',CODESHIP_VAULT_KEY_FILE:stateRoot+'/keys/vault.key',CODESHIP_DEVKIT_SCRIPT_ENTRY:'1',CODESHIP_APP_SCRIPT_ENTRY:'1',CODESHIP_RELEASED_UPDATE_ENTRY:'1',CODESHIP_EXECUTION_MODE:'inventory',CODESHIP_RELEASE_ASSETS_JSON:JSON.stringify({[ticket.manifest.repository+'@'+ticket.manifest.tag]:ticket.archiveUrl}),CODESHIP_KEEP_RELEASE_ARCHIVES:'0',CODESHIP_PLATFORM_IMAGE_ONLY:ticket.imageOnly?'1':'0'};
 await ensureReleasedHostMetrics(root,ticket.tooling);
 if(current){
  const child=cp.fork(descriptor.lifecycle,['verify',name],{cwd:root,env,stdio:['ignore','inherit','inherit','ipc']});const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});if(code!==0)throw Error('Current release readiness failed');console.log(name+': already latest; readiness verified; no replacement/migration');return;
 }
 const approved=stateRoot+'/devkits/approved';fs.mkdirSync(approved,{recursive:true,mode:0o700});
 if(name==='iilabs'&&ticket.runtimeMode==='full-app'&&action==='setup'){
  const file=stateRoot+'/apps/iilabs/private/owner.env';fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const content=serializeDeploymentEnvironment(Object.fromEntries(Object.entries(ticket.iilabsOwner).map(([key,value])=>['IILABS_OWNER_'+key,value])));
  if(fs.existsSync(file)){if(fs.readFileSync(file,'utf8')!==content)throw Error('Existing private owner input differs; preserve and review');}
  else fs.writeFileSync(file,content,{mode:0o600,flag:'wx'});
  env.CODESHIP_IILABS_OWNER_FILE=file;
 }
 const releaseSetFile=path.join(approved,name+'-'+randomUUID()+'.json');
 fs.writeFileSync(releaseSetFile,JSON.stringify({schema:1,source:'github',approvedAt:ticket.approvedAt,services:{[name]:ticket.manifest}}),{mode:0o600,flag:'wx'});
 if(ticket.priorRecovery){
  const proofFile=path.join(approved,'platform-prior-proof-'+randomUUID()+'.json');
  fs.writeFileSync(proofFile,JSON.stringify(ticket.priorRecovery),{mode:0o600,flag:'wx'});
  const child=cp.fork('.container/apps/platform-prior-recovery-runner.ts',[releaseSetFile,proofFile],{cwd:root,env,stdio:['ignore','inherit','inherit','ipc']});
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  if(code!==0)throw Error('Prior Platform runtime recovery stopped; fix locally');
  console.log('platform: prior '+ticket.manifest.version+' availability restored without migration or data restore');return;
 }
 let preserveIdentityFile;
 if(ticket.preserveIdentity){preserveIdentityFile=path.join(approved,'platform-preserve-identity-'+randomUUID()+'.json');fs.writeFileSync(preserveIdentityFile,JSON.stringify(ticket.preserveIdentity),{mode:0o600,flag:'wx'});}
 await runLifecycleWithRecovery({name,ticket,env,root,releaseSetFile,preserveIdentityFile,approve});
 console.log(name+': updated to '+ticket.manifest.version+' using published tooling '+ticket.tooling.version);
}
async function sendUpdate(name,ticket){
 const child=cp.spawn('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','codexsun-hostinger',remoteUpdateCommand(ticket.tooling,name,ticket.action??'update',ticket.runtimeMode)],{stdio:['pipe','pipe','ignore'],windowsHide:true});
 child.stdin.on('error',()=>{});
 child.stdin.write(JSON.stringify(ticket)+'\n');
 const lines=readline.createInterface({input:child.stdout,crlfDelay:Infinity});
 let handling=Promise.resolve();
 lines.on('line',line=>{
  if(!line.startsWith('CODESHIP_RECOVERY:')){console.log(line);return;}
  handling=handling.then(async()=>{
   const request=JSON.parse(line.slice('CODESHIP_RECOVERY:'.length));
   try{console.log(name+': verifying recovery in isolated local Docker');const proof=await saveAndVerifyRecovery(request,ticket.manifest);child.stdin.write(JSON.stringify({id:request.id,...proof})+'\n');}
   catch{child.stdin.write(JSON.stringify({id:request.id,offHostRestoreVerified:false})+'\n');}
  });
 });
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 await handling;lines.close();if(!child.stdin.destroyed)child.stdin.end();if(code!==0)throw Error('VPS update stopped; live data/recovery retained. Correct the blocker locally.');
}
async function main(){
 const [name,...args]=process.argv.slice(2);product(name);
 const {action,releaseTag,resumeId,priorRecoveryFile,preserveIdentityFile,mode,id,runtimeMode,imageOnly}=parseSelectedUpdateArguments(name,args);
 if(mode==='--export-recovery'){await exportRecovery(root,name,id);return;}
 if(mode==='--receive'){
  const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});const iterator=lines[Symbol.asyncIterator]();
  try{const first=await iterator.next();if(first.done||first.value.length>256000)throw Error('Approved update ticket missing');
   const ticket=JSON.parse(first.value);if((ticket.action??'update')!==action||ticket.runtimeMode!==runtimeMode)throw Error('Approved deployment action or runtime mode differs');
   await receiveUpdate(name,ticket,async request=>{
    console.log('CODESHIP_RECOVERY:'+JSON.stringify(request));
    let timer;try{const next=await Promise.race([iterator.next(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Local restore approval timed out')),30*60*1000);})]);if(next.done||next.value.length>8192)throw Error('Local restore approval missing');const proof=JSON.parse(next.value);if(proof.id!==request.id)throw Error('Recovery approval scope differs');return proof;}finally{clearTimeout(timer);}
   });
  }finally{lines.close();process.stdin.pause();}return;
 }
 let priorRecovery;
 if(priorRecoveryFile){const stat=fs.lstatSync(priorRecoveryFile);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>128000)throw Error('Use a bounded regular prior recovery proof file');priorRecovery=validatePriorRecoveryProof(JSON.parse(fs.readFileSync(priorRecoveryFile,'utf8')));}
 let preserveIdentity;
 if(preserveIdentityFile){const stat=fs.lstatSync(preserveIdentityFile);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192)throw Error('Use the bounded historical metadata file');const historicalMetadata=JSON.parse(fs.readFileSync(preserveIdentityFile,'utf8'));preserveIdentity=validateIdentityPreservation({historicalMetadata,historicalMetadataSha256:createHash('sha256').update(JSON.stringify(historicalMetadata)).digest('hex')});}
 const selected=await latestRelease(name,{releaseTag});const tooling=name==='codeship'?selected:await latestRelease('codeship');
 let iilabsOwner;
 if(name==='iilabs'&&runtimeMode==='full-app'&&action==='setup'){
  const file=path.join(root,'.codeship/private/iilabs-owner.env'),stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192)throw Error('Use the protected bounded IILabs owner file');
  const values=parseEnv(fs.readFileSync(file,'utf8'));iilabsOwner=Object.fromEntries(['USERNAME','EMAIL','NAME','PASSWORD'].map(key=>[key,values['IILABS_OWNER_'+key]]));validateIilabsOwner(iilabsOwner);
 }
 const ticket={schema:1,source:'github',selected:name,action,...(imageOnly?{imageOnly:true}:{}),...(runtimeMode?{runtimeMode}:{}),...(iilabsOwner?{iilabsOwner}:{}),...(resumeId?{resumeId}:{}),...(priorRecovery?{priorRecovery}:{}),...(preserveIdentity?{preserveIdentity}:{}),approvedAt:new Date().toISOString(),tooling:{version:tooling.manifest.version,tag:tooling.manifest.tag,commit:tooling.manifest.commit},manifest:selected.manifest,archiveUrl:selected.archiveUrl};
 validateUpdateTicket(ticket,name);cleanSource(ticket.tooling);
 console.log(name+': approved successful stable GitHub release '+selected.manifest.tag);
 if(mode==='--check')return;
 await sendUpdate(name,ticket);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1]))main().catch(error=>{console.log('update: blocked; '+(error instanceof SyntaxError?'invalid approved metadata':error.message));process.exitCode=1;});
