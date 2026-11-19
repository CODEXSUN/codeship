import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
const execute=promisify(execFile);
export function collectorCommand(command:string){return /(?:^|[\\/"\s])collect-docker-metrics\.ts(?:"|\s|$)/.test(command)&&/(?:^|\s)--watch(?:\s|$)/.test(command);}
export async function isMetricsCollector(pid:number){
 if(!Number.isSafeInteger(pid)||pid<=0)return false;
 try{process.kill(pid,0);}catch(error){return (error as NodeJS.ErrnoException).code==='EPERM';}
 try{
  let command:string;
  if(process.platform==='win32'){const result=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command','(Get-CimInstance Win32_Process -Filter "ProcessId='+pid+'").CommandLine'],{windowsHide:true,timeout:5000,maxBuffer:32768});command=result.stdout;}
  else if(process.platform==='linux')command=(await readFile('/proc/'+pid+'/cmdline','utf8')).replaceAll('\0',' ');
  else command=(await execute('ps',['-p',String(pid),'-o','command='],{timeout:5000,maxBuffer:32768})).stdout;
  return collectorCommand(command);
 }catch{return true;} // Identity unavailable: never clear a potentially live owner.
}
