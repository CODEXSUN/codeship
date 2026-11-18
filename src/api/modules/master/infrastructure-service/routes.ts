import {mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import type {createHttpServer} from '@workspace/framework';
import type {Database} from '../../../identity.ts';
import {databaseFile} from '../../../database.ts';
import {decryptSecrets} from '../application/vault.ts';
import {serializeDeploymentEnvironment} from '../application/accounts.ts';
import {infrastructureRepository} from './repository.ts';
import {infrastructureEnvironment,infrastructureNetwork} from './service.ts';
import {fileManagerDefinition} from './file-manager.ts';
export function registerInfrastructureRoutes(app:ReturnType<typeof createHttpServer>,db:Database){const repo=infrastructureRepository(db),idSchema=z.object({id:z.string().regex(/^[a-z0-9]{8}$/)});
 app.get('/api/v1/infrastructure',()=>repo.list());
 app.post('/api/v1/infrastructure',async(req,reply)=>reply.code(201).send(await repo.save(req.body)));
 app.put('/api/v1/infrastructure/:id',req=>repo.save(req.body,idSchema.parse(req.params).id));
 app.post('/api/v1/infrastructure/:id/prepare',async req=>{const {id}=idSchema.parse(req.params),{purpose,revision}=z.object({purpose:z.enum(['install','maintenance']),revision:z.number().int().min(0)}).strict().parse(req.body);const row=await repo.find(id);if(!row)throw Object.assign(new Error('Infrastructure service not found.'),{statusCode:404});if(row.revision!==revision)throw Object.assign(new Error('Service changed. Reload before preparing.'),{statusCode:409});
 const secrets=row.encrypted_secrets?decryptSecrets(id,row.encrypted_secrets):{},values=infrastructureEnvironment(row,secrets,purpose);
 const definition=row.kind==='file-manager'&&purpose==='install'?fileManagerDefinition(row,secrets.password??String(values.MEDIA_ADMIN_PASSWORD??'')):null;
 const network=infrastructureNetwork(row);
 const directory=path.join(path.dirname(databaseFile()),'infrastructure',id);await mkdir(directory,{recursive:true,mode:0o700});const file=path.join(directory,purpose+'.env'),temporary=file+'.'+randomBytes(6).toString('hex');await writeFile(temporary,serializeDeploymentEnvironment(values),{mode:0o600,flag:'wx'});await rename(temporary,file);
 const policyFile=path.join(directory,purpose+'.network.json'),policyNext=policyFile+'.'+randomBytes(6).toString('hex');await writeFile(policyNext,JSON.stringify(network,null,2)+'\n',{mode:0o600,flag:'wx'});await rename(policyNext,policyFile);
 if(definition){const output=path.join(directory,'install.compose.json'),next=output+'.'+randomBytes(6).toString('hex');await writeFile(next,JSON.stringify(definition,null,2)+'\n',{mode:0o600,flag:'wx'});await rename(next,output);}
 return {prepared:true,purpose,revision:row.revision,artifact:'infrastructure/'+id+'/'+purpose+'.env',message:'Private environment prepared. No service was installed or restarted.'};
 });
}
