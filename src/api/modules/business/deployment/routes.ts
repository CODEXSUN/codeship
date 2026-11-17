import type {createHttpServer} from '@workspace/framework';
type FastifyInstance=ReturnType<typeof createHttpServer>;
import {z} from 'zod';
import {actions} from '../../../../../contracts/operations.ts';
import type {deploymentService} from './service.ts';
export function registerDeploymentRoutes(app:FastifyInstance,service:ReturnType<typeof deploymentService>){
 app.get('/api/v1/deployments',()=>service.repo.list());
 app.get('/api/v1/deployments/:id',async(request,reply)=>{const {id}=z.object({id:z.string().regex(/^[a-z0-9]{8}$/)}).parse(request.params);const row=await service.repo.find(id);return row??reply.code(404).send({message:'Deployment not found.'});});
 app.post('/api/v1/deployments',async(request,reply)=>{const body=z.object({target:z.string().regex(/^[a-z0-9]{8}$/),action:z.enum(actions),requestKey:z.uuid(),approved:z.literal(true)}).strict().parse(request.body);return reply.code(202).send(await service.start(body.target,body.action,body.requestKey,body.approved));});
}
