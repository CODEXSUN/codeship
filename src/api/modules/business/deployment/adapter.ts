import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {Action} from '../../../../../contracts/operations.ts';
import {resolveProfile} from '../../master/deployment-target/index.ts';
import {prepareDeploymentEnvironment} from '../../master/application/index.ts';
import type {Database} from '../../../identity.ts';
const execute=promisify(execFile);
export function redact(text:string,secrets:string[]=[]){
 let clean=text.replace(/\u001b\[[0-9;]*[a-zA-Z]/g,'');
 for(const secret of secrets.filter(s=>s.length>=4).sort((a,b)=>b.length-a.length))clean=clean.replaceAll(secret,'[REDACTED]');
 return clean.replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+@/gi,'$1[REDACTED]@').replace(/(authorization\s*[=:]\s*)(?:Bearer|Basic)\s+\S+/gi,'$1[REDACTED]').replace(/((?:password|token|secret|authorization|api[_-]?key)\s*[=:]\s*)\S+/gi,'$1[REDACTED]');
}
export async function runLocal(key:string,action:Action,onLine:(line:string)=>void,db?:Database):Promise<number>{
 const {root,script,envFile,profile,environment:originalEnvironment}=await resolveProfile(key);
 const environment=db&&['deploy','update'].includes(action)?await prepareDeploymentEnvironment(db,profile,envFile):originalEnvironment;
 const secrets=Object.entries(environment).filter(([key])=>/password|token|secret|key/i.test(key)).map(([,v])=>v).filter((v):v is string=>!!v);
 const mode=action==='deploy'?'setup':action==='check'?'update':action;
 const args=[script,mode,'--env',envFile,...(action==='check'?['--check']:[])];
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,args,{cwd:root,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const buffers=new Map<string,string>(),dropping=new Set<string>();let total=0,tailOutput='';
  function consume(channel:string,chunk:string,flush=false){
   let buffer=(buffers.get(channel)??'')+chunk;
   if(dropping.has(channel)){const boundary=buffer.search(/[\r\n]/);if(boundary<0)return;buffer=buffer.slice(boundary+1);dropping.delete(channel);}
   const lines=buffer.split(/[\r\n]/);let tail=flush?'':lines.pop()??'';
   if(tail.length>16384){tail='';dropping.add(channel);lines.push('[Oversized output line omitted]');}buffers.set(channel,tail);
   const batch:string[]=[];
   for(const line of lines){if(!line)continue;const safe=redact(line,secrets).slice(0,2000)+'\n';if(total<200000){total+=safe.length;batch.push(safe);}else tailOutput=(tailOutput+safe).slice(-20000);}
   if(batch.length)onLine(batch.join(''));
  }
  child.stdout.setEncoding('utf8').on('data',chunk=>consume('stdout',chunk));
  child.stderr.setEncoding('utf8').on('data',chunk=>consume('stderr',chunk));
  child.once('error',()=>reject(new Error('Could not launch the registered deployment script.')));
  child.once('close',code=>{for(const channel of ['stdout','stderr'])consume(channel,'',true);if(tailOutput)onLine('\n[Intermediate output omitted; final output follows]\n'+tailOutput);resolve(code??1);});
 });
}
export async function docker(args:string[]){const result=await execute('docker',args,{windowsHide:true,timeout:15000,maxBuffer:1024*1024});return result.stdout;}
