import {appFetch} from '../../platform-client';
import type {InfrastructureInput,InfrastructureService} from '../../../../contracts/infrastructure';
export async function infrastructureRequest<T>(path='',body?:unknown,method='POST'):Promise<T>{const response=await appFetch('/api/v1/infrastructure'+path,{method:body===undefined?'GET':method,headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.message??'Infrastructure request failed.');return result;}
export const infrastructureList=()=>infrastructureRequest<InfrastructureService[]>();
export const saveInfrastructure=(values:InfrastructureInput,id?:string)=>infrastructureRequest<InfrastructureService>(id?'/'+id:'',values,id?'PUT':'POST');
