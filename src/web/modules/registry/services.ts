import {appFetch} from '../../platform-client';
import type {ManagedApplication,ApplicationInput,ApplicationEnvironment} from '../../../../contracts/application';
export async function registryRequest<T>(path='',body?:ApplicationInput,id?:string):Promise<T>{const response=await appFetch('/api/v1/applications'+path,{method:body?(id?'PUT':'POST'):'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw new Error(data.message??'Unable to save application.');return data;}
export const listApplications=()=>registryRequest<ManagedApplication[]>();
export const loadApplicationEnvironment=(id:string)=>registryRequest<ApplicationEnvironment>('/'+id+'/environment');
export async function revealEnvironmentValue(id:string,key:string,revision:number){const response=await appFetch('/api/v1/applications/'+id+'/environment/reveal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,revision}),cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.message??'Unable to show this value.');return String(result.value);}
