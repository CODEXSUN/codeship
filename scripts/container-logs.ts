import {parseEnv} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {databaseFile} from '../src/api/database.ts';
import {decryptSecrets} from '../src/api/modules/master/application/vault.ts';
import {docker,dockerLogTail,redact} from '../src/api/modules/business/deployment/adapter.ts';
import type {MetricCategory} from '../contracts/docker-metrics.ts';
import {publishMetricSnapshot} from './metrics-publication.ts';
export function secretValues(values:Record<string,string|undefined>):string[]{
 const result:string[]=[];for(const [key,value]of Object.entries(values)){if(!value)continue;if(/(?:password|token|secret|sshKey|private_key|api_key|_key|database_url|redis_url|dsn)$/i.test(key)&&!/(?:^|_)(?:REQUIRE|ENABLE|DISABLE|USE)_/i.test(key))result.push(value,...value.split(/\r?\n/).filter(line=>line.length>=8));try{const url=new URL(value);if(url.password)result.push(url.password,decodeURIComponent(url.password));}catch{}}return result;
}
export function sanitizeLog(text:string,secrets:string[]){
 let clean=redact(text,secrets).replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g,'').replace(/[\x00-\x08\x0b-\x1f\x7f]/g,'');
 for(const value of [...new Set(secrets)].filter(Boolean).sort((a,b)=>b.length-a.length)){for(const secret of new Set([value,encodeURIComponent(value),encodeURIComponent(value).replace(/[!'()*]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase()),JSON.stringify(value).slice(1,-1)]))clean=clean.replaceAll(secret,'[REDACTED]');}
 clean=clean.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g,'[REDACTED PRIVATE KEY]');
 clean=clean.replace(/(["']?(?:password|token|secret|authorization|cookie|api[_-]?key)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'[^']*'|[^\s,;}]+)/gi,'$1[REDACTED]').replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/=-]+/gi,'[REDACTED AUTHORIZATION]').replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[REDACTED TOKEN]');
 clean=clean.replace(/([a-z][a-z0-9+.-]{0,31}:\/\/[^:\s/]+:)[^@\s]+@/gi,'$1[REDACTED]@').replace(/\b[A-Za-z0-9+/]{48,}={0,2}\b/g,'[REDACTED LONG TOKEN]');
 return clean.slice(-24000);
}
const environmentSecrets=new Map<string,string[]>();
export async function collectContainerLogs(selected:{ID:string;category:MetricCategory}[],directory:string){
 const collectedAt=new Date().toISOString();let containers:any[]=[];
 try{const db=new DatabaseSync(databaseFile(),{readOnly:true});let secrets:string[]=[];try{for(const table of ['applications','infrastructure_services'])for(const row of db.prepare('SELECT public_id,encrypted_secrets FROM '+table+' WHERE encrypted_secrets IS NOT NULL').all() as any[]){const saved=decryptSecrets(row.public_id,row.encrypted_secrets);secrets.push(...secretValues(saved));if(saved.env)secrets.push(...secretValues(parseEnv(saved.env)));}}finally{db.close();}
 const pending=selected.slice(0,100).filter(row=>/^[a-f0-9]{12,64}$/.test(row.ID));for(const id of environmentSecrets.keys())if(!pending.some(row=>row.ID===id))environmentSecrets.delete(id);let next=0;const result:any[]=[];await Promise.all(Array.from({length:Math.min(4,pending.length)},async()=>{while(next<pending.length){const row=pending[next++];try{let values=environmentSecrets.get(row.ID);if(!values){const env=JSON.parse(await docker(['inspect','--format','{{json .Config.Env}}',row.ID]));values=secretValues(Object.fromEntries((env??[]).map((entry:string)=>{const i=entry.indexOf('=');return [entry.slice(0,i),entry.slice(i+1)];})));environmentSecrets.set(row.ID,values);}const text=sanitizeLog(await dockerLogTail(row.ID),[...secrets,...values]);result.push({id:row.ID,category:row.category,available:true,text});}catch{result.push({id:row.ID,category:row.category,available:false,text:''});}}}));containers=result;
 }catch{}
 const file=path.join(directory,'logs.json');await publishMetricSnapshot(file,JSON.stringify({collectedAt,containers}));
}
