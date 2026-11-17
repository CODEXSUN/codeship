import {performance} from 'node:perf_hooks';
import {docker} from '../deployment/adapter.ts';
export function bytes(value:string){const match=value.trim().match(/^([\d.]+)\s*(B|kB|KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/);if(!match)return null;const exponent=({B:0,kB:1,KB:1,MB:2,GB:3,TB:4,KiB:1,MiB:2,GiB:3,TiB:4} as Record<string,number>)[match[2]];return Math.round(Number(match[1])*(match[2].includes('i')?1024:1000)**exponent);}
export async function observe(project:string,port:number){
 const started=performance.now();let healthy=false,details='Health endpoint unavailable.';
 try{const response=await fetch(`http://127.0.0.1:${port}/api/health`,{redirect:'error',signal:AbortSignal.timeout(3000)});healthy=response.status===200;details=`Health HTTP ${response.status}.`;await response.body?.cancel();}catch{}
 const latency_ms=Math.round(performance.now()-started);let containers=0,cpu_percent:number|null=null,memory_bytes:number|null=null;
 try{const rows=(await docker(['ps','-a','--filter',`label=com.docker.compose.project=${project}`,'--format','{{json .}}'])).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
  containers=rows.length;const ready=rows.filter(row=>row.State==='running'&&!/unhealthy|health: starting/.test(row.Status));healthy=healthy&&rows.length>0&&ready.length===rows.length;details+=` ${ready.length}/${rows.length} containers running and ready.`;
  const ids=rows.filter(row=>row.State==='running').map(row=>String(row.ID)).filter(id=>/^[0-9a-f]{12,64}$/.test(id));
  if(ids.length){const stats=(await docker(['stats','--no-stream','--format','{{json .}}',...ids])).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));cpu_percent=stats.reduce((sum,row)=>sum+Number.parseFloat(row.CPUPerc),0);const memory=stats.map(row=>bytes(String(row.MemUsage).split('/')[0]));memory_bytes=memory.every(n=>n!==null)?memory.reduce((sum,n)=>sum!+n!,0):null;}
 }catch{healthy=false;details+=' Docker metrics unavailable.';}
 return {healthy,latency_ms,containers,cpu_percent,memory_bytes,details};
}
