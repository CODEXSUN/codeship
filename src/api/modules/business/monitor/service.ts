import type {Database} from '../../../identity.ts';
import {monitorRepository} from './repository.ts';
import {targetAccess,resolveProfile} from '../../master/deployment-target/index.ts';
import {observe} from './adapter.ts';
export function monitorService(db:Database,probe=observe,maintenance:()=>Promise<{public_id:string}[]>=async()=>[]){
 const repo=monitorRepository(db);let pending:Promise<void>|undefined;
 async function inspect(){
  const blocked=new Set((await maintenance()).map(t=>t.public_id));
  for(const target of await targetAccess(db).list()){
   if(!target.active||blocked.has(target.public_id))continue;
   const row=await targetAccess(db).find(target.public_id);if(!row)continue;
   let observation;
   try{const {profile}=await resolveProfile(row.profile_key);if(profile.project!==row.project||profile.port!==row.port)throw new Error('Profile changed.');observation=await probe(profile.project,profile.port);}
   catch{observation={healthy:false,latency_ms:0,containers:0,cpu_percent:null,memory_bytes:null,details:'Deployment profile or Docker observation unavailable.'};}
   await repo.record(row.id,observation);
  }
 }
 return {repo,check(){if(!pending)pending=inspect().finally(()=>{pending=undefined;});return pending;},async close(){await pending;}};
}
