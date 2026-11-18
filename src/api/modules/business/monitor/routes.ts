import type {createHttpServer} from '@workspace/framework';
type FastifyInstance=ReturnType<typeof createHttpServer>;
import {z} from 'zod';
import {dockerMetricReport} from './docker-metrics.ts';
import type {monitorService} from './service.ts';
export function registerMonitorRoutes(app:FastifyInstance,service:ReturnType<typeof monitorService>){
 app.get('/api/v1/docker-metrics/:category',async(request,reply)=>{reply.header('cache-control','no-store');return dockerMetricReport(z.object({category:z.enum(['infra','apps','devkits'])}).parse(request.params).category);});
 app.get('/api/v1/observations',()=>service.repo.latest());
 app.get('/api/v1/observations/:target',request=>service.repo.history(z.object({target:z.string().regex(/^[a-z0-9]{8}$/)}).parse(request.params).target));
 app.get('/api/v1/incidents',()=>service.repo.incidents());
 app.post('/api/v1/observations',async()=>{if(process.env.CODESHIP_EXECUTION_MODE==='inventory')throw Object.assign(new Error('Use the host Codeship operator for live measurements.'),{statusCode:503});await service.check();return service.repo.latest();});
}
