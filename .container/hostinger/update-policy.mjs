import {createHash} from 'node:crypto';
import {parseHistoricalIdentityMetadata} from '../apps/platform-retirement-preflight.mjs';
import {platformRetirementImage} from './platform-retirement-recovery.mjs';
import {product,deploymentProduct} from '../product.mjs';
import {validateIilabsOwner} from './iilabs-tenant.mjs';
import {validateManifest} from '../release-policy.mjs';
import {validReleaseAssetUrl} from '../latest-release.mjs';
export function validateIdentityPreservation(value){
 if(!value||Object.keys(value).some(key=>!['historicalMetadata','historicalMetadataSha256'].includes(key)))throw Error('Invalid identity preservation envelope');
 parseHistoricalIdentityMetadata(value.historicalMetadata);
 if(!/^[a-f0-9]{64}$/.test(value.historicalMetadataSha256??'')||createHash('sha256').update(JSON.stringify(value.historicalMetadata)).digest('hex')!==value.historicalMetadataSha256)throw Error('Historical identity metadata provenance differs');
 return value;
}
export function validatePriorRecoveryProof(proof){
 const sha=/^[a-f0-9]{64}$/;
 if(!proof||proof.schema!==1||Object.keys(proof).some(key=>!['schema','failedRun','baseline'].includes(key))||!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(proof.failedRun??'')||!Array.isArray(proof.baseline)||proof.baseline.length<2||proof.baseline.length>100)throw Error('Invalid prior recovery proof');
 if(proof.baseline.filter(row=>row.scope==='master').length!==1||new Set(proof.baseline.map(row=>row.scope)).size!==proof.baseline.length||new Set(proof.baseline.map(row=>row.database)).size!==proof.baseline.length)throw Error('Prior recovery scopes overlap');
 for(const row of proof.baseline){
  if(Object.keys(row).some(key=>!['scope','database','backupSha256','schemaSha256','dataSha256','legacyIdentitySha256','offHostRestoreVerified'].includes(key))||row.scope!=='master'&&!/^tenant:[a-z0-9]{8}$/.test(row.scope??'')||!/^[_a-z][_a-z0-9]{0,62}$/.test(row.database??'')||row.offHostRestoreVerified!==true||['backupSha256','schemaSha256','dataSha256','legacyIdentitySha256'].some(key=>!sha.test(row[key]??'')))throw Error('Invalid scoped prior recovery proof');
 }
 return proof;
}
export function parseSelectedUpdateArguments(name,args){
 product(name);const flags=[...args];const take=flag=>{const index=flags.indexOf(flag);if(index<0)return undefined;const value=flags[index+1];if(!value||value.startsWith('--')||flags.indexOf(flag,index+1)>=0)throw Error('Invalid '+flag+' option');flags.splice(index,2);return value;};
 const setup=flags.includes('--setup');if(setup){flags.splice(flags.indexOf('--setup'),1);if(flags.includes('--setup'))throw Error('Duplicate setup option');}
 const backend=flags.includes('--backend');if(backend){flags.splice(flags.indexOf('--backend'),1);if(name!=='iilabs'||flags.includes('--backend'))throw Error('Select IILabs backend explicitly once');}
 const imageOnly=flags.includes('--image-only');if(imageOnly){flags.splice(flags.indexOf('--image-only'),1);if(name!=='platform'||setup||flags.includes('--image-only'))throw Error('Image-only mode is scoped to an existing Platform update');}
 const action=setup?'setup':'update',releaseTag=take('--tag'),resumeId=take('--resume'),priorRecoveryFile=take('--recover-prior'),preserveIdentityFile=take('--preserve-identity');
 if(preserveIdentityFile&&(name!=='platform'||action!=='update'||resumeId||priorRecoveryFile))throw Error('Identity preservation is only a Platform update without resume or prior recovery');
 if(priorRecoveryFile&&(name!=='platform'||action!=='update'||resumeId||!releaseTag))throw Error('Prior recovery requires Platform update with its explicit prior --tag and no resume');
 const [mode,id]=flags;
 if((releaseTag||priorRecoveryFile||preserveIdentityFile)&&['--receive','--export-recovery'].includes(mode))throw Error('Remote action uses the approved ticket release');
 if(mode&&!['--receive','--check','--export-recovery'].includes(mode)||flags.length>(mode==='--export-recovery'?2:1))throw Error('Use selected setup.sh/update.sh [--check]');
 return {action,releaseTag,resumeId,priorRecoveryFile,mode,id,...(preserveIdentityFile?{preserveIdentityFile}:{}),...(backend?{runtimeMode:'full-app'}:{}),...(imageOnly?{imageOnly:true}:{})};
}
export function validateUpdateTicket(ticket,name){
 const descriptor=deploymentProduct(name,ticket.runtimeMode);
 if(ticket.imageOnly!==undefined&&(ticket.imageOnly!==true||name!=='platform'||(ticket.action??'update')!=='update'||ticket.resumeId||ticket.preserveIdentity||ticket.priorRecovery))throw Error('Image-only mode requires an ordinary Platform update');
 if(ticket.iilabsOwner!==undefined){if(name!=='iilabs'||ticket.runtimeMode!=='full-app'||ticket.action!=='setup')throw Error('Owner input is restricted to first IILabs backend setup');validateIilabsOwner(ticket.iilabsOwner);}
 if(name==='iilabs'&&ticket.runtimeMode==='full-app'&&ticket.action==='setup'&&!ticket.iilabsOwner)throw Error('Private first-owner configuration required');
 if(ticket.preserveIdentity!==undefined){if((ticket.action??'update')!=='update'||name!=='platform'||ticket.resumeId!==undefined||ticket.priorRecovery!==undefined)throw Error('Identity preservation is restricted to a Platform update');validateIdentityPreservation(ticket.preserveIdentity);if(ticket.manifest?.version!=='1.0.16'||ticket.manifest.imageId!==platformRetirementImage)throw Error('Identity preservation requires the verified Platform16 release');}
 if(ticket.priorRecovery!==undefined){if((ticket.action??'update')!=='update'||name!=='platform'||ticket.resumeId!==undefined)throw Error('Prior recovery is restricted to an explicit Platform update');validatePriorRecoveryProof(ticket.priorRecovery);}
 if(ticket.resumeId!==undefined){
  const platform=name==='platform'&&(ticket.action??'update')==='update'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(ticket.resumeId);
  const iilabs=name==='iilabs'&&ticket.runtimeMode==='full-app'&&ticket.action==='setup'&&/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(ticket.resumeId);
  if(!platform&&!iilabs)throw Error('Invalid recorded resume operation');
 }
 if(!['setup','update'].includes(ticket.action??'update'))throw Error('Invalid deployment action');
 if(ticket.schema!==1||ticket.selected!==name||ticket.source!=='github'||!/^\d+\.\d+\.\d+$/.test(ticket.tooling?.version)||ticket.tooling.tag!=='v-'+ticket.tooling.version||!/^[a-f0-9]{40}$/.test(ticket.tooling.commit??''))throw Error('Invalid approved update ticket');
 const age=Date.now()-Date.parse(ticket.approvedAt);if(!Number.isFinite(age)||age< -30000||age>30*60*1000)throw Error('Update approval expired; resolve GitHub again locally');
 const m=ticket.manifest;if(!/^[a-f0-9]{40}$/.test(m?.commit??''))throw Error('Invalid application source commit');validateManifest(m,{owner:descriptor.owner,repository:'CODEXSUN/'+name,tag:m.tag,commit:m.commit});
 if(!/^sha256:[a-f0-9]{64}$/.test(m.imageId??'')||m.archive?.name!=='image.tar.gz'||!/^[a-f0-9]{64}$/.test(m.archive?.sha256??'')||!validReleaseAssetUrl(ticket.archiveUrl))throw Error('Invalid approved image archive');
 return ticket;
}
export function remoteUpdateCommand(tooling,name,action='update',runtimeMode){
 deploymentProduct(name,runtimeMode);
 if(!['setup','update'].includes(action)||!/^v-\d+\.\d+\.\d+$/.test(tooling.tag)||!/^[a-f0-9]{40}$/.test(tooling.commit))throw Error('Invalid deployment source');
 const script=['set -eu','export GIT_TERMINAL_PROMPT=0','cd /home/codebiz/devkit/codeship',
  '[ "$(git remote get-url origin)" = https://github.com/CODEXSUN/codeship.git ]',
  '[ -z "$(git status --porcelain)" ]',
  'git fetch --quiet origin refs/tags/'+tooling.tag+':refs/tags/'+tooling.tag,
  '[ "$(git rev-parse '+tooling.tag+'^{commit})" = '+tooling.commit+' ]',
  '[ -z "$(git ls-tree --name-only '+tooling.tag+' -- .codeship node_modules .env)" ]',
  'git checkout --quiet --detach '+tooling.tag,
  'exec sh .container/hostinger/'+action+'.sh '+name+(runtimeMode==='full-app'?' --backend':'')+' --receive'].join('\n');
 return "sh -c '"+script.replaceAll("'","'\"'\"'")+"'";
}
