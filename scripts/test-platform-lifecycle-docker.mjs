// Actual setup/update integration on an isolated nested Docker engine.
// Never mounts the host Docker socket, keys, databases or developer environment.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import cp from 'node:child_process';
import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';import {pipeline} from 'node:stream/promises';
import {createRequire} from 'node:module';
import readline from 'node:readline';
import {validateManifest} from '../.container/release-policy.mjs';
import {verifyLocalRecovery} from '../.container/hostinger/local-recovery.mjs';
const root=fs.realpathSync(new URL('../',import.meta.url));
const argv=process.argv.slice(2),readOption=name=>argv[argv.indexOf(name)+1];
if(!argv.includes('--release-set')||!argv.includes('--codeship-image')||argv.some((arg,i)=>i%2===0&&!['--release-set','--update-release-set','--migration-release-set','--storage-driver','--codeship-image'].includes(arg))||![4,6,8,10].includes(argv.length))throw Error('Use --release-set <approved-platform.json> [--update-release-set <approved-next-platform.json>] [--migration-release-set <approved-migration-platform.json>] [--storage-driver containerd|vfs|overlay2] --codeship-image <loaded-immutable-image-id>');
const storageDriver=argv.includes('--storage-driver')?readOption('--storage-driver'):'containerd';if(!['containerd','vfs','overlay2'].includes(storageDriver))throw Error('Use containerd, vfs or overlay2 only for the disposable nested engine');
const set=JSON.parse(fs.readFileSync(path.resolve(readOption('--release-set')),'utf8')),manifest=set.services?.platform;
if(set.schema!==1||set.source!=='github'||!manifest)throw Error('Explicit approved Platform release required');
validateManifest(manifest,{owner:'apps/platform',repository:'CODEXSUN/platform',tag:manifest.tag,commit:manifest.commit});
const updateSet=argv.includes('--update-release-set')?JSON.parse(fs.readFileSync(path.resolve(readOption('--update-release-set')),'utf8')):set,updateManifest=updateSet.services?.platform;
if(updateSet.schema!==1||updateSet.source!=='github'||!updateManifest)throw Error('Explicit approved update release required');validateManifest(updateManifest,{owner:'apps/platform',repository:'CODEXSUN/platform',tag:updateManifest.tag,commit:updateManifest.commit});
const migrationSet=argv.includes('--migration-release-set')?JSON.parse(fs.readFileSync(path.resolve(readOption('--migration-release-set')),'utf8')):null,migrationManifest=migrationSet?.services?.platform;
if(migrationSet){if(migrationSet.schema!==1||migrationSet.source!=='github'||!migrationManifest)throw Error('Explicit approved migration release required');validateManifest(migrationManifest,{owner:'apps/platform',repository:'CODEXSUN/platform',tag:migrationManifest.tag,commit:migrationManifest.commit});}
const operatorImage=readOption('--codeship-image');if(!/^sha256:[a-f0-9]{64}$/.test(operatorImage))throw Error('Use an already loaded immutable CodeShip operator image');
const run='platform-lifecycle-'+randomUUID().slice(0,8),engine=run+'-engine',volume=run+'-data';
const evidence=fs.mkdtempSync(path.join(os.tmpdir(),run+'-')),runtime=path.join(evidence,'runtime'),context=path.join(evidence,'context');
const image='codeship-platform-dind-test:20261120',receipt={run,evidence,platformVersion:manifest.version,updateVersion:updateManifest.version,storageDriver,checks:{},source:'local-dind-only'};
const host=(args,input)=>cp.execFileSync('docker',args,{input,windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:32*1024*1024,timeout:900000});
const text=args=>host(args).toString().trim();
const nested=(args,input)=>host(['exec','-i',engine,...args],input);
const nestedText=args=>nested(args).toString().trim();
const program=(code,input)=>nested(['node','--input-type=module','-e',code],input);
const snapshot=()=>JSON.stringify(text(['ps','-a','--no-trunc','--format','{{.ID}} {{.Names}} {{.Image}} {{.State}}']).split('\n').filter(Boolean).sort());
const before=snapshot();let engineCreated=false,volumeCreated=false;
async function load(id){
 const save=cp.spawn('docker',['save',id],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 const load=cp.spawn('docker',['exec','-i',engine,'docker','load'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
 let saveError='',loadError='';save.stderr.on('data',b=>saveError+=b);load.stderr.on('data',b=>loadError+=b);load.stdout.resume();
 const completed=child=>new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('Image transfer failed: '+(child===save?saveError:loadError))));});
 const timer=setTimeout(()=>{save.kill();load.kill();},15*60*1000);try{await Promise.all([pipeline(save.stdout,load.stdin),completed(save),completed(load)]);}finally{clearTimeout(timer);}
 if(id.startsWith('sha256:'))assert.equal(nestedText(['docker','image','inspect',id,'--format','{{.Id}}']),id,'Nested image store must preserve the approved release image identity');
 console.log('Loaded isolated image '+id);
}
async function runWithIndependentRecovery(approved){
 const child=cp.spawn('docker',['exec','-i',engine,'env','CODESHIP_DISPOSABLE_PLATFORM_TEST=1','CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN='+run,'node','.container/tests/platform-recovery-runner.mjs','update',approved],{stdio:['pipe','pipe','pipe'],windowsHide:true});
 child.stdin.on('error',()=>{});let errorOutput='',work=Promise.resolve();const output=[];
 child.stderr.on('data',b=>{errorOutput=(errorOutput+b).slice(-8192);});
 const lines=readline.createInterface({input:child.stdout,crlfDelay:Infinity});
 lines.on('line',line=>{
  if(!line.startsWith('CODESHIP_TEST_RECOVERY:')){output.push(line);return;}
  work=work.then(async()=>{
   const request=JSON.parse(line.slice('CODESHIP_TEST_RECOVERY:'.length));
   try{
    if(request.service!=='platform'||request.kind!=='postgresql'||!/^[a-f0-9-]{36}$/.test(request.exportId)||!/^[a-f0-9]{64}$/.test(request.sha256))throw Error('Unexpected fixture recovery scope');
    const code=`import fs from 'node:fs';import {createHash} from 'node:crypto';const record=JSON.parse(fs.readFileSync('/home/codebiz/.deployment/state/devkits/recovery-exports/'+${JSON.stringify(request.exportId)}+'.json'));const r=record.recovery;if(record.service!=='platform'||record.expiresAt<Date.now()||r.kind!=='postgresql'||r.sha256!==${JSON.stringify(request.sha256)}||!fs.realpathSync(r.file).startsWith('/home/codebiz/.deployment/state/apps/platform/private/'))throw Error('Fixture export scope differs');const b=fs.readFileSync(r.file);if(createHash('sha256').update(b).digest('hex')!==r.sha256)throw Error('Fixture snapshot changed');process.stdout.write(b);`;
    const bytes=program(code);assert.equal(createHash('sha256').update(bytes).digest('hex'),request.sha256);
    const directory=path.join(evidence,'independent-recovery');fs.mkdirSync(directory,{recursive:true,mode:0o700});const file=path.join(directory,request.exportId+'.dump');fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
    const proof=await verifyLocalRecovery(file,'postgresql');if(proof.offHostRestoreVerified!==true)throw Error('Independent Docker restore did not pass');
    (receipt.independentRecovery??=[]).push({sha256:request.sha256,exportId:request.exportId,kind:request.kind,verifiedInOuterDocker:true,imageId:proof.imageId});
    child.stdin.write(JSON.stringify({id:request.id,sha256:request.sha256,offHostRestoreVerified:true,reference:'disposable-local/'+request.exportId})+'\n');
   }catch(error){(receipt.recoveryFailures??=[]).push(error.message);child.stdin.write(JSON.stringify({id:request.id,offHostRestoreVerified:false})+'\n');}
  });
 });
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});await work;lines.close();if(!child.stdin.destroyed)child.stdin.end();fs.writeFileSync(path.join(evidence,'migration-update.log'),output.join('\n')+'\n');
 if(code!==0)throw Error('Actual pending-migration update failed: '+errorOutput);
}
function materializeRuntime(){
 fs.mkdirSync(runtime);for(const name of ['src','scripts','contracts','.container'])fs.cpSync(path.join(root,name),path.join(runtime,name),{recursive:true,dereference:true,filter:source=>!source.endsWith('.log')});
 fs.copyFileSync(path.join(root,'package.json'),path.join(runtime,'package.json'));
 const copied=new Map();function dependency(name,from=path.join(root,'package.json')){
  let source=path.dirname(createRequire(from).resolve(name));while(!fs.existsSync(path.join(source,'package.json'))||JSON.parse(fs.readFileSync(path.join(source,'package.json'))).name!==name){const parent=path.dirname(source);if(parent===source)throw Error('Installed test dependency missing: '+name);source=parent;}
  const metadata=JSON.parse(fs.readFileSync(path.join(source,'package.json')));if(copied.has(name)){if(copied.get(name)!==metadata.version)throw Error('Test runtime has multiple versions of '+name+'; preserve nested installation explicitly');return;}copied.set(name,metadata.version);
  fs.cpSync(source,path.join(runtime,'node_modules',name),{recursive:true,dereference:true});
  const pkg=JSON.parse(fs.readFileSync(path.join(source,'package.json')));for(const child of Object.keys(pkg.dependencies??{}))dependency(child,path.join(source,'package.json'));
 }
 for(const name of ['kysely','pg','zod','mysql2','bcryptjs'])dependency(name);
}
try{
 for(const id of [manifest.imageId,updateManifest.imageId,migrationManifest?.imageId,operatorImage,'postgres:18.7-alpine'].filter(Boolean))host(['image','inspect',id]);
 for(const selected of [manifest,updateManifest,migrationManifest].filter(Boolean)){const facts=JSON.parse(text(['image','inspect',selected.imageId]))[0];assert.equal(facts.Config.Labels['org.opencontainers.image.version'],selected.version);assert.equal(facts.Config.Labels['org.opencontainers.image.revision'],selected.commit);}
 materializeRuntime();receipt.sourceHashes=Object.fromEntries(['.container/apps/lifecycle.ts','.container/apps/platform-migration.mjs','.container/apps/platform-release-attempt.mjs','.container/apps/platform-runtime-probe.mjs','.container/release-image.mjs','.container/hostinger/platform-fresh.ts','.container/hostinger/target-policy.mjs','.container/hostinger/recovery-channel.mjs'].filter(file=>fs.existsSync(path.join(runtime,file))).map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(runtime,file))).digest('hex')]));fs.mkdirSync(context);fs.copyFileSync(path.join(root,'.container/tests/platform-dind.Dockerfile'),path.join(context,'Dockerfile'));
 console.log('Building dedicated nested test engine');host(['build','--label','codeship.test.owner=platform-lifecycle','-t',image,context]);
 const engineImage=JSON.parse(text(['image','inspect',image]))[0];assert.equal(engineImage.Config.Labels['codeship.test.owner'],'platform-lifecycle');receipt.testEngineImage=engineImage.Id;
 host(['volume','create','--label','codeship.test.run='+run,volume]);const ownVolume=JSON.parse(text(['volume','inspect',volume]))[0];assert.equal(ownVolume.Labels['codeship.test.run'],run,'Do not mount another operation\'s volume');volumeCreated=true;
 host(['run','-d','--name',engine,'--hostname','srv914719','--privileged','--network','none','--label','codeship.test.run='+run,'--mount','type=volume,source='+volume+',target=/var/lib/docker','-e','DOCKER_TLS_CERTDIR=',engineImage.Id,'dockerd','--host=unix:///var/run/docker.sock',...(storageDriver==='containerd'?['--feature','containerd-snapshotter=true']:['--storage-driver='+storageDriver])]);engineCreated=true;
 let ready=false;const engineDeadline=Date.now()+180000;while(Date.now()<engineDeadline){try{nested(['timeout','5','docker','info']);ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}assert(ready,'Nested Docker engine not ready');
 const outer=JSON.parse(text(['inspect',engine]))[0];assert.deepEqual(outer.HostConfig.PortBindings,{});assert.equal(outer.HostConfig.NetworkMode,'none');assert(outer.Mounts.every(m=>m.Type==='volume'&&m.Name===volume));receipt.checks.noHostSocketKeysPortsOrSourceMount=true;
 assert.equal(nestedText(['node','--version']),'v26.13.1');receipt.checks.nodeRuntimeVerifiedBeforeImageTransfer=true;
 program("import fs from 'node:fs';fs.writeFileSync('/.codeship-disposable-platform-test',"+JSON.stringify(run)+",{flag:'wx',mode:0o600});");
 const driver=nestedText(['docker','info','--format','{{.Driver}}']),driverStatus=JSON.parse(nestedText(['docker','info','--format','{{json .DriverStatus}}']));receipt.nestedDriver=driver;receipt.nestedDriverStatus=driverStatus;
 if(storageDriver==='containerd'){assert.equal(driver,'overlayfs');assert(driverStatus.some(row=>row[0]==='driver-type'&&row[1]==='io.containerd.snapshotter.v1'));assert.equal(text(['info','--format','{{.Driver}}']),driver);assert.deepEqual(JSON.parse(text(['info','--format','{{json .DriverStatus}}'])),driverStatus);}else assert.equal(driver,storageDriver);
 receipt.nestedVolumeFilesystem=nestedText(['stat','-f','-c','%T','/var/lib/docker']);
 console.log('Transferring immutable local images into disposable engine');for(const id of new Set([manifest.imageId,updateManifest.imageId,migrationManifest?.imageId,operatorImage,'postgres:18.7-alpine'].filter(Boolean)))await load(id);
 host(['cp',runtime+'/.',engine+':/home/codebiz/devkit/codeship']);
 nested(['mkdir','-p','/home/codebiz/.deployment/state']);nested(['ln','-s','/home/codebiz/.deployment/state','/home/codebiz/devkit/codeship/.codeship']);
 nested(['docker','network','create','cxapp-network']);nested(['docker','network','create','devkits_default']);
 nested(['docker','run','-d','--name','cxapp-postgres','--network','cxapp-network','--network-alias','postgres','--label','com.docker.compose.project=cxapp-postgres','--label','com.docker.compose.service=postgres','--label','codeship.test.run='+run,'--tmpfs','/var/lib/postgresql:rw,size=1g','-p','127.0.0.1:5433:5432','-e','POSTGRES_PASSWORD=disposable-admin-only','postgres:18.7-alpine']);
 let databaseReady=false;for(let i=0;i<120;i++){try{nested(['docker','exec','-e','PGPASSWORD=disposable-admin-only','cxapp-postgres','psql','-h','127.0.0.1','-U','postgres','-tAc','SELECT 1']);databaseReady=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}assert(databaseReady,'Disposable PostgreSQL SQL readiness failed');
 nested(['env','CODESHIP_DISPOSABLE_PLATFORM_TEST=1','CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN='+run,'CODESHIP_FIXTURE_PLATFORM_VERSION='+manifest.version,'CODESHIP_FIXTURE_OPERATOR_IMAGE='+operatorImage,'node','.container/tests/platform-operator-fixture.mjs']);
 const identity=nested(['docker','run','--rm','-i','--network','cxapp-network','--label','codeship.test.run='+run,'-e','CODESHIP_DISPOSABLE_PLATFORM_TEST=1','-e','CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN='+run,'--entrypoint','node',manifest.imageId,'--input-type=module'],fs.readFileSync(path.join(runtime,'.container/tests/platform-identity-fixture.mjs')));
 program("import fs from 'node:fs';fs.writeFileSync('.codeship/apps/platform/private/identity-transfer.json',fs.readFileSync(0),{mode:0o600});",identity);
 program("import fs from 'node:fs';fs.writeFileSync('.codeship/platform-approved.json',fs.readFileSync(0),{mode:0o600});",JSON.stringify(set));
 program("import fs from 'node:fs';fs.writeFileSync('.codeship/platform-update-approved.json',fs.readFileSync(0),{mode:0o600});",JSON.stringify(updateSet));
 if(migrationSet)program("import fs from 'node:fs';fs.writeFileSync('.codeship/platform-migration-approved.json',fs.readFileSync(0),{mode:0o600});",JSON.stringify(migrationSet));
 for(const name of ['codeship_data','codeship_keys'])nested(['docker','volume','create',name]);
 const helper=nestedText(['docker','create','--user','0','--mount','type=volume,source=codeship_data,target=/data','--mount','type=volume,source=codeship_keys,target=/keys','--entrypoint','sh',operatorImage,'-c','chown -R 1000:1000 /data /keys']);
 nested(['docker','cp','.codeship/data/codeship.sqlite',helper+':/data/codeship.sqlite']);nested(['docker','cp','.codeship/keys/vault.key',helper+':/keys/vault.key']);nested(['docker','start','-a',helper]);nested(['docker','rm',helper]);
 // Snapshot collector uses --once repeatedly, creating no singleton/deployment lock.
 host(['exec','-d',engine,'sh','-c','while :; do node scripts/collect-docker-metrics.ts --once >/tmp/platform-metrics.log 2>&1; sleep 3; done']);
 const shell=(mode,approved='.codeship/platform-approved.json')=>{try{return nested(['env','CODESHIP_RELEASED_UPDATE_ENTRY=1','CODESHIP_EXECUTION_MODE=inventory','sh','.container/apps/'+mode+'.sh','platform','--release-set',approved]);}catch(error){fs.writeFileSync(path.join(evidence,mode+'-failed-command.log'),Buffer.concat([error.stdout??Buffer.alloc(0),error.stderr??Buffer.alloc(0)]));throw error;}};
 const postgresId=nestedText(['docker','inspect','cxapp-postgres','--format','{{.Id}}']);
 nested(['env','CODESHIP_DISPOSABLE_PLATFORM_TEST=1','CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN='+run,'node','.container/tests/platform-operator-fixture.mjs','--gateway-invalid']);
 let rejected=false;try{shell('setup');}catch{rejected=true;}assert(rejected,'Invalid gateway settings must fail actual setup');
 assert.equal(nestedText(['docker','exec','cxapp-postgres','psql','-U','postgres','-tAc',"SELECT count(*) FROM pg_database WHERE datname IN ('platform_master','platform_codexsun')"]),'0');assert.equal(nestedText(['docker','exec','cxapp-postgres','psql','-U','postgres','-tAc',"SELECT count(*) FROM pg_roles WHERE rolname='platform_service'"]),'0');assert.equal(nestedText(['docker','ps','-aq','--filter','name=^/platform$']),'');receipt.checks.invalidRuntimeRefusedBeforeDatabaseProvisioning=true;
 assert.equal(program("import fs from 'node:fs';console.log(fs.existsSync('.codeship/apps/platform/fresh-install-ownership.json'));").toString().trim(),'false');
 nested(['env','CODESHIP_DISPOSABLE_PLATFORM_TEST=1','CODESHIP_DISPOSABLE_PLATFORM_TEST_RUN='+run,'node','.container/tests/platform-operator-fixture.mjs','--gateway-valid']);
 console.log('Executing actual Platform setup.sh');fs.writeFileSync(path.join(evidence,'setup.log'),shell('setup'));receipt.checks.actualSetupPassed=true;
 assert.equal(nestedText(['docker','exec','cxapp-postgres','psql','-U','postgres','-d','platform_codexsun','-tAc',"SELECT to_regclass('public.business_records') IS NULL"]),'t');assert.equal(nestedText(['docker','exec','cxapp-postgres','psql','-U','postgres','-d','fixture_tenant','-tAc','SELECT count(*) FROM business_records']),'1');receipt.checks.syntheticBusinessRowsNotImported=true;
 const platformId=nestedText(['docker','inspect','platform','--format','{{.Id}}']);
 try{shell('setup');throw Error('Repeated setup unexpectedly succeeded');}catch(error){if(error.message==='Repeated setup unexpectedly succeeded')throw error;receipt.checks.repeatedSetupRefused=true;}
 const refusal=JSON.parse(nestedText(['node','-e',"const fs=require('fs');console.log(fs.readFileSync('.codeship/apps/platform/stages.jsonl','utf8').trim().split('\\n').at(-1))"]));assert.equal(refusal.stage,'release');assert.equal(refusal.status,'failed');assert.match(refusal.message,/Platform is installed; use update\.sh/);
 assert.equal(nestedText(['docker','inspect','platform','--format','{{.Id}}']),platformId);
 const identityQuery="SELECT md5(string_agg(public_id||':'||username,',' ORDER BY public_id)) FROM users";
 const identityBefore=nestedText(['docker','exec','cxapp-postgres','psql','-U','postgres','-d','platform_codexsun','-tAc',identityQuery]);
 console.log('Executing actual Platform update.sh');fs.writeFileSync(path.join(evidence,'update.log'),shell('update','.codeship/platform-update-approved.json'));
 const updatedId=nestedText(['docker','inspect','platform','--format','{{.Id}}']);
 if(manifest.imageId!==updateManifest.imageId){assert.notEqual(updatedId,platformId);receipt.checks.changedReleaseReplacedContainer=true;}else assert.equal(updatedId,platformId);
 assert.equal(nestedText(['docker','exec','cxapp-postgres','psql','-U','postgres','-d','platform_codexsun','-tAc',identityQuery]),identityBefore);receipt.checks.syntheticPublicIdentitiesPreserved=true;
 fs.writeFileSync(path.join(evidence,'update-repeat.log'),shell('update','.codeship/platform-update-approved.json'));assert.equal(nestedText(['docker','inspect','platform','--format','{{.Id}}']),updatedId);receipt.checks.sameReleaseUpdateNoReplacement=true;
 const stageRows=JSON.parse(nestedText(['node','-e',"const fs=require('fs');console.log(JSON.stringify(fs.readFileSync('.codeship/apps/platform/stages.jsonl','utf8').trim().split('\\n').map(JSON.parse)))"]));
 fs.writeFileSync(path.join(evidence,'stages.json'),JSON.stringify(stageRows,null,2));
 assert(!stageRows.some(r=>r.mode==='update'&&(/^backup-/.test(r.stage)||r.stage==='migration'&&r.status==='passed')));receipt.checks.noImageOnlyMigrationBackup=true;
 receipt.nestedPlatformImage=nestedText(['docker','inspect','platform','--format','{{.Image}}']);assert.equal(receipt.nestedPlatformImage,updateManifest.imageId);
 if(migrationManifest){
  console.log('Executing actual pending-migration update with independent outer Docker recovery');await runWithIndependentRecovery('.codeship/platform-migration-approved.json');
  assert((receipt.independentRecovery?.length??0)>=2,'Master and tenant snapshots both require real independent restore');
  assert.equal(nestedText(['docker','exec','cxapp-postgres','psql','-U','postgres','-d','platform_codexsun','-tAc',identityQuery]),identityBefore);receipt.checks.pendingMigrationPreservedSyntheticTenantIdentities=true;
  receipt.nestedPlatformImage=nestedText(['docker','inspect','platform','--format','{{.Image}}']);assert.equal(receipt.nestedPlatformImage,migrationManifest.imageId);receipt.migrationVersion=migrationManifest.version;receipt.checks.actualPendingMigrationUpdatePassed=true;
  const finalRows=JSON.parse(nestedText(['node','-e',"const fs=require('fs');console.log(JSON.stringify(fs.readFileSync('.codeship/apps/platform/stages.jsonl','utf8').trim().split('\\n').map(JSON.parse)))"]));fs.writeFileSync(path.join(evidence,'stages.json'),JSON.stringify(finalRows,null,2));
  const migrated=finalRows.findLastIndex(row=>row.stage==='migration'&&row.status==='passed');assert(migrated>=0,'Actual schema migration stage missing');for(const database of ['platform_master','platform_codexsun']){const restored=finalRows.findLastIndex(row=>row.stage==='offhost-recovery-'+database&&row.status==='passed');assert(restored>=0&&restored<migrated,'Independent scoped recovery must precede schema changes');}
  receipt.appliedNewMasterMigrations=[];for(const file of Object.keys(migrationManifest.migrations).filter(file=>!file.includes('/tenant-migrations/')&&!Object.hasOwn(updateManifest.migrations,file))){const name=path.basename(file,'.ts');assert(/^[a-zA-Z0-9_]+$/.test(name));assert.equal(nestedText(['docker','exec','cxapp-postgres','psql','-U','postgres','-d','platform_master','-tAc',"SELECT count(*) FROM platform_migrations WHERE name='"+name+"'"]),'1');receipt.appliedNewMasterMigrations.push(name);}
 }
 assert.equal(nestedText(['docker','inspect','cxapp-postgres','--format','{{.Id}}']),postgresId);receipt.checks.unselectedInfrastructurePreserved=true;
 receipt.completedAt=new Date().toISOString();console.log('Actual setup, setup refusal and no-op update passed in isolated engine');
}catch(error){receipt.failure=error.message;if(engineCreated){try{const log=cp.spawnSync('docker',['logs',engine],{stdio:['ignore','pipe','pipe'],windowsHide:true});fs.writeFileSync(path.join(evidence,'engine.log'),Buffer.concat([log.stdout??Buffer.alloc(0),log.stderr??Buffer.alloc(0)]));fs.writeFileSync(path.join(evidence,'failed-stages.jsonl'),nested(['sh','-c','test ! -f .codeship/apps/platform/stages.jsonl || cat .codeship/apps/platform/stages.jsonl']));}catch{}}
 for(const name of ['platform','cxapp-postgres'])if(engineCreated)try{const log=cp.spawnSync('docker',['exec',engine,'docker','logs',name],{stdio:['ignore','pipe','pipe'],windowsHide:true,maxBuffer:8*1024*1024});fs.writeFileSync(path.join(evidence,name+'.log'),Buffer.concat([log.stdout??Buffer.alloc(0),log.stderr??Buffer.alloc(0)]));fs.writeFileSync(path.join(evidence,name+'-state.json'),nested(['docker','inspect',name,'--format','{{json .State}}']));}catch{}
 console.error('Disposable evidence retained at '+evidence);throw error;
}finally{
 if(engineCreated){const facts=JSON.parse(text(['inspect',engine]))[0];assert.equal(facts.Config.Labels['codeship.test.run'],run);host(['rm','-fv',engine]);}
 if(volumeCreated){const facts=JSON.parse(text(['volume','inspect',volume]))[0];assert.equal(facts.Labels['codeship.test.run'],run);host(['volume','rm',volume]);}
 receipt.hostInventoryUnchanged=before===snapshot();receipt.hostInventoryInterpretation=receipt.hostInventoryUnchanged?'No host-container identity/state differences observed':'Host inventory changed during concurrent authorized work; this comparison does not attribute changes to the harness';fs.writeFileSync(path.join(evidence,'receipt.json'),JSON.stringify(receipt,null,2));
 if(!receipt.failure)for(const own of [runtime,context]){const resolved=path.resolve(own);assert(resolved.startsWith(path.resolve(evidence)+path.sep));if(fs.existsSync(resolved))assert(!fs.lstatSync(resolved).isSymbolicLink());fs.rmSync(resolved,{recursive:true,force:true});}
}
console.log(JSON.stringify(receipt));
