import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';
import {applyMigration} from '../.container/migration-operation.mjs';import {verifyLocalRecovery} from '../.container/hostinger/local-recovery.mjs';
const run='updater-'+randomUUID().slice(0,8),pg=run+'-pg',writer=run+'-writer',network=run+'-net',image='postgres:18.7-alpine';
const output=fs.mkdtempSync(path.join(os.tmpdir(),'codeship-updater-test-'));
const docker=(args,input)=>cp.execFileSync('docker',args,{input,stdio:['pipe','pipe','pipe'],windowsHide:true,maxBuffer:32*1024*1024});
const text=args=>docker(args).toString().trim();
const sql=(query,database='updater_test')=>text(['exec',pg,'psql','-U','updater','-d',database,'-tAc',query]);
const receipt={run,output,checks:{}};let networkCreated=false,pgCreated=false,writerCreated=false;
try{
 try{docker(['image','inspect',image]);}catch{console.log('Pulling disposable PostgreSQL18.7 test image');docker(['pull',image]);}
 receipt.postgresImage=JSON.parse(text(['image','inspect',image]))[0].Id;
 docker(['network','create','--label','codeship.test.run='+run,network]);networkCreated=true;
 docker(['run','-d','--name',pg,'--tmpfs','/var/lib/postgresql:rw,size=512m','--network',network,'--label','codeship.test.run='+run,'-e','POSTGRES_USER=updater','-e','POSTGRES_PASSWORD=disposable-local-only','-e','POSTGRES_DB=updater_test',image]);pgCreated=true;
 let ready=false;for(let i=0;i<240;i++){try{docker(['exec','-e','PGPASSWORD=disposable-local-only',pg,'psql','-h','127.0.0.1','-U','updater','-d','updater_test','-tAc','SELECT 1']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}assert(ready,'Disposable PostgreSQL not ready');
 sql('CREATE TABLE evidence(id serial PRIMARY KEY, value text NOT NULL)');
 docker(['run','-d','--name',writer,'--network',network,'--label','codeship.test.run='+run,'-e','PGHOST='+pg,'-e','PGUSER=updater','-e','PGPASSWORD=disposable-local-only','-e','PGDATABASE=updater_test','--entrypoint','sh',image,'-c',"while true; do psql -v ON_ERROR_STOP=1 -c \"INSERT INTO evidence(value) VALUES ('disposable')\" >/dev/null; sleep 0.1; done"]);writerCreated=true;
 for(let i=0;i<30&&Number(sql('SELECT count(*) FROM evidence'))===0;i++)await new Promise(r=>setTimeout(r,200));assert(Number(sql('SELECT count(*) FROM evidence'))>0);
 const writerId=text(['inspect',writer,'--format','{{.Id}}']);
 await applyMigration({decision:{migrateRequired:false,pending:[]},installed:true,quiesce:async()=>assert.fail('No-op stopped writer'),backup:async()=>assert.fail('No-op backed up'),checkBackup:async()=>assert.fail(),migrate:async()=>assert.fail('No-op migrated')});
 assert.equal(text(['inspect',writer,'--format','{{.Id}}']),writerId);assert.equal(text(['inspect',writer,'--format','{{.State.Running}}']),'true');receipt.checks.imageOnlyNoStopBackupMigration=true;
 const backup=path.join(output,'before-migration.dump');let rows;
 await applyMigration({decision:{migrateRequired:true,pending:['add_evidence_flag']},installed:true,requireOffhost:true,
  authorizeRecovery:async recovery=>{const proof=await verifyLocalRecovery(recovery.file,'postgresql');return {...proof,sha256:recovery.sha256,reference:'disposable-local-docker'};},
  quiesce:async()=>{docker(['stop','--time','2',writer]);rows=Number(sql('SELECT count(*) FROM evidence'));},
  backup:async()=>{fs.writeFileSync(backup,docker(['exec',pg,'pg_dump','-U','updater','-d','updater_test','--format=custom']));return {file:backup,sha256:createHash('sha256').update(fs.readFileSync(backup)).digest('hex')};},
  checkBackup:async()=>{docker(['exec','-i',pg,'pg_restore','--list'],fs.readFileSync(backup));},
  migrate:async()=>{assert.equal(text(['inspect',writer,'--format','{{.State.Running}}']),'false');sql('ALTER TABLE evidence ADD COLUMN migrated boolean NOT NULL DEFAULT true');},
 });
 assert.equal(Number(sql("SELECT count(*) FROM information_schema.columns WHERE table_name='evidence' AND column_name='migrated'")),1);
 docker(['exec',pg,'createdb','-U','updater','recovery_test']);docker(['exec','-i',pg,'pg_restore','-U','updater','-d','recovery_test','--single-transaction','--exit-on-error'],fs.readFileSync(backup));
 assert.equal(Number(sql('SELECT count(*) FROM evidence','recovery_test')),rows);assert.equal(Number(sql("SELECT count(*) FROM information_schema.columns WHERE table_name='evidence' AND column_name='migrated'",'recovery_test')),0);
 receipt.checks.quiescedCheckedBackupBeforeMigration=true;receipt.checks.independentOffhostDockerRestoreApprovedBeforeMigration=true;receipt.checks.actualRestorePreservesOldSchemaAndRows=true;receipt.restoredRows=rows;
 for(const failure of ['dump','corrupt']){let migrated=false;await assert.rejects(applyMigration({decision:{migrateRequired:true,pending:['next']},installed:true,quiesce:async()=>{assert.equal(text(['inspect',writer,'--format','{{.State.Running}}']),'false');},backup:async()=>{if(failure==='dump')docker(['exec',pg,'pg_dump','-U','updater','-d','database_that_does_not_exist']);return {data:Buffer.from('invalid archive')};},checkBackup:async(r)=>{docker(['exec','-i',pg,'pg_restore','--list'],r.data);},migrate:async()=>{migrated=true;}}));assert.equal(migrated,false);assert.equal(text(['inspect',writer,'--format','{{.State.Running}}']),'false');}
 receipt.checks.backupFailuresPreventMigrationAndAutomaticRestart=true;receipt.completedAt=new Date().toISOString();
 }catch(error){
 if(pgCreated)fs.writeFileSync(path.join(output,'postgres.log'),docker(['logs',pg]));
 console.error('Disposable test evidence retained at '+output);
 throw error;
}finally{
 for(const [name,created]of [[writer,writerCreated],[pg,pgCreated]])if(created){const facts=JSON.parse(text(['inspect',name]))[0];assert.equal(facts.Config.Labels['codeship.test.run'],run);docker(['rm','-fv',name]);}
 if(networkCreated){const facts=JSON.parse(text(['network','inspect',network]))[0];assert.equal(facts.Labels['codeship.test.run'],run);docker(['network','rm',network]);}
 fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2));
}
console.log(JSON.stringify(receipt));
