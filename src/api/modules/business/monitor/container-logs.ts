import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {appRoot} from '../../../database.ts';
import {dockerMetricReport} from './docker-metrics.ts';
import type {MetricCategory} from '../../../../../contracts/docker-metrics.ts';
import type {ContainerLogReport} from '../../../../../contracts/container-logs.ts';
const cache=z.object({collectedAt:z.iso.datetime(),containers:z.array(z.object({id:z.string().regex(/^[a-f0-9]{12,64}$/),category:z.enum(['infra','apps','devkits']),available:z.boolean(),text:z.string().max(24000)}).strict()).max(100)}).strict();
export async function containerLogReport(category:MetricCategory,id:string,metricFile=process.env.CODESHIP_METRICS_FILE??path.join(appRoot,'.codeship/metrics/snapshot.json'),now=Date.now()):Promise<ContainerLogReport>{
 const report=await dockerMetricReport(category,metricFile,now),row=report.containers.find(row=>row.id===id);if(!row)throw Object.assign(new Error('Registered container not found in this category.'),{statusCode:404});
 const empty={containerId:id,name:row.name,collectedAt:'',available:false,stale:true,text:'',tail:100};
 try{const raw=await readFile(path.join(path.dirname(metricFile),'logs.json'),'utf8');if(Buffer.byteLength(raw)>4*1024*1024)return empty;const data=cache.parse(JSON.parse(raw)),entry=data.containers.find(entry=>entry.id===id&&entry.category===category),age=now-Date.parse(data.collectedAt);const stale=report.stale||!report.available||age>45000||age< -5000;if(!entry||!entry.available||stale)return {...empty,collectedAt:data.collectedAt};return {...empty,collectedAt:data.collectedAt,available:true,stale:false,text:entry.text};}catch{return empty;}
}
