import type {DockerMetricReport} from '../../../../contracts/docker-metrics';
type Sample={at:string;cpu:number|null;memory:number|null};
export type MetricSamples=Record<string,Sample[]>;
/** Retain only genuine, contiguous fresh observations, bounded to 60 per container. */
export function appendMetricSamples(previous:MetricSamples,report:DockerMetricReport):MetricSamples{
 if(!report.available||report.stale)return previous;
 const next:MetricSamples={};
 for(const row of report.containers){
  const prior=previous[row.id]??[],last=prior.at(-1);
  const delta=last?Date.parse(report.collectedAt)-Date.parse(last.at):Infinity;
  if(delta<=0){next[row.id]=prior;continue;}
  const contiguous=delta<=35000?prior:[];
  next[row.id]=[...contiguous,{at:report.collectedAt,cpu:row.cpuPercent,memory:row.memoryBytes===null?null:row.memoryBytes/1048576}].slice(-60);
 }
 return next;
}
