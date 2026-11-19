import {isMetricsCollector} from './metrics-process.ts';
import {spawn} from 'node:child_process';
import {mkdir,open,readFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {appRoot} from '../src/api/database.ts';
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export async function ensureMetricsCollector(){
 if(process.env.CODESHIP_EXECUTION_MODE==='inventory')return;
 const directory=path.join(appRoot,'.codeship/metrics');await mkdir(directory,{recursive:true,mode:0o700});
 const pidFile=path.join(directory,'collector.lock');
 async function running(){try{return await isMetricsCollector(Number(await readFile(pidFile,'utf8')));}catch{return false;}}
 if(await running())return;
 const launchFile=path.join(directory,'launcher.lock');let lock;
 try{lock=await open(launchFile,'wx',0o600);}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')return;throw error;}
 try{
  if(await running())return;
  const out=await open(path.join(directory,'collector.log'),'a',0o600),err=await open(path.join(directory,'collector-error.log'),'a',0o600);
  try{
   const child=spawn(process.execPath,[path.join(appRoot,'scripts/collect-docker-metrics.ts'),'--watch'],{cwd:appRoot,windowsHide:true,detached:true,stdio:['ignore',out.fd,err.fd],env:process.env});
   await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
  }finally{await out.close();await err.close();}
  for(let attempt=0;attempt<50;attempt++){if(await running())return;await pause(100);}
  throw new Error('Metrics collector did not start; inspect the private collector error log.');
 }finally{await lock.close();await unlink(launchFile);}
}
