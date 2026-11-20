import {readFile,writeFile,mkdir,rename,unlink,lstat} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {migrationDecision} from '../policy.mjs';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const fingerprint=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
async function fileHash(file,optional=false){try{return createHash('sha256').update(await readFile(file)).digest('hex');}catch(error){if(optional&&error.code==='ENOENT')return null;throw error;}}
async function bindings({stateFile,envFile,composeFile,markerFile}){return {priorState:await fileHash(stateFile,true),environment:await fileHash(envFile),compose:await fileHash(composeFile),ownership:await fileHash(markerFile)};}
function candidateIdentity(record,manifest){
 const candidate=record.candidateState;
 if(record.candidateStateSha256!==fingerprint(candidate))throw Error('Platform recorded candidate state changed');
 if(!candidate||candidate.owner!=='apps/platform'||candidate.repository!=='CODEXSUN/platform'||candidate.version!==manifest.version||candidate.tag!==manifest.tag||candidate.commit!==manifest.commit||candidate.imageId!==manifest.imageId||candidate.releaseImage!==manifest.image||![manifest.image,manifest.imageId].includes(candidate.image))throw Error('Platform recorded candidate differs from the approved release');
 if(!/^sha256:[a-f0-9]{64}$/.test(candidate.imageId??''))throw Error('Platform recorded image identity is invalid');
}
async function readRecord(directory,id){
 if(!uuid.test(id??''))throw Error('Use the exact Platform resume operation ID');
 const file=path.join(directory,id+'.json');if((await lstat(file)).isSymbolicLink())throw Error('Platform attempt record must not be a symbolic link');
 const record=JSON.parse(await readFile(file,'utf8'));
 if(record.schema!==1||record.id!==id||record.product!=='platform'||!['setup','update'].includes(record.action))throw Error('Invalid Platform release attempt');
 return record;
}
async function replaceRecord(directory,record){
 const file=path.join(directory,record.id+'.json'),temporary=file+'.next-'+randomUUID();
 try{await writeFile(temporary,JSON.stringify(record,null,2)+'\n',{mode:0o600,flag:'wx'});await rename(temporary,file);}finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}

export async function preparePlatformReleaseAttempt(options){
 const {directory,action,approvedManifest,candidateState}=options;
 if(!['setup','update'].includes(action))throw Error('Invalid Platform attempt action');
 const inputs=await bindings(options);if(action==='update'&&!inputs.priorState)throw Error('Platform update requires its existing successful state');
 const record={schema:1,id:randomUUID(),product:'platform',action,phase:'prepared',createdAt:new Date().toISOString(),manifestSha256:fingerprint(approvedManifest),candidateStateSha256:fingerprint(candidateState),inputs,candidateState};
 candidateIdentity(record,approvedManifest);
 await mkdir(directory,{recursive:true,mode:0o700});await writeFile(path.join(directory,record.id+'.json'),JSON.stringify(record,null,2)+'\n',{mode:0o600,flag:'wx'});
 return record;
}
export async function markPlatformAttemptReplaced(directory,id){
 const record=await readRecord(directory,id);if(record.phase!=='prepared')throw Error('Platform replacement phase differs');
 record.phase='replaced';record.replacedAt=new Date().toISOString();await replaceRecord(directory,record);return record;
}
export async function validatePlatformResume(options){
 const record=await readRecord(options.directory,options.resumeId);
 if(record.action!=='update'||record.phase!=='replaced'||!record.replacedAt)throw Error('Platform resume requires a recorded pending replacement');
 if(record.manifestSha256!==fingerprint(options.approvedManifest))throw Error('Platform resume release differs from the recorded operation');
 candidateIdentity(record,options.approvedManifest);
 if(options.actualImageId!==record.candidateState.imageId)throw Error('Platform running image differs from the recorded replacement');
 const current=await bindings(options);
 if(!record.inputs?.priorState||Object.entries(current).some(([key,value])=>value!==record.inputs[key]))throw Error('Platform prior state, configuration or ownership changed since replacement');
 return record;
}
export function validatePlatformResumeMigrations(plans,previous,manifest){
 if(!Array.isArray(plans)||!plans.length||plans.filter(plan=>plan.scope==='master').length!==1||new Set(plans.map(plan=>plan.scope)).size!==plans.length)throw Error('Platform resume migration scopes are missing or ambiguous');
 const current={};for(const [file,hash]of Object.entries(manifest.migrations)){const key=(file.includes('/tenant-migrations/')?'tenant:':'master:')+path.basename(file,'.ts');if(Object.hasOwn(current,key))throw Error('Platform resume migration names overlap');current[key]=hash;}
 for(const plan of plans){
  if(typeof plan.scope!=='string'||plan.scope!=='master'&&!/^tenant:.+$/.test(plan.scope)||!Array.isArray(plan.applied)||!Array.isArray(plan.pending)||[...plan.applied,...plan.pending].some(name=>typeof name!=='string'))throw Error('Platform resume migration plan is invalid');
  const prefix=plan.scope==='master'?'master:':'tenant:',names=[...plan.applied,...plan.pending].map(name=>prefix+name),expected=Object.keys(current).filter(name=>name.startsWith(prefix));
  if(new Set(names).size!==names.length||fingerprint([...names].sort())!==fingerprint(expected.sort()))throw Error('Platform resume migration plan differs from the approved manifest');
  const decision=migrationDecision({applied:plan.applied.map(name=>prefix+name),pending:plan.pending.map(name=>prefix+name)},previous,current);
  if(decision.migrateRequired)throw Error('Platform resume cannot run pending migrations');
 }
}
export async function completePlatformReleaseAttempt(directory,id){
 const record=await readRecord(directory,id);if(record.phase!=='replaced')throw Error('Platform completion phase differs');
 record.phase='completed';record.completedAt=new Date().toISOString();await replaceRecord(directory,record);return record;
}
