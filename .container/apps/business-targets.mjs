// Reviewed local Docker targets. Credentials and mutable environment stay in SQLite.
export const businessTargets=Object.freeze(Object.fromEntries([
 ['core-app','CORE_APP',4345,4454,true,[]],
 ['billing','BILLING',4335,4455,true,['core-app']],
 ['crm','CRM',4355,4456,false,[]],
 ['ecommerce','ECOMMERCE',4365,4457,true,[]],
 ['hrms','HRMS',4375,4458,false,[]],
 ['automation','AUTOMATION',4395,4459,true,[]],
 ['zetro','ZETRO',4405,4460,true,[]],
 ['texlinks','TEXLINKS',4415,4461,false,[]],
].map(([name,prefix,apiPort,port,database,dependencies])=>[name,Object.freeze({name,prefix,apiPort,port,relayPort:apiPort+10000,database:database?'app_'+name.replaceAll('-','_'):null,dependencies:Object.freeze(dependencies)})])));
export function businessTarget(name){const target=Object.hasOwn(businessTargets,name)?businessTargets[name]:null;if(!target)throw Error('Unsupported managed application.');return target;}
