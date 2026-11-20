// Released operator adapter for the explicitly reviewed Platform16 preservation boundary.
// The host must supply restore-attested SHA/digest inputs; never compute a replacement proof from live rows alone.
import {createHash} from 'node:crypto';
import {sql} from 'kysely';
import {MasterMigrationProvider} from '/opt/codebiz/apps/platform/src/api/database/migration-provider.ts';
import {masterMigrator} from '/opt/codebiz/apps/platform/src/api/database/master-migrator.ts';
import {authorizeIdentityRetirement,verifyLegacyTenantCopies} from '/opt/codebiz/apps/platform/src/api/database/retire-master-identity.ts';
import {legacyIdentitySnapshot} from '/opt/codebiz/apps/platform/src/api/modules/identity/database/migrations/20261120000000_retire_master_identity.ts';

const retirement='20261120000000_retire_master_identity';
const sha=/^[a-f0-9]{64}$/;
const tenantTables=['users','user_credentials','roles','user_roles','user_app_grants','app_roles','app_role_grants','app_user_roles','sessions','auth_events'];
export async function tenantIdentityFingerprint(db){
 const hash=createHash('sha256');
 for(const table of tenantTables){const rows=(await sql.raw('SELECT to_jsonb(t)::text AS value FROM public.'+table+' t ORDER BY to_jsonb(t)::text COLLATE "C"').execute(db)).rows;hash.update(table+'\0');for(const row of rows)hash.update(row.value+'\n');}
 return hash.digest('hex');
}

