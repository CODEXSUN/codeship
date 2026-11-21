import {randomBytes} from 'node:crypto';

/** Never restore single-tenant mode after a second tenant mutation may have begun. */
export async function withPlatformAvailability({backup,mutate,activate,restore}) {
  let started=false;
  try{await backup();started=true;const result=await mutate();await activate();return result;}
  catch(error){await(started?activate():restore());throw error;}
}

/** Adopt only the already approved stateless IILabs frontend, never an arbitrary container. */
export function iilabsPublicTransition({publicState,container,manifest}) {
  if(!publicState&&!container)return {mode:'fresh',retainPublicRecovery:false};
  const bindings=container?.HostConfig?.PortBindings;
  if(!publicState||!container||publicState.runtimeMode!=='public-site-only'||publicState.backendConfigured!==false||publicState.imageId!==manifest.imageId||publicState.commit!==manifest.commit||publicState.version!==manifest.version||container.Image!==manifest.imageId||container.Config?.Labels?.['io.codebiz.runtime-mode']!=='public-site-only'||container.Config?.Labels?.['com.docker.compose.project']!=='applications'||container.Config?.Labels?.['com.docker.compose.service']!=='iilabs'||container.State?.Health?.Status!=='healthy'||container.HostConfig?.ReadonlyRootfs!==true||Object.keys(bindings??{}).length!==1||bindings['4435/tcp']?.length!==1||bindings['4435/tcp'][0].HostIp!=='127.0.0.1'||bindings['4435/tcp'][0].HostPort!=='14435')throw Error('Existing IILabs public container/state is not the approved transition source.');
  return {mode:'public-to-full',retainPublicRecovery:true};
}

export function requireIilabsTarget({platform,hostname,uid,root,target,entry}) {
  if(platform!=='linux'||hostname!=='srv914719'||uid!==0||root!=='/home/codebiz/devkit/codeship'||entry!=='1'||target?.id!=='hostinger-914719'||target.host!=='69.62.81.166'||target.binding!=='127.0.0.1'||target.dataPolicy!=='fresh'||target.infraNetwork!=='cxapp-network')throw Error('Use the released selected IILabs VPS entry.');
}
export function newIilabsEnvironment() {
  const url=(role,database)=>{const value=new URL('postgresql://postgres:5432/'+database);value.username=role;value.password=randomBytes(32).toString('hex');return value.href;};
  return {NODE_ENV:'production',CODESHIP_CONTAINER_MODE:'1',CODESHIP_APP_NAME:'iilabs',IILABS_HOST:'127.0.0.1',IILABS_PORT:'4435',IILABS_WEB_PORT:'14435',IILABS_PLATFORM_AUTH:'1',IILABS_PLATFORM_ORIGIN:'http://127.0.0.1:4385',IILABS_BROWSER_ORIGINS:JSON.stringify(['https://iilabs.in','http://127.0.0.1:14435']),IILABS_PLATFORM_SERVICE_TOKEN:randomBytes(32).toString('hex'),IILABS_VAULT_KEY:randomBytes(32).toString('hex'),IILABS_DATABASE_URL:url('app_iilabs_runtime','app_iilabs'),IILABS_MIGRATION_DATABASE_URL:url('app_iilabs_migrator','app_iilabs'),IILABS_DEMO_MODE:'0',IILABS_SYNC_ENABLED:'0'};
}
export function iilabsServiceProfile(service,environment,manifest) {
  if(service.appKey!=='iilabs'||!Array.isArray(service.permissionKeys)||!service.permissionKeys.includes('iilabs/agency:manage')||!service.permissionKeys.includes('iilabs/workspace:read')||!/^sha256:[a-f0-9]{64}$/.test(manifest.imageId)||!/^ghcr.io\/codexsun\/iilabs@sha256:[a-f0-9]{64}$/.test(manifest.image))throw Error('IILabs release/service identity differs.');
  return {manifest:{...service,environment:'production',internalOrigin:'http://127.0.0.1:4435',gatewayEnabled:true,tenantCorporateId:'iilabs'},token:environment.IILABS_PLATFORM_SERVICE_TOKEN,version:manifest.version,image:manifest.image};
}
export function iilabsRuntimeEnvironment(environment) {
  const allowed=['NODE_ENV','CODESHIP_CONTAINER_MODE','CODESHIP_APP_NAME','IILABS_HOST','IILABS_PORT','IILABS_WEB_PORT','IILABS_PLATFORM_AUTH','IILABS_PLATFORM_ORIGIN','IILABS_BROWSER_ORIGINS','IILABS_PLATFORM_SERVICE_ID','IILABS_PLATFORM_TENANT_ID','IILABS_PLATFORM_SERVICE_TOKEN','IILABS_VAULT_KEY','IILABS_DATABASE_URL','IILABS_DEMO_MODE','IILABS_SYNC_ENABLED'];
  if(!/^[a-z0-9]{8}$/.test(environment.IILABS_PLATFORM_SERVICE_ID??'')||!/^[a-z0-9]{8}$/.test(environment.IILABS_PLATFORM_TENANT_ID??'')||environment.IILABS_DEMO_MODE!=='0'||environment.IILABS_SYNC_ENABLED!=='0')throw Error('Real Platform binding and disabled demo/worker required.');
  return Object.fromEntries(allowed.map(key=>{if(typeof environment[key]!=='string')throw Error('Missing private IILabs runtime setting.');return [key,environment[key]];}));
}
