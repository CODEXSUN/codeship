import {readFile,writeFile,rename,access} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import type {Database} from '../../../identity.ts';
import {decryptSecrets} from './vault.ts';
import {deploymentEnvironment,serializeDeploymentEnvironment} from './accounts.ts';
export async function prepareDeploymentEnvironment(db:Database,profile:{owner:string;project:string;port:number},envFile:string){
 const current=parseEnv(await readFile(envFile,'utf8'));
 const row=await db.selectFrom('applications').selectAll().where('owner','=',profile.owner).where('project','=',profile.project).where('environment','=','local-docker').executeTakeFirst();
 if(!row?.encrypted_secrets)return current;
 if(row.port!==profile.port)throw new Error('Registry port differs from the approved deployment profile.');
 try{await access(envFile+'.lock');throw new Error('Deployment is already locked.');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 const settings=deploymentEnvironment(decryptSecrets(row.public_id,row.encrypted_secrets));
 const values={...current,...settings};
 if(values.COMPOSE_PROJECT_NAME!==profile.project||Number(values.HOST_PORT)!==profile.port)throw new Error('Approved deployment identity changed.');
 await writeFile(envFile+'.registry-next',serializeDeploymentEnvironment(values),{mode:0o600,flag:'wx'});await rename(envFile+'.registry-next',envFile);return values;
}
