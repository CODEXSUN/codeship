import {businessTarget} from './business-targets.mjs';
export function dockerBrowserOrigins(environment,name){
 const target=businessTarget(name),origin='http://127.0.0.1:'+target.port;
 const next={...environment,[target.prefix+'_WEB_PORT']:String(target.port),[target.prefix+'_WEB_ORIGIN']:origin};
 if(Object.hasOwn(environment,target.prefix+'_PUBLIC_ORIGIN')||['billing','core-app'].includes(name))next[target.prefix+'_PUBLIC_ORIGIN']=origin;
 if(name==='billing')next.BILLING_CORE_PUBLIC_ORIGIN='http://127.0.0.1:'+businessTarget('core-app').port;
 return next;
}
