import {writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {openDatabase,databaseFile} from '../src/api/database.ts';
import {decryptSecrets} from '../src/api/modules/master/application/vault.ts';
import {deploymentEnvironment,serializeDeploymentEnvironment} from '../src/api/modules/master/application/accounts.ts';
// Fixed local target identity; no public secret-export endpoint or arbitrary output path.
const {db}=openDatabase();try{
 const row=await db.selectFrom('applications').selectAll().where('owner','=','devkit/codeship').where('project','=',process.env.CODESHIP_DEPLOYMENT_PROJECT??'codeship').where('environment','=','local-docker').executeTakeFirst();
 const secrets=row?.encrypted_secrets?decryptSecrets(row.public_id,row.encrypted_secrets):{};
 const output=path.join(path.dirname(databaseFile()),'runtime.env');
 writeFileSync(output+'.next',serializeDeploymentEnvironment(deploymentEnvironment(secrets)),{mode:0o600});renameSync(output+'.next',output);
 console.log('Saved registry settings materialized into private deployment .env; values omitted.');
}finally{await db.destroy();}
