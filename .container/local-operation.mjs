import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {product} from './product.mjs';
import {latestRelease,updateDecision} from './latest-release.mjs';
import {installedProduct} from './product.mjs';
import {assertCleanCheckout} from './hostinger/clean-checkout.mjs';
import {ensureLocalPlatformTransport} from './apps/local-platform-transport.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
async function main(){
 const [action,name,...args]=process.argv.slice(2);const descriptor=product(name);
 if(name==='iilabs')throw Error('The public-only IILabs entry is scoped to Hostinger; preserve the existing local installation.');
 const imageIndex=args.indexOf('--image-only'),imageOnly=imageIndex>=0;if(imageOnly){args.splice(imageIndex,1);if(name!=='platform'||action!=='update'||args.includes('--image-only'))throw Error('Image-only mode is scoped to Platform update');}
 const tagIndex=args.indexOf('--tag'),releaseTag=tagIndex>=0?args[tagIndex+1]:undefined;if(tagIndex>=0){if(!releaseTag)throw Error('Release tag missing');args.splice(tagIndex,2);}
 const resumeIndex=args.indexOf('--resume'),resumeId=resumeIndex>=0?args[resumeIndex+1]:undefined;if(resumeIndex>=0){if(imageOnly||!resumeId||name!=='platform'||action!=='update'||!/^[a-f0-9-]{36}$/.test(resumeId))throw Error('Invalid recorded resume operation');args.splice(resumeIndex,2);}
 if(!['setup','update'].includes(action)||args.some(a=>a!=='--check')||args.length>1)throw Error('Use selected setup/update --target local [--check]');
 if(process.platform!=='win32')throw Error('This registered local target is Windows Docker Desktop');
 const selected=await latestRelease(name,{releaseTag}),tooling=name==='codeship'?selected:await latestRelease('codeship');
 assertCleanCheckout(root,{tag:tooling.manifest.tag,commit:tooling.manifest.commit});
 const state=path.join(root,'.codeship');if(!fs.existsSync(path.join(state,'data/codeship.sqlite'))||!fs.existsSync(path.join(state,'keys/vault.key')))throw Error('Register the existing local operator state first; no implicit data import');
 if(fs.existsSync(path.join(state,'target.json'))){const target=JSON.parse(fs.readFileSync(path.join(state,'target.json'),'utf8'));if(target.id!=='local-docker')throw Error('Local operator target differs');}
 if(!args.includes('--check'))await ensureLocalPlatformTransport(root);
 const installedFile=path.join(state,descriptor.state);const installed=fs.existsSync(installedFile)?installedProduct(name,JSON.parse(fs.readFileSync(installedFile,'utf8'))):undefined;
 if(action==='setup'&&installed)throw Error(name+' is installed; use update.sh; no reset performed');
 if(action==='update'&&!installed)throw Error(name+' is not installed; use setup.sh separately');
 if(action==='update'&&!resumeId){const actual=cp.execFileSync('docker',['inspect',name,'--format','{{.Image}}'],{encoding:'utf8',windowsHide:true}).trim();const decision=updateDecision(installed,selected.manifest,actual);if(decision==='current'&&!args.includes('--check')){const checked=cp.spawnSync(process.execPath,[descriptor.lifecycle,'verify',name],{cwd:root,env:{...process.env,CODESHIP_SQLITE_FILE:path.join(state,'data/codeship.sqlite'),CODESHIP_VAULT_KEY_FILE:path.join(state,'keys/vault.key'),CODESHIP_APP_SCRIPT_ENTRY:'1',CODESHIP_DEVKIT_SCRIPT_ENTRY:'1',CODESHIP_EXECUTION_MODE:'inventory'},stdio:'inherit',windowsHide:true});if(checked.status!==0)throw Error('Current release readiness failed');console.log(name+': already latest; no replacement/migration');return;}}
 console.log(name+': approved '+selected.manifest.tag+' on local Docker');if(args.includes('--check'))return;
 const approved=path.join(state,'releases');fs.mkdirSync(approved,{recursive:true});const file=path.join(approved,name+'-'+randomUUID()+'.json');
 fs.writeFileSync(file,JSON.stringify({schema:1,source:'github',approvedAt:new Date().toISOString(),services:{[name]:selected.manifest}}),{flag:'wx',mode:0o600});
 const env={...process.env,CODESHIP_SQLITE_FILE:path.join(state,'data/codeship.sqlite'),CODESHIP_VAULT_KEY_FILE:path.join(state,'keys/vault.key'),CODESHIP_APP_SCRIPT_ENTRY:'1',CODESHIP_DEVKIT_SCRIPT_ENTRY:'1',CODESHIP_RELEASED_UPDATE_ENTRY:'1',CODESHIP_EXECUTION_MODE:'inventory',CODESHIP_RELEASE_ASSETS_JSON:JSON.stringify({[selected.manifest.repository+'@'+selected.manifest.tag]:selected.archiveUrl}),CODESHIP_KEEP_RELEASE_ARCHIVES:'0',CODESHIP_PLATFORM_IMAGE_ONLY:imageOnly?'1':'0'};
 const child=cp.spawn(process.execPath,[descriptor.lifecycle,action,name,'--release-set',file,...(resumeId?['--resume',resumeId]:[])],{cwd:root,env,stdio:'inherit',windowsHide:true});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});if(code!==0)throw Error('Selected local operation failed; preserve data/recovery and correct scripts locally');
}
main().catch(error=>{console.error('local deployment blocked: '+error.message);process.exitCode=1;});
