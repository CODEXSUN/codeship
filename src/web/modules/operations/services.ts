import {appFetch} from '../../platform-client';
import type {Candidate,Target,Run,Observation,Incident,Action} from '../../../../contracts/operations';
export async function request<T>(path:string,body?:unknown):Promise<T>{
 const response=await appFetch('/api/v1/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw new Error(data.message??'Request failed.');return data;
}
export async function snapshot(){const [targets,runs,observations,incidents,candidates,capabilities]=await Promise.all([request<Target[]>('targets'),request<Run[]>('deployments'),request<Observation[]>('observations'),request<Incident[]>('incidents'),request<Candidate[]>('target-candidates'),request<{execution:boolean;mode:string}>('capabilities')]);return {targets,runs,observations,incidents,candidates,capabilities};}
export const startRun=(target:string,action:Action,requestKey:string)=>request<Run>('deployments',{target,action,requestKey,approved:true});
