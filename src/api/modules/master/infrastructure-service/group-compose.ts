import path from 'node:path';
export function groupCompose(entries:{key:string;definition:any;file:string;extraMounts?:{name:string;target:string}[]}[]){
 const result:any={name:'codebiz-infra',services:{},volumes:{},secrets:{}};
 for(const entry of entries){
  const definition=structuredClone(entry.definition),prefix=entry.key.replaceAll('-','_');
  const service=Object.values(definition.services)[0] as any;
  for(const [key,value]of Object.entries(definition.volumes??{}) as [string,any][])result.volumes[prefix+'_'+key]={name:value.name,external:true};
  service.volumes=(service.volumes??[]).map((volume:any)=>typeof volume==='string'?prefix+'_'+volume: {...volume,source:prefix+'_'+volume.source});
  for(const mount of entry.extraMounts??[]){const key=prefix+'_retained_'+Object.keys(result.volumes).length;result.volumes[key]={name:mount.name,external:true};service.volumes.push({type:'volume',source:key,target:mount.target});}
  for(const [key,value]of Object.entries(definition.secrets??{}) as [string,any][])result.secrets[prefix+'_'+key]={...value,file:path.resolve(path.dirname(entry.file),value.file)};
  service.secrets=(service.secrets??[]).map((secret:any)=>typeof secret==='string'?{source:prefix+'_'+secret,target:secret}:{...secret,source:prefix+'_'+secret.source});
  result.services[entry.key]=service;
 }
 if(!Object.keys(result.secrets).length)delete result.secrets;
 return result;
}
