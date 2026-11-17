import type {createHttpServer} from '@workspace/framework';
type FastifyInstance=ReturnType<typeof createHttpServer>;
import {z} from 'zod';
import {profiles,resolveProfile} from './service.ts';
import {targetRepository} from './repository.ts';
import type {Database} from '../../../identity.ts';
export function registerTargetRoutes(app:FastifyInstance,db:Database){
 const repo=targetRepository(db);
 app.get('/api/v1/targets',()=>repo.list());
 app.get('/api/v1/target-candidates',async()=> (await profiles()).map(({envFile,...publicProfile})=>publicProfile));
 app.post('/api/v1/targets',async(request,reply)=>{
  const body=z.object({key:z.string().max(64)}).strict().parse(request.body);
  const {profile}=await resolveProfile(body.key);return reply.code(201).send(await repo.register(profile));
 });
}
