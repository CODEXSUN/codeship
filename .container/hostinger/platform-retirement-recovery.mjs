const sha=/^[a-f0-9]{64}$/;
export const platformRetirementImage='sha256:c6e5272c0d3c0bebd0dee73a5436728f1aa3012672e81d90887d6f958cb0aa11';
export const platformLegacyTables=['users','user_credentials','sessions','tenant_memberships','platform_operators'];
export function validateRetirementRecoveryRequest(request,manifest){
 if(request.requireIdentityRetirementProof!==undefined&&typeof request.requireIdentityRetirementProof!=='boolean')throw Error('Invalid retirement recovery request');
 if(request.requireIdentityRetirementProof!==true){if(request.candidateImageId!==undefined)throw Error('Unrequested retirement image');return false;}
 if(request.service!=='platform'||request.kind!=='postgresql'||request.scope!=='master'||request.database!=='platform_master'||manifest?.owner!=='apps/platform'||manifest.repository!=='CODEXSUN/platform'||manifest.version!=='1.0.16'||manifest.tag!=='v-1.0.16'||manifest.imageId!==platformRetirementImage||request.candidateImageId!==manifest.imageId||!/^[a-f0-9]{40}$/.test(manifest.commit??''))throw Error('Retirement recovery must match the approved Platform16 master scope');
 return true;
}
export function validateRetirementRecoveryProof(request,proof){
 if(request.requireIdentityRetirementProof!==true){if(proof.legacyDigest!==undefined||proof.legacyCounts!==undefined)throw Error('Unrequested legacy identity attestation');return proof;}
 if(!sha.test(proof.legacyDigest??'')||!proof.legacyCounts||typeof proof.legacyCounts!=='object'||Array.isArray(proof.legacyCounts)||Object.keys(proof.legacyCounts).length!==platformLegacyTables.length||platformLegacyTables.some(key=>!Number.isSafeInteger(proof.legacyCounts[key])||proof.legacyCounts[key]<0))throw Error('Restored legacy identity attestation missing');
 return proof;
}
export const platformRestoredIdentitySnapshotCode=`
import {Kysely,PostgresDialect,sql} from 'kysely';
import pg from 'pg';
import {legacyIdentitySnapshot} from './src/api/modules/identity/database/migrations/20261120000000_retire_master_identity.ts';
const db=new Kysely({dialect:new PostgresDialect({pool:new pg.Pool({connectionString:'postgres://recovery:disposable-restore-only@127.0.0.1:5432/recovery',connectionTimeoutMillis:5000,statement_timeout:30000})})});
try{const snapshot=await db.transaction().execute(async tx=>{await sql.raw('SET TRANSACTION READ ONLY').execute(tx);await sql.raw("SET LOCAL TIME ZONE 'UTC'").execute(tx);return legacyIdentitySnapshot(tx);});if(!snapshot)throw Error('Restored legacy identity snapshot missing');console.log(JSON.stringify({legacyDigest:snapshot.digest,legacyCounts:snapshot.counts}));}finally{await db.destroy();}
`;
