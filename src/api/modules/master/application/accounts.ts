import {parseEnv} from 'node:util';
import {accountRoles,type InstallationUser} from '../../../../../contracts/application.ts';
export const accountPrefixes={sa:'SUPER_ADMIN',admin:'TENANT_ADMIN',user:'TENANT_USER'} as const;
export function installationUsers(secrets:Record<string,string>):InstallationUser[]{
 const env=parseEnv(secrets.env??''),saved:InstallationUser[]=secrets.users?JSON.parse(secrets.users):[];
 return accountRoles.map(role=>{const prefix=accountPrefixes[role],user=saved.find(u=>u.role===role);return {role,username:user?.username??env[prefix+'_USERNAME']??'',email:user?.email??env[prefix+'_EMAIL']??'',name:user?.name??env[prefix+'_NAME']??'',hasPassword:!!(secrets[role+'Password']||env[prefix+'_PASSWORD'])};});
}
export const isProtectedEnvironmentKey=(key:string)=>/^(?:NODE_|LD_|DYLD_|DOCKER_|COMPOSE_|CODESHIP_(?:HOST|PORT|BIND_MODE|DOCKER_PEERS|EXECUTION_MODE|SQLITE_FILE|VAULT_KEY_FILE)|PATH$|HOME$|SHELL$|HOST_PORT$)/.test(key);
export function deploymentEnvironment(secrets:Record<string,string>){
 const values=parseEnv(secrets.env??'');for(const key of Object.keys(values)){if(isProtectedEnvironmentKey(key))throw new Error('Saved environment contains a protected runtime setting.');}
 for(const user of installationUsers(secrets)){const prefix=accountPrefixes[user.role];for(const [suffix,value]of [['USERNAME',user.username],['EMAIL',user.email],['NAME',user.name]])if(value)values[prefix+'_'+suffix]=value;const password=secrets[user.role+'Password'];if(password)values[prefix+'_PASSWORD']=password;}
 return values;
}
export function serializeDeploymentEnvironment(values:Record<string,string|undefined>){return Object.entries(values).map(([key,value])=>{
 if(!/^[A-Z][A-Z0-9_]*$/.test(key)||value===undefined||/[\r\n\0]/.test(value))throw Object.assign(new Error('Environment values require uppercase keys and single-line values.'),{statusCode:400});
 for(const encoded of ["'"+value+"'",'"'+value+'"','`'+value+'`',value]){const line=key+'='+encoded;if(parseEnv(line+'\n')[key]===value)return line;}
 throw Object.assign(new Error('An environment value contains a quote combination unsupported by the runtime .env parser.'),{statusCode:400});
 }).join('\n')+'\n';}
