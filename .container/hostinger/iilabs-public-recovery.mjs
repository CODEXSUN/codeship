import {iilabsPublicTransition} from './iilabs-policy.mjs';

const image15='sha256:7d8995feb05c59cc58004ba31b5060b9e062eec996b3116f64142a241fd2f782';
export const approvedPublicRuntimeSha256='c42ef4399d8f1fb80ae17751b431d5774ab3c715cf921c118e19eb1180b5ae3d';
const capabilities=new WeakMap();
const copy=value=>JSON.parse(JSON.stringify(value));

/** Only a verified first public-to-full adoption may arm stateless recovery. */
export function prepareIilabsPublicRecovery({mode,priorBackend,attemptId,manifest,publicState,container,definition,runtimeSha256}) {
  if(mode!=='setup'||priorBackend)return undefined;
  const transition=iilabsPublicTransition({publicState,container,manifest});
  if(!transition.retainPublicRecovery)return undefined;
  if(manifest.version!=='0.1.15'||manifest.commit!=='a497cf5c99db53764bbb096d4ed7103e42b5dc3c'||manifest.imageId!==image15||publicState.backendConfigured!==false||container.Name!=='/iilabs'||!/^[a-f0-9]{64}$/.test(container.Id??'')||!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(attemptId??'')||runtimeSha256!==approvedPublicRuntimeSha256)throw Error('Approved public recovery identity/runtime differs.');
  const service=definition?.services?.iilabs;
  const serviceKeys=['image','container_name','init','restart','read_only','cap_drop','security_opt','environment','labels','ports','command','volumes','healthcheck'];
  if(!service||Object.keys(definition).some(key=>!['name','services'].includes(key))||Object.keys(service).some(key=>!serviceKeys.includes(key)))throw Error('Public recovery contains an unapproved Compose setting.');
  if(definition.name!=='applications'||Object.keys(definition.services).length!==1||service.container_name!=='iilabs'||![image15,'ghcr.io/codexsun/iilabs@'+image15].includes(service.image)||service.read_only!==true||service.user!==undefined||service.entrypoint!==undefined||service.privileged||service.cap_add?.length||!service.cap_drop?.includes('ALL')||!service.security_opt?.includes('no-new-privileges:true')||service.env_file||service.secrets||service.devices||service.network_mode||service.networks||Object.keys(definition.networks??{}).length||JSON.stringify(service.ports)!==JSON.stringify(['127.0.0.1:14435:4435'])||JSON.stringify(service.command)!==JSON.stringify(['node','/run/codeship/start.mjs'])||service.labels?.['io.codebiz.runtime-mode']!=='public-site-only'||service.environment?.NODE_ENV!=='production'||service.environment?.IILABS_PUBLIC_ONLY!=='1'||Object.keys(service.environment).some(key=>!['NODE_ENV','IILABS_PUBLIC_ONLY'].includes(key))||service.volumes?.length!==1||service.volumes[0].type!=='bind'||service.volumes[0].target!=='/run/codeship'||service.volumes[0].read_only!==true||typeof service.volumes[0].source!=='string')throw Error('Recovery must retain only the approved stateless frontend Compose definition.');
  const capability=Object.freeze({});
  const retained=copy(definition);retained.services.iilabs.image=image15;
  capabilities.set(capability,{definition:retained,imageId:image15,publicContainerId:container.Id,attemptId,runtimeSha256,consumed:false});
  return capability;
}

/** No database callbacks, rollback, deletion or normal backend-update recovery. */
export async function withIilabsFirstReplacement({recovery,replace,admit,hasBackendState,inspectCurrent,restore,verifyRestored}) {
  const snapshot=recovery?capabilities.get(recovery):undefined;
  if(recovery&&(!snapshot||snapshot.consumed))throw Error('Public recovery capability is invalid or already consumed.');
  if(snapshot)snapshot.consumed=true;
  try{await replace();return await admit();}
  catch(cause){
    if(!snapshot)throw cause;
    try{
      if(typeof hasBackendState!=='function'||await hasBackendState())throw Error('A backend installation exists; public recovery is not allowed.');
      const current=await inspectCurrent();
      if(current&&current.Id!==snapshot.publicContainerId){
        const labels=current.Config?.Labels;
        if(current.Image!==snapshot.imageId||labels?.['com.docker.compose.project']!=='applications'||labels?.['com.docker.compose.service']!=='iilabs'||labels?.['io.codebiz.runtime-mode']!=='full-app'||labels?.['io.codebiz.iilabs-transition']!==snapshot.attemptId)throw Error('Current container is not this failed first replacement; preserve it.');
      }
      // The caller mounts its retained, hash-checked runtime snapshot. No secrets are restored.
      await restore(copy(snapshot.definition),{imageId:snapshot.imageId,runtimeSha256:snapshot.runtimeSha256});
      await verifyRestored({imageId:snapshot.imageId});
    }catch(recoveryError){
      const error=new AggregateError([cause,recoveryError],'First backend replacement failed; public recovery could not be confirmed. Retain all data and recovery.');error.publicFrontendRestored=false;throw error;
    }
    const error=new Error('First backend replacement failed; verified public frontend restored. Backend data and ownership journal retained.',{cause});error.publicFrontendRestored=true;throw error;
  }
}
