import {isMetricsCollector} from './metrics-process.ts';
import {mkdir,readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {docker} from '../src/api/modules/business/deployment/adapter.ts';
import {bytes} from '../src/api/modules/business/monitor/adapter.ts';
import {metricCategory} from '../src/api/modules/business/monitor/docker-metrics.ts';
import {databaseFile,appRoot} from '../src/api/database.ts';
import type {DockerMetricSnapshot,DockerMetric} from '../contracts/docker-metrics.ts';
import {containerStorage} from './container-storage.ts';
import {parseDiskUsage} from './disk-usage.ts';
const watch=process.argv.includes('--watch');if(process.argv.slice(2).some(a=>!['--watch','--once'].includes(a)))throw new Error('Use --once or --watch.');
const directory=path.join(appRoot,'.codeship/metrics'),file=path.join(directory,'snapshot.json');await mkdir(directory,{recursive:true,mode:0o700});
let lock:Awaited<ReturnType<typeof open>>|undefined;const lockFile=path.join(directory,'collector.lock');
if(watch){try{const prior=Number(await readFile(lockFile,'utf8'));const running=await isMetricsCollector(prior);if(running)throw new Error('A metrics collector is already running.');await unlink(lockFile);}catch(error){if((error as any).code!=='ENOENT')throw error;}lock=await open(lockFile,'wx',0o600);await lock.writeFile(String(process.pid));}
const lines=(text:string)=>text.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
const number=(value:string)=>{const n=Number.parseFloat(value);return Number.isFinite(n)&&n>=0?n:null;};
const storageCache=new Map<string,{at:number;data:Awaited<ReturnType<typeof containerStorage>>}>();
async function collect(){
 let snapshot:DockerMetricSnapshot;
 try{
  const db=new DatabaseSync(databaseFile(),{readOnly:true});let applications:any[],infrastructure:any[];try{applications=db.prepare('SELECT owner,project,environment FROM applications').all();infrastructure=db.prepare('SELECT kind,project FROM infrastructure_services').all();}finally{db.close();}
  let group:{project:string;services:{key:string}[]}|undefined;try{group=JSON.parse(await readFile(path.join(appRoot,'.codeship/infrastructure-runtime/group.json'),'utf8'));}catch{}
  const listed=lines(await docker(['ps','-a','--format','{{json .}}']));
  const selected=listed.flatMap(row=>{const labels=Object.fromEntries(String(row.Labels??'').split(',').map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)];}));const project=labels['com.docker.compose.project']??'',service=labels['com.docker.compose.service']??'';const scope=metricCategory(project,service,applications,infrastructure,group);return scope&&/^[a-f0-9]{12,64}$/.test(row.ID)?[{...row,...scope,project,service}]:[];});
  const ids=selected.filter(r=>r.State==='running').map(r=>r.ID);
  const stats=ids.length?lines(await docker(['stats','--no-stream','--format','{{json .}}',...ids])):[];
  let engine:DockerMetricSnapshot['engine'];try{engine=JSON.parse(await docker(['info','--format','{"cpus":{{.NCPU}},"memoryBytes":{{.MemTotal}}}']));}catch{}
  const containers:DockerMetric[]=[];
  for(const row of selected){
   const state=JSON.parse(await docker(['inspect','--format','{{json .State}}',row.ID]));
   const restarts=Number(await docker(['inspect','--format','{{.RestartCount}}',row.ID]));
   const stat=stats.find(s=>s.ID===row.ID||row.ID.startsWith(s.ID));
   const pair=(key:string)=>String(stat?.[key]??'').split('/').map(s=>bytes(s.trim()));
   const memory=pair('MemUsage'),network=pair('NetIO'),block=pair('BlockIO');
   let disk={diskUsedBytes:null,diskTotalBytes:null} as ReturnType<typeof parseDiskUsage>;
   if(state.Status==='running')try{disk=parseDiskUsage(await docker(['exec',row.ID,'df','-Pk','/']));}catch{}
   let storage=storageCache.get(row.ID);if(!storage||Date.now()-storage.at>30000){storage={at:Date.now(),data:await containerStorage(row.ID,state.Status==='running',docker)};storageCache.set(row.ID,storage);}
   containers.push({...disk,...storage.data,id:row.ID,name:row.Names,project:row.project,service:row.service,owner:row.owner,category:row.category,state:state.Status,health:state.Health?.Status??'Not configured',image:row.Image,ports:row.Ports??'',startedAt:state.StartedAt??'',restarts,cpuPercent:stat?number(stat.CPUPerc):null,memoryBytes:memory[0]??null,memoryLimitBytes:memory[1]??null,networkRxBytes:network[0]??null,networkTxBytes:network[1]??null,blockReadBytes:block[0]??null,blockWriteBytes:block[1]??null,pids:stat?number(stat.PIDs):null});
  }
  for(const id of storageCache.keys())if(!selected.some(row=>row.ID===id))storageCache.delete(id);
  snapshot={collectedAt:new Date().toISOString(),available:true,engine,containers};
 }catch{snapshot={collectedAt:new Date().toISOString(),available:false,containers:[]};}
 await writeFile(file+'.next',JSON.stringify(snapshot),{mode:0o600});await rename(file+'.next',file);
 console.log(JSON.stringify({at:snapshot.collectedAt,available:snapshot.available,containers:snapshot.containers.length}));
}
let stopped=false;process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});
try{do{await collect();if(!watch)break;await new Promise(resolve=>setTimeout(resolve,5000));}while(!stopped);}finally{if(lock){await lock.close();await unlink(lockFile);}}