export async function preserveHistoricalProofsAndRetire(master,targets,options){
 const {historicalMetadata:historical,historicalMetadataSha256,backupSha256,restoredLegacyDigest,offHostRestoreVerified}=options;
 // Only a released host controller may attest these values after hashing the archive and restoring it off-host.
 // No archive, proof file, SSH key or operator secret is mounted into this migration image.
 if(offHostRestoreVerified!==true||![historicalMetadataSha256,backupSha256,restoredLegacyDigest].every(value=>sha.test(value??'')))throw Error('Actual checked recovery and historical provenance required');
 if(createHash('sha256').update(JSON.stringify(historical)).digest('hex')!==historicalMetadataSha256)throw Error('Historical metadata differs from the host-verified object');
 if(historical.schema!==1||historical.source!=='existing-native-tenant'||!Array.isArray(historical.rows)||historical.rows.length!==3||new Set(historical.rows.map(row=>row.public_id)).size!==3||historical.rows.some(row=>Object.keys(row).sort().join(',')!=='public_id,source_digest'||!/^[a-z0-9]{8}$/.test(row.public_id??'')||!sha.test(row.source_digest??'')))throw Error('Historical metadata scope differs');
 const registrations=(await sql`SELECT t.id,t.public_id,t.code_key,d.database_name FROM tenants t JOIN tenant_databases d ON d.tenant_id=t.id WHERE d.active AND t.active`.execute(master)).rows;
 if(registrations.length!==1||targets.length!==1)throw Error('This verified repair covers the single approved Codexsun tenant only');
 const registration=registrations[0],target=targets[0];
 if(registration.code_key!=='codexsun'||registration.database_name!=='platform_codexsun'||target.publicId!==registration.public_id||target.database!==registration.database_name)throw Error('Tenant target differs from its current registration');
 const bindings=(await sql`SELECT public_id,current_database() AS database FROM tenant_identity_scope WHERE singleton=1`.execute(target.db)).rows;
 if(bindings.length!==1||bindings[0].public_id!==target.publicId||bindings[0].database!==target.database)throw Error('Tenant database binding differs');
 // Exact released row projection/order: the independent historical import digests must already match.
 await sql`SET TIME ZONE 'UTC'`.execute(master);
 const sources=(await sql`SELECT u.public_id,u.username,u.email,u.display_name,u.avatar_asset_public_id,
   u.email_verified_at,u.status,u.active,u.created_at,u.updated_at,u.created_by,u.updated_by,
   c.password_hash,c.password_changed_at,c.password_change_required,m.role,m.status AS membership_status,
   EXISTS(SELECT 1 FROM platform_operators p WHERE p.user_id=u.id AND p.active) AS operator
   FROM users u JOIN user_credentials c ON c.user_id=u.id JOIN tenant_memberships m ON m.user_id=u.id
   WHERE m.tenant_id=${registration.id} ORDER BY u.id`.execute(master)).rows;
 if(sources.length!==3||sources.some(row=>historical.rows.find(proof=>proof.public_id===row.public_id)?.source_digest!==createHash('sha256').update(JSON.stringify(row)).digest('hex')))throw Error('Independent historical proof does not match current legacy source');
 const snapshot=await legacyIdentitySnapshot(master);if(snapshot?.digest!==restoredLegacyDigest)throw Error('Current legacy master differs from checked restored snapshot');
 const provider=new MasterMigrationProvider(),migrations=await provider.getMigrations(),original=migrations[retirement];
 if(!original)throw Error('Approved immutable retirement migration missing');
 const pending=(await masterMigrator(master,provider).getMigrations()).filter(row=>!row.executedAt).map(row=>row.name);
 if(pending.length!==1||pending[0]!==retirement)throw Error('This reviewed adapter covers only the recorded retirement boundary');
 const identities=(await sql`SELECT u.id,u.public_id,u.tenant_id,u.username,u.email,c.user_id AS credential_owner FROM users u JOIN user_credentials c ON c.user_id=u.id`.execute(target.db)).rows;
 const roles=(await sql`SELECT ur.user_id,r.code,ur.status,r.active FROM user_roles ur JOIN roles r ON r.id=ur.role_id`.execute(target.db)).rows;
 for(const source of sources){
  const matches=identities.filter(user=>user.public_id===source.public_id),expected=source.operator?'sa':source.role==='admin'?'admin':'user';
  if(matches.length!==1||matches[0].tenant_id!==target.publicId||matches[0].username!==source.username||matches[0].email!==source.email)throw Error('Existing tenant identity mapping differs; no merge or overwrite permitted');
  const assigned=roles.filter(role=>role.user_id===matches[0].id);
  if(assigned.length!==1||assigned[0].code!==expected||assigned[0].status!==source.membership_status||assigned[0].active!==true)throw Error('Current tenant role decision requires review; no role changes permitted');
 }
 const before=await tenantIdentityFingerprint(target.db);let inserted=0;
 await target.db.transaction().execute(async tx=>{
  for(const proof of historical.rows){
   const prior=(await sql`SELECT source_digest FROM legacy_identity_imports WHERE public_id=${proof.public_id}`.execute(tx)).rows;
   if(prior.length&&prior[0].source_digest!==proof.source_digest)throw Error('Existing historical metadata conflicts; never overwrite it');
   if(!prior.length){const result=await sql`INSERT INTO legacy_identity_imports(public_id,source_digest) VALUES(${proof.public_id},${proof.source_digest}) ON CONFLICT(public_id) DO NOTHING RETURNING public_id`.execute(tx);inserted+=result.rows.length;}
  }
  const final=(await sql`SELECT public_id,source_digest FROM legacy_identity_imports`.execute(tx)).rows;
  if(final.length!==3||final.some(row=>historical.rows.find(proof=>proof.public_id===row.public_id)?.source_digest!==row.source_digest))throw Error('Historical metadata changed during preservation');
 });
 const proof=await verifyLegacyTenantCopies(master,targets);
 if(proof.verifiedMemberships!==3||before!==await tenantIdentityFingerprint(target.db))throw Error('Current tenant identity changed during metadata preservation');
 async function preserve(index,locked,work){
  if(index===targets.length)return work(locked);
  const current=targets[index];return current.db.transaction().setIsolationLevel('repeatable read').execute(tx=>preserve(index+1,[...locked,{...current,db:tx}],work));
 }
 await preserve(0,[],async locked=>{
  const wrapped={getMigrations:async()=>({...migrations,[retirement]:{...original,up:async tx=>{await authorizeIdentityRetirement(tx,locked,restoredLegacyDigest,backupSha256);await original.up(tx);}}})};
  const result=await masterMigrator(master,wrapped).migrateToLatest();if(result.error)throw Error('Official retirement refused; retain checked recovery and metadata');
 });
 if(before!==await tenantIdentityFingerprint(target.db))throw Error('Tenant identities/credentials/roles changed during retirement');
 const audit=(await sql`SELECT source_sha256,backup_sha256,counts FROM master_identity_retirement WHERE singleton=1`.execute(master)).rows;
 if(audit.length!==1||audit[0].source_sha256!==restoredLegacyDigest||audit[0].backup_sha256!==backupSha256)throw Error('Official retirement recovery audit differs');
 return {historicalProofsInserted:inserted,verifiedMemberships:proof.verifiedMemberships,tenantIdentitiesCredentialsRolesPreserved:true,officialRetirementApplied:true,officialRetirementAuditMatches:true};
}
