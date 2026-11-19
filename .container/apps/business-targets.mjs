import {randomBytes} from 'node:crypto';
// Reviewed local Docker targets. Credentials and mutable environment stay in SQLite.
export const businessTargets=Object.freeze(Object.fromEntries([
 ['core-app','CORE_APP',4345,14345,true,[]],
 ['billing','BILLING',4335,14335,true,['core-app']],
 ['crm','CRM',4355,14355,false,[]],
 ['ecommerce','ECOMMERCE',4365,14365,true,[]],
 ['hrms','HRMS',4375,14375,false,[]],
 ['automation','AUTOMATION',4395,14395,true,[]],
 ['zetro','ZETRO',4405,14405,true,[]],
 ['texlinks','TEXLINKS',4415,14415,false,[]],
 ['abconnect','ABCONNECT',4425,14420,true,[]],
].map(([name,prefix,apiPort,port,database,dependencies])=>[name,Object.freeze({name,prefix,apiPort,port,relayPort:apiPort+10000,publishedContainerPort:name==='abconnect'?4420:apiPort,database:database?'app_'+name.replaceAll('-','_'):null,dependencies:Object.freeze(dependencies)})])));
export function businessTarget(name){const target=Object.hasOwn(businessTargets,name)?businessTargets[name]:null;if(!target)throw Error('Unsupported managed application.');return target;}
export function businessServiceProfile(target,service,{token,version,image}){
 if(service.appKey!==target.name)throw Error('Image service manifest identity differs.');
 // This reviewed local suite belongs to the configured Codexsun installation.
 // Database-free native services may omit a pin; production admission must be explicit.
 if(service.tenantCorporateId!==undefined&&service.tenantCorporateId!=='codexsun')throw Error('Review a different tenant deployment profile explicitly.');
 return {manifest:{...service,environment:'production',internalOrigin:'http://127.0.0.1:'+target.apiPort,gatewayEnabled:true,tenantCorporateId:'codexsun'},token,version,image};
}
export function productionServiceToken(saved,native){
 if(!saved||saved===native)return randomBytes(32).toString('hex');
 if(!/^[a-f0-9]{64}$/.test(saved))throw Error('Configure a valid independent production service credential.');
 return saved;
}
