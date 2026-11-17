import type {createHttpServer} from '@workspace/framework';
type FastifyInstance=ReturnType<typeof createHttpServer>;
import {z} from 'zod';
import type {monitorService} from './service.ts';
export function registerMonitorRoutes(app:FastifyInstance,service:ReturnType<typeof monitorService>){
 app.get('/api/v1/observations',()=>service.repo.latest());
 app.get('/api/v1/observations/:target',request=>service.repo.history(z.object({target:z.string().regex(/^[a-z0-9]{8}$/)}).parse(request.params).target));
 app.get('/api/v1/incidents',()=>service.repo.incidents());
 app.post('/api/v1/observations',async()=>{await service.check();return service.repo.latest();});
}
