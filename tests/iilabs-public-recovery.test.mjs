import test from 'node:test';import assert from 'node:assert/strict';
import {prepareIilabsPublicRecovery,withIilabsFirstReplacement,approvedPublicRuntimeSha256} from '../.container/hostinger/iilabs-public-recovery.mjs';
const imageId='sha256:7d8995feb05c59cc58004ba31b5060b9e062eec996b3116f64142a241fd2f782',attemptId='2026-11-21T05-00-00-000Z';
function fixture(){
 const manifest={version:'0.1.15',commit:'a497cf5c99db53764bbb096d4ed7103e42b5dc3c',imageId};const publicState={...manifest,runtimeMode:'public-site-only',backendConfigured:false};
 const labels={'com.docker.compose.project':'applications','com.docker.compose.service':'iilabs','io.codebiz.runtime-mode':'public-site-only'};
 const container={Name:'/iilabs',Id:'b'.repeat(64),Image:imageId,Config:{Labels:labels},State:{Health:{Status:'healthy'}},HostConfig:{ReadonlyRootfs:true,PortBindings:{'4435/tcp':[{HostIp:'127.0.0.1',HostPort:'14435'}]}}};
 const definition={name:'applications',services:{iilabs:{container_name:'iilabs',image:imageId,read_only:true,cap_drop:['ALL'],security_opt:['no-new-privileges:true'],ports:['127.0.0.1:14435:4435'],command:['node','/run/codeship/start.mjs'],labels:{'io.codebiz.runtime-mode':'public-site-only'},environment:{NODE_ENV:'production',IILABS_PUBLIC_ONLY:'1'},volumes:[{type:'bind',source:'/owned/public/runtime',target:'/run/codeship',read_only:true}]}}};
 return {mode:'setup',priorBackend:undefined,attemptId,manifest,publicState,container,definition,runtimeSha256:approvedPublicRuntimeSha256};
}
test('replace and admission failures restore only the verified public snapshot and still fail',async()=>{
 for(const phase of ['replace','admit']){const f=fixture(),recovery=prepareIilabsPublicRecovery(f),seen=[];const failure=Error('forced '+phase);f.definition.services.iilabs.image='unapproved';
 await assert.rejects(()=>withIilabsFirstReplacement({recovery,replace:async()=>{seen.push('replace');if(phase==='replace')throw failure;},admit:async()=>{seen.push('admit');throw failure;},hasBackendState:()=>false,inspectCurrent:()=>({Id:'d'.repeat(64),Image:imageId,Config:{Labels:{...f.container.Config.Labels,'io.codebiz.runtime-mode':'full-app','io.codebiz.iilabs-transition':attemptId}}}),restore:async definition=>{assert.equal(definition.services.iilabs.image,imageId);seen.push('restore');},verifyRestored:async()=>seen.push('verified')}),error=>error.cause===failure&&error.publicFrontendRestored===true);
 assert.deepEqual(seen,phase==='replace'?['replace','restore','verified']:['replace','admit','restore','verified']);}
});
test('normal backend update and fresh setup cannot arm a public recovery',async()=>{
 for(const recovery of [prepareIilabsPublicRecovery({...fixture(),mode:'update'}),prepareIilabsPublicRecovery({...fixture(),priorBackend:{installed:true}}),prepareIilabsPublicRecovery({...fixture(),publicState:undefined,container:undefined})]){assert.equal(recovery,undefined);let restored=false;await assert.rejects(()=>withIilabsFirstReplacement({recovery,replace:()=>{throw Error('normal failure');},admit:()=>{},restore:()=>{restored=true;}}),/normal failure/);assert.equal(restored,false);}
});
test('unverified state, altered runtime, backend secrets and other images are rejected before replacement',()=>{
 for(const change of [{publicState:{...fixture().publicState,runtimeMode:'full-app'}},{publicState:{...fixture().publicState,backendConfigured:true}},{runtimeSha256:'d'.repeat(64)},{manifest:{...fixture().manifest,imageId:'sha256:'+'d'.repeat(64)}},{definition:{...fixture().definition,services:{iilabs:{...fixture().definition.services.iilabs,env_file:['private.env']}}}}])assert.throws(()=>prepareIilabsPublicRecovery({...fixture(),...change}));
});
test('new backend state or a foreign replacement prevents frontend overwrite',async()=>{
 for(const conflict of ['state','container']){let restored=false;await assert.rejects(()=>withIilabsFirstReplacement({recovery:prepareIilabsPublicRecovery(fixture()),replace:()=>{throw Error('failed');},admit:()=>{},hasBackendState:()=>conflict==='state',inspectCurrent:()=>({Id:'e'.repeat(64),Image:imageId,Config:{Labels:{'io.codebiz.runtime-mode':'full-app'}}}),restore:()=>{restored=true;},verifyRestored:()=>{}}),error=>error instanceof AggregateError&&error.publicFrontendRestored===false);assert.equal(restored,false);}
});
test('successful admission never restores and a recovery capability cannot be forged or replayed',async()=>{
 const recovery=prepareIilabsPublicRecovery(fixture());assert.equal(await withIilabsFirstReplacement({recovery,replace:()=>{},admit:()=>42,restore:()=>assert.fail()}),42);
 for(const handle of [recovery,{}])await assert.rejects(()=>withIilabsFirstReplacement({recovery:handle,replace:()=>assert.fail(),admit:()=>{}}),/invalid or already consumed/);
});
