import {applicationInput} from '../../src/api/modules/master/application/service.ts';
import {platformTarget} from './platform-target.mjs';
import {installationUsers,serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
export function platformRegistration(env:Record<string,string>,version:string){
 const serialized=serializeDeploymentEnvironment(env);
 return applicationInput.parse({name:'Platform',owner:'apps/platform',project:'applications',environment:'local-docker',host:'127.0.0.1',port:platformTarget.port,version,username:'',notes:'CodeShip-managed tagged local Docker release; independent database copy',users:installationUsers({env:serialized}).map(({hasPassword,...user})=>user),secrets:{env:serialized}});
}
