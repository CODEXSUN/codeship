import {deploymentRepository} from './repository.ts';
import {targetAccess,resolveProfile} from '../../master/deployment-target/index.ts';
import {runLocal} from './adapter.ts';
import type {Database} from '../../../identity.ts';
import type {Action} from '../../../../../contracts/operations.ts';
export class OperationError extends Error{statusCode:number;constructor(message:string,statusCode=409){super(message);this.statusCode=statusCode;}}
export function deploymentService(db:Database,runner=runLocal){
 const repo=deploymentRepository(db),targets=targetAccess(db),pending=new Set<Promise<unknown>>();let closing=false;
 return {repo,
 async start(targetCode:string,action:Action,key:string,approved:boolean){
  if(process.env.CODESHIP_EXECUTION_MODE==='inventory')throw new OperationError('Use the host Codeship operator for deployment. This isolated container has no host Docker authority.',503);
  if(closing)throw new OperationError('Codeship is shutting down.',503);
  if(!approved)throw new OperationError('Explicit approval is required for this operation.',403);
  const target=await targets.find(targetCode);if(!target)throw new OperationError('Deployment target not found.',404);
  const previous=await repo.byKey(key);if(previous){if(previous.target_id!==target.id||previous.action!==action)throw new OperationError('Retry key belongs to a different operation.');return repo.find(previous.public_id);}
  const {profile}=await resolveProfile(target.profile_key);
  if(profile.project!==target.project||profile.port!==target.port||profile.owner!==target.owner)throw new OperationError('Profile changed. Review its registration before executing.');
  let run;try{run=await repo.create(target.id,action,key);}catch(error){const existing=await repo.byKey(key);if(existing&&existing.target_id===target.id&&existing.action===action)return repo.find(existing.public_id);if(((error as {code?:string}).code==='23505'||/UNIQUE constraint failed/.test((error as Error).message)))throw new OperationError('A deployment is already running for this target.');throw error;}
  const work=(async()=>{let queue=Promise.resolve();try{const code=await runner(target.profile_key,action,line=>{queue=queue.then(()=>repo.append(run.public_id,line)).then(()=>{});},db);await queue;await repo.finish(run.public_id,code===0?'succeeded':'failed',code);}catch{await queue.catch(()=>{});await repo.append(run.public_id,'Operation failed. Inspect the app-owned deployment logs and retained backup.\n');await repo.finish(run.public_id,'failed',1);}})();
  pending.add(work);void work.catch(()=>{}).finally(()=>pending.delete(work));return repo.find(run.public_id);
 },async close(){closing=true;await Promise.allSettled([...pending]);},
 };
}
