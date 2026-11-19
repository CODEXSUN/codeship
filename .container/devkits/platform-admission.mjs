import fs from 'node:fs/promises';import {existsSync} from 'node:fs';import path from 'node:path';
export function devkitAdmissionProfile(name,release,settings){
 const prefix=name.toUpperCase(),token=settings[prefix+'_PLATFORM_SERVICE_TOKEN'];
 if(!['codeship','codeitz','uiux'].includes(name)||!/^\d+\.\d+\.\d+$/.test(release.version)||!/^ghcr\.io\/codexsun\/[a-z]+@sha256:[a-f0-9]{64}$/.test(release.releaseImage)||!release.releaseImage.startsWith('ghcr.io/codexsun/'+name+'@')||!/^[a-f0-9]{64}$/.test(token??''))throw Error('Configure the selected devkit Platform credential before updating.');
 const port={codeship:4350,codeitz:4305,uiux:4315}[name];
 return {manifest:{appKey:name,name,permissionKeys:[name+'/workspace:read',name+'/workspace:manage'],environment:'production',internalOrigin:'http://'+name+':'+port,credentialReference:'env:PLATFORM_SERVICE_'+prefix+'_TOKEN',timeoutMs:5000,tenantCorporateId:'codexsun',gatewayEnabled:true,dependencies:[]},token,version:release.version,image:release.releaseImage};
}
export async function admitPlatformDevkit({action,name,release,settings,appRoot,docker}){
 const root=path.join(appRoot,'.codeship/apps/platform'),state=JSON.parse(await fs.readFile(path.join(root,'state.json'),'utf8'));
 const actual=docker(['inspect','platform','--format','{{.Image}}']);if(actual!==docker(['image','inspect',state.image,'--format','{{.Id}}']))throw Error('Platform release identity differs from its verified state.');
 const prefix=name.toUpperCase(),marker=path.join(root,'devkit-permissions-'+name+'.json');
 const approvedSuperAdministrators=action==='complete'&&!existsSync(marker)?JSON.parse(settings[prefix+'_PLATFORM_APPROVED_SA_IDS']??'[]'):[];
 const script=path.join(release.contractRoot,'platform-admission.ts');
 const result=JSON.parse(docker(['exec','-i','--workdir','/opt/codebiz/apps/platform/scripts','platform','node','--input-type=module-typescript','-e',await fs.readFile(script,'utf8')],JSON.stringify({action,profile:devkitAdmissionProfile(name,release,settings),approvedSuperAdministrators})));
 if(action==='prepare'){
  if(settings[prefix+'_PLATFORM_SERVICE_ID']&&settings[prefix+'_PLATFORM_SERVICE_ID']!==result.serviceId||settings[prefix+'_PLATFORM_TENANT_ID']&&settings[prefix+'_PLATFORM_TENANT_ID']!==result.tenantId)throw Error('Saved devkit Platform binding changed.');
  settings[prefix+'_PLATFORM_SERVICE_ID']=result.serviceId;settings[prefix+'_PLATFORM_TENANT_ID']=result.tenantId;
 }
 if(action==='complete'&&approvedSuperAdministrators.length)await fs.writeFile(marker,JSON.stringify({approvedSuperAdministrators,granted:result.grantedExistingSuperAdministrators,at:new Date().toISOString()},null,2),{mode:0o600,flag:'wx'});
 return {appKey:name,action,...result};
}
