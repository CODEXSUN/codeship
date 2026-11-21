import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import type {MetricCategory,DockerMetricReport} from '../../../../../contracts/docker-metrics.ts';
import {appRoot} from '../../../database.ts';
const nullable=z.number().finite().nonnegative().nullable();
const metric=z.object({id:z.string(),name:z.string(),project:z.string(),service:z.string(),owner:z.string(),category:z.enum(['infra','apps','devkits']),state:z.string(),health:z.string(),image:z.string(),ports:z.string(),startedAt:z.string(),restarts:z.number().int().nonnegative(),cpuPercent:nullable,memoryBytes:nullable,memoryLimitBytes:nullable,networkRxBytes:nullable,networkTxBytes:nullable,blockReadBytes:nullable,blockWriteBytes:nullable,pids:nullable,writableBytes:nullable.optional(),volumeBytes:nullable.optional(),storageBytes:nullable.optional(),storageMeasuredAt:z.iso.datetime().optional(),diskUsedBytes:nullable.optional(),diskTotalBytes:nullable.optional()}).strict();
const snapshot=z.object({collectedAt:z.iso.datetime(),available:z.boolean(),engine:z.object({cpus:z.number().int().positive(),memoryBytes:z.number().positive()}).strict().optional(),containers:z.array(metric).max(1000)}).strict();
export function metricCategory(project:string,service:string,applications:{owner:string;project:string;environment:string}[],infrastructure:{kind:string;project:string}[],group?:{project:string;services:{key:string}[]}){
 if(group?.project===project&&group.services.some(r=>r.key===service))return {category:'infra' as const,owner:'infrastructure/'+service};
 const infra=infrastructure.find(r=>r.project===project&&(r.kind==='file-manager'?'filemanager':r.kind)===service);
 if(infra)return {category:'infra' as const,owner:'infrastructure/'+infra.kind};
 const candidates=applications.filter(r=>r.project===project&&['local-docker','vps'].includes(r.environment)&&/^(apps|devkit)\//.test(r.owner));
 const app=candidates.find(r=>r.owner.split('/')[1]===service)??(candidates.length===1?candidates[0]:undefined);
 return app?{category:app.owner.startsWith('apps/')?'apps' as const:'devkits' as const,owner:app.owner}:null;
}
export async function dockerMetricReport(category:MetricCategory,file=process.env.CODESHIP_METRICS_FILE??path.join(appRoot,'.codeship/metrics/snapshot.json'),now=Date.now()):Promise<DockerMetricReport>{
 try{const text=await readFile(file,'utf8');if(Buffer.byteLength(text)>1024*1024)throw new Error('Snapshot too large.');const data=snapshot.parse(JSON.parse(text));const age=now-Date.parse(data.collectedAt);return {...data,category,stale:age>45000||age< -5000,containers:data.containers.filter(r=>r.category===category)};}
 catch{return {category,collectedAt:'',available:false,stale:true,containers:[]};}
}
