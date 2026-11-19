import type {DockerMetric} from '../../../../contracts/docker-metrics';
import type {ManagedApplication} from '../../../../contracts/application';
export function browserUrl(host:string,port:number|null):string|null{
 try{const url=new URL(/^https?:\/\//i.test(host)?host:'http://'+host);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;if(port!==null){if(!Number.isInteger(port)||port<1||port>65535)return null;url.port=String(port);}if(['0.0.0.0','[::]'].includes(url.hostname))url.hostname='127.0.0.1';url.search='';url.hash='';return url.href;}catch{return null;}
}
export function metricAppUrl(row:DockerMetric,record?:Pick<ManagedApplication,'host'|'port'>):string|null{
 const published=/(?:^|,\s*)(\[[a-fA-F0-9:]+\]|[a-zA-Z0-9_.-]+):(\d+)->\d+\/tcp/.exec(row.ports);
 const actual=published?browserUrl(published[1],Number(published[2])):null;
 if(record){const configured=browserUrl(record.host,record.port);if(configured){const host=new URL(configured).hostname;return ['127.0.0.1','localhost','0.0.0.0','[::]'].includes(host)?actual??configured:configured;}}
 return actual;
}
export function storagePercent(row:Pick<DockerMetric,'storageBytes'|'diskTotalBytes'>):number|null{
 const used=row.storageBytes,total=row.diskTotalBytes;return used!=null&&Number.isFinite(used)&&used>=0&&total!=null&&Number.isFinite(total)&&total>0?Math.min(100,used/total*100):null;
}
