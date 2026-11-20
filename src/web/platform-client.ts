import {createPlatformDirectBrowserClient} from '@workspace/sdk/platform-direct-browser';
import {withLoginRoute} from './login-route';
const client=createPlatformDirectBrowserClient('codeship');
export const platform=withLoginRoute(client,window.location,()=>{window.history.replaceState(null,'','/');window.dispatchEvent(new PopStateEvent('popstate'));});
let enabled=false;export function enablePlatform(value:boolean){enabled=value;}
export const appFetch:typeof fetch=(input,options)=>enabled&&typeof input==='string'&&input.startsWith('/api/v1/')?platform.fetch(input,options):fetch(input,options);
