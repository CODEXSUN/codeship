import {parseEnv} from 'node:util';
import {accountPrefixes,installationUsers,serializeDeploymentEnvironment,isProtectedEnvironmentKey} from './accounts.ts';
import type {EnvironmentVariable} from '../../../../../contracts/application.ts';
export function currentEnvironment(secrets:Record<string,string>){
 const values={...parseEnv(secrets.sourceEnv??''),...parseEnv(secrets.env??'')};
 for(const user of installationUsers(secrets)){const prefix=accountPrefixes[user.role];for(const [suffix,value]of [['USERNAME',user.username],['EMAIL',user.email],['NAME',user.name]])if(value||prefix+'_'+suffix in values)values[prefix+'_'+suffix]=value;const password=secrets[user.role+'Password'];if(password!==undefined)values[prefix+'_PASSWORD']=password;}
 return values as Record<string,string>;
}
export function secretEnvironmentValue(key:string,value:string){
 if(/PASSWORD|PASSWD|SECRET|TOKEN|KEY|CREDENTIAL|AUTH|DSN|DATABASE_URL|PRIVATE/i.test(key)||/:\/\/[^/\s]*@/.test(value)||/-----BEGIN|^eyJ[A-Za-z0-9_-]+\./.test(value))return true;
 return !(/^NODE_ENV$/.test(key)||/_(?:HOST|PORT|USER|USERNAME|EMAIL|NAME|VERSION|IMAGE|LEVEL|SCHEMA|MODE|ROOT|DIR|PATH|ORIGIN|TIMEOUT_MS|ENABLED|FRESH|SEED|CONFIRM|ID)$/.test(key));
}
export function environmentRows(secrets:Record<string,string>):EnvironmentVariable[]{return Object.entries(currentEnvironment(secrets)).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>{const secret=secretEnvironmentValue(key,value);return {key,value:secret?null:value,secret,hasValue:value!==''};});}
export function updateEnvironment(secrets:Record<string,string>,changes:Record<string,string>,environment:string){
 if(!Object.keys(changes).length)return secrets;
 const values={...currentEnvironment(secrets),...changes};
 const users=installationUsers(secrets).map(({hasPassword,...user})=>user);
 for(const user of users){const prefix=accountPrefixes[user.role];for(const [suffix,field]of [['USERNAME','username'],['EMAIL','email'],['NAME','name']] as const)if(prefix+'_'+suffix in changes)user[field]=changes[prefix+'_'+suffix];if(prefix+'_PASSWORD' in changes)secrets[user.role+'Password']=changes[prefix+'_PASSWORD'];}
 secrets.users=JSON.stringify(users);secrets.sourceEnv=serializeDeploymentEnvironment(values);
 const managed=Object.fromEntries(Object.entries(values).filter(([key])=>environment!=='local-docker'||!isProtectedEnvironmentKey(key)));
 secrets.env=serializeDeploymentEnvironment(managed);return secrets;
}
