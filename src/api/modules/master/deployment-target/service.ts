import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {z} from 'zod';
import {appRoot,workspaceRoot} from '../../../database.ts';
export const profileSchema=z.object({key:z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),name:z.string().min(1).max(100),owner:z.string().regex(/^(apps|devkit)\/[a-z][a-z0-9-]+$/),envFile:z.string().regex(/^\.[a-z0-9-]+\/docker\/[a-z0-9.-]+\.env$/),project:z.string().regex(/^[a-z][a-z0-9-]{2,40}$/),port:z.number().int().min(1024).max(65535)}).strict();
export type Profile=z.infer<typeof profileSchema>;
export async function profiles():Promise<Profile[]>{
 const result=z.array(profileSchema).max(100).parse(JSON.parse(await readFile(path.join(appRoot,'.codeship/targets.json'),'utf8')));
 if(new Set(result.map(p=>p.key)).size!==result.length)throw new Error('Duplicate deployment profile.');
 return result;
}
async function contained(file:string,root:string){const resolved=await realpath(file);if(!resolved.startsWith(root+path.sep))throw new Error('Deployment path leaves its owner.');return resolved;}
export async function resolveProfile(key:string){
 const profile=(await profiles()).find(p=>p.key===key);if(!profile)throw new Error('Deployment profile is not registered by the operator.');
 const root=await contained(path.join(workspaceRoot,profile.owner),await realpath(workspaceRoot));
 const script=await contained(path.join(root,'.container/deploy.mjs'),root);
 const envFile=await contained(path.join(root,profile.envFile),root);
 const environment=parseEnv(await readFile(envFile,'utf8'));
 if(environment.COMPOSE_PROJECT_NAME!==profile.project||Number(environment.HOST_PORT)!==profile.port)throw new Error('Deployment identity differs from its approved profile.');
 return {profile,root,script,envFile,environment};
}
