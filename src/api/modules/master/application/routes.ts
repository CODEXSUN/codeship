import type {createHttpServer} from '@workspace/framework';
import {z} from 'zod';
import {applicationRepository} from './repository.ts';
import type {Database} from '../../../identity.ts';
export function registerApplicationRoutes(app:ReturnType<typeof createHttpServer>,db:Database){const repo=applicationRepository(db);
 const params=z.object({id:z.string().regex(/^[a-z0-9]{8}$/)});
 app.get('/api/v1/applications',()=>repo.list());
 app.post('/api/v1/applications',async(req,reply)=>reply.code(201).send(await repo.save(req.body)));
 app.put('/api/v1/applications/:id',async req=>{const {id}=z.object({id:z.string().regex(/^[a-z0-9]{8}$/)}).parse(req.params);return repo.save(req.body,id);});
 app.get('/api/v1/applications/:id/environment',async(req,reply)=>{reply.header('Cache-Control','no-store').header('Pragma','no-cache');return repo.environment(params.parse(req.params).id);});
 app.post('/api/v1/applications/:id/environment/reveal',async(req,reply)=>{const {key,revision}=z.object({key:z.string().regex(/^[A-Z][A-Z0-9_]{0,127}$/),revision:z.number().int().min(0)}).strict().parse(req.body);reply.header('Cache-Control','no-store').header('Pragma','no-cache');return repo.revealEnvironment(params.parse(req.params).id,key,revision);});
}
