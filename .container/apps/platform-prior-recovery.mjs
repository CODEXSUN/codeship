import {createHash} from 'node:crypto';
import {readFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {validateManifest} from '../release-policy.mjs';
import {validatePlatformResumeMigrations} from './platform-release-attempt.mjs';

const sha=/^[a-f0-9]{64}$/;
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const same=(a,b)=>digest(a)===digest(b);
const identifier=value=>'"'+String(value).replaceAll('"','""')+'"';
const control=/^(?:platform(?:_tenant)?|kysely)_migration(?:s|_lock)$/;
const legacy=new Set(['users','user_credentials','platform_operators','tenants','tenant_memberships','tenant_databases','roles','user_roles','user_app_grants','app_roles','app_role_grants','app_user_roles','tenant_identity_scope']);

/** A dedicated pg client, one consistent read-only snapshot, no row values returned/logged. */
export async function snapshotPlatformPriorDatabase(client){
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  await client.query("SET LOCAL TIME ZONE 'UTC'");await client.query("SET LOCAL search_path = public, pg_catalog");await client.query("SET LOCAL DateStyle = 'ISO, YMD'");
  const schema={};
  for(const [key,query]of [
   ['tables',"SELECT table_name,table_type FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name COLLATE \"C\""],
   ['columns',"SELECT table_name,column_name,ordinal_position,data_type,udt_schema,udt_name,is_nullable,column_default,is_identity,identity_generation,is_generated,generation_expression,character_maximum_length,numeric_precision,numeric_scale,datetime_precision,collation_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name COLLATE \"C\",ordinal_position"],
   ['constraints',"SELECT c.relname AS table_name,k.conname,k.contype,pg_get_constraintdef(k.oid,true) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname COLLATE \"C\",k.conname COLLATE \"C\""],
   ['indexes',"SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename COLLATE \"C\",indexname COLLATE \"C\""],
   ['rowSecurity',"SELECT c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') ORDER BY c.relname COLLATE \"C\""],
   ['policies',"SELECT tablename,policyname,permissive,roles::text,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename COLLATE \"C\",policyname COLLATE \"C\""],
   ['triggers',"SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid,true) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname COLLATE \"C\",t.tgname COLLATE \"C\""],
   ['views',"SELECT viewname,definition FROM pg_views WHERE schemaname='public' ORDER BY viewname COLLATE \"C\""],
   ['functions',"SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p') ORDER BY p.proname COLLATE \"C\",pg_get_function_identity_arguments(p.oid) COLLATE \"C\""],
   ['enums',"SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname COLLATE \"C\",e.enumsortorder"],
   ['sequences',"SELECT sequence_name,data_type,start_value,minimum_value,maximum_value,increment,cycle_option FROM information_schema.sequences WHERE sequence_schema='public' ORDER BY sequence_name COLLATE \"C\""],
   ['extensions',"SELECT e.extname,e.extversion,n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE n.nspname='public' ORDER BY e.extname COLLATE \"C\""],
  ])schema[key]=(await client.query(query)).rows;
  const data=createHash('sha256'),identity=createHash('sha256'),tables={};
  for(const table of schema.tables.filter(row=>row.table_type==='BASE TABLE').map(row=>row.table_name)){
   if(control.test(table))continue;
   const rows=(await client.query('SELECT to_jsonb(t)::text AS value FROM public.'+identifier(table)+' AS t ORDER BY to_jsonb(t)::text COLLATE "C"')).rows;
   tables[table]=rows.length;data.update(table+'\0');if(legacy.has(table))identity.update(table+'\0');
   for(const row of rows){data.update(row.value+'\n');if(legacy.has(table))identity.update(row.value+'\n');}
  }
  for(const sequence of schema.sequences){const rows=(await client.query('SELECT last_value::text,is_called FROM public.'+identifier(sequence.sequence_name))).rows;data.update(sequence.sequence_name+'\0'+JSON.stringify(rows)+'\n');}
  await client.query('COMMIT');return {schemaSha256:digest(schema),dataSha256:data.digest('hex'),legacyIdentitySha256:identity.digest('hex'),tables};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}

/** Only the exact retained input files are eligible; links/devices are refused. */
export async function hashPlatformPriorFiles(files){
 const result={};for(const key of ['state','environment','compose','composeEnvironment']){const file=files[key];if(typeof file!=='string')throw Error('Platform prior file binding missing');const stat=await lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Platform prior binding must be a regular file');result[key]=createHash('sha256').update(await readFile(file)).digest('hex');}return result;
}

/** Admission only. This never chooses a release, restores data or changes a schema. */
export function validatePlatformPriorRecovery(options){
 const {approvedManifest:m,priorState:prior,actual,plans,scopes,ownershipMarker:marker,currentFiles,retainedFiles,retainedDirectory,failedStages,latestFailedRun,baseline,currentSnapshots}=options;
 if(!m||!prior)throw Error('Approved prior Platform release and successful state required');
 validateManifest(m,{owner:'apps/platform',repository:'CODEXSUN/platform',tag:m.tag,commit:m.commit});
 if(!/^[a-f0-9]{40}$/.test(m.commit??'')||!/^sha256:[a-f0-9]{64}$/.test(m.imageId??'')||prior.owner!==m.owner||prior.repository!==m.repository||prior.version!==m.version||prior.tag!==m.tag||prior.commit!==m.commit||prior.imageId!==m.imageId||prior.releaseImage!==m.image||![m.image,m.imageId].includes(prior.image))throw Error('Recorded prior Platform identity differs from its approved release');
 if(actual?.imageId!==m.imageId||actual.running!==false||actual.status!=='exited')throw Error('Prior recovery requires the exact stopped prior Platform container');
 if(typeof prior.compose!=='string'||!path.isAbsolute(prior.compose)||options.composeFile!==prior.compose)throw Error('Use the exact successful prior Platform Compose path');
 for(const key of ['state','environment','compose','composeEnvironment'])if(!sha.test(currentFiles?.[key]??'')||!sha.test(retainedFiles?.[key]??'')||currentFiles[key]!==retainedFiles[key])throw Error('Platform prior state/configuration differs from retained pre-update files');
 if(!Array.isArray(failedStages)||!failedStages.length||typeof latestFailedRun!=='string'||!/^[0-9TZ.:-]+$/.test(latestFailedRun))throw Error('Exact latest failed Platform update required');
 const latest=failedStages.filter(row=>['setup','update'].includes(row.mode)).at(-1);
 if(!latest||latest.run!==latestFailedRun||latest.mode!=='update'||latest.stage!=='release'||latest.status!=='failed')throw Error('Prior recovery is not tied to the latest failed Platform update');
 const rows=failedStages.filter(row=>row.run===latestFailedRun);
 if(rows.some(row=>row.mode!=='update'||row.stage==='migration'&&row.status==='passed'||row.stage==='replacement'&&row.status==='started'||row.stage==='release'&&row.status==='succeeded'))throw Error('A completed migration or replacement forbids prior recovery');
 const retained=rows.filter(row=>row.stage==='previous-configuration'&&row.status==='retained');
 if(retained.length!==1||retained[0].directory!==retainedDirectory||retainedDirectory!==path.join(path.dirname(prior.compose),'private','recovery',latestFailedRun))throw Error('Retained Platform configuration is not from this failed update');
 const migrationMap={};for(const [file,hash]of Object.entries(m.migrations)){const name=(file.includes('/tenant-migrations/')?'tenant:':'master:')+path.basename(file,'.ts');if(Object.hasOwn(migrationMap,name))throw Error('Prior migration identity is ambiguous');migrationMap[name]=hash;}
 if(!same(prior.migrations,migrationMap))throw Error('Prior Platform migration hashes differ from the approved release');
 validatePlatformResumeMigrations(plans,prior.migrations,m);
 if(!Array.isArray(scopes)||!scopes.length||scopes.filter(s=>s.scope==='master').length!==1||new Set(scopes.map(s=>s.scope)).size!==scopes.length||new Set(scopes.map(s=>s.database)).size!==scopes.length||!same(scopes.map(s=>s.scope).sort(),plans.map(p=>p.scope).sort()))throw Error('Prior recovery database scopes are incomplete or overlap');
 if(marker?.role!=='platform_service'||!['fresh-identity-installed','imported'].includes(marker.status)||!Array.isArray(marker.scopes)||!same(marker.scopes.map(s=>s.database).sort(),scopes.map(s=>s.database).sort()))throw Error('Platform database ownership marker differs');
 if(!Array.isArray(baseline)||!Array.isArray(currentSnapshots)||baseline.length!==scopes.length||currentSnapshots.length!==scopes.length)throw Error('Restore-tested baseline and current database fingerprints required for every scope');
 for(const scope of scopes){
  if(!/^[_a-z][_a-z0-9]{0,62}$/.test(scope.database??'')||scope.scope!=='master'&&!/^tenant:[a-z0-9]{8}$/.test(scope.scope??''))throw Error('Prior recovery database identity invalid');
  const matches=(all)=>all.filter(item=>item.scope===scope.scope&&item.database===scope.database),before=matches(baseline),after=matches(currentSnapshots);
  if(before.length!==1||after.length!==1||before[0].offHostRestoreVerified!==true||!sha.test(before[0].backupSha256??''))throw Error('Scoped off-host restore proof missing');
  for(const key of ['schemaSha256','dataSha256','legacyIdentitySha256'])if(!sha.test(before[0][key]??'')||!sha.test(after[0][key]??'')||before[0][key]!==after[0][key])throw Error('Platform schema or data changed since the checked pre-migration snapshot');
  for(const stage of ['backup-','offhost-recovery-']){const proof=rows.filter(row=>row.stage===stage+scope.database&&row.status==='passed');if(proof.length!==1||proof[0].sha256!==before[0].backupSha256)throw Error('Scoped recovery proof does not match this failed operation');}
 }
 return {action:'recover-prior',version:m.version,imageId:m.imageId,failedRun:latestFailedRun,schemaChanged:false,dataRestored:false};
}

export function platformPriorStartArguments(composeFile,waitSeconds=180){
 if(typeof composeFile!=='string'||!path.isAbsolute(composeFile)||!Number.isSafeInteger(waitSeconds)||waitSeconds<30||waitSeconds>600)throw Error('Use the exact retained Platform Compose file and bounded readiness');
 return ['compose','-p','applications','-f',composeFile,'up','-d','--no-build','--no-recreate','--no-deps','--wait','--wait-timeout',String(waitSeconds),'platform'];
}

/** Explicit action only; re-read proofs immediately before starting the unchanged prior runtime. */
export async function executePlatformPriorRecovery(options,{recheck,start,verify,record=async()=>{}}){
 const admission=validatePlatformPriorRecovery(options);if(typeof recheck!=='function'||typeof start!=='function'||typeof verify!=='function')throw Error('Prior recovery requires fresh admission, selected start and readiness verification');
 const fresh=await recheck();validatePlatformPriorRecovery(fresh);if(!same(admission,validatePlatformPriorRecovery(fresh)))throw Error('Prior recovery admission changed');
 await record('prior-recovery-admission','passed',admission);await start(platformPriorStartArguments(options.composeFile,options.waitSeconds??180));await verify();await record('prior-recovery','passed',admission);return admission;
}

/** Compare original archive DDL, never a restore/re-deparse. Preserve all SQL and comments. */
export function hashPlatformPriorArchiveSchema(sql){
 if(typeof sql!=='string'||!sql.includes('PostgreSQL database dump')||!sql.includes('PostgreSQL database dump complete'))throw Error('Complete pg_restore schema SQL required');
 const lines=sql.split('\n');const restrict=lines.filter(line=>/^\\(?:un)?restrict /.test(line));
 if(restrict.length!==2||!/^\\restrict [A-Za-z0-9]+$/.test(restrict[0])||restrict[1]!==restrict[0].replace('\\restrict ','\\unrestrict '))throw Error('Expected exact paired archive restriction markers');
 return createHash('sha256').update(lines.filter(line=>!restrict.includes(line)).join('\n')).digest('hex');
}
