import {createPlatformDirectBrowserClient} from '@workspace/sdk/platform-direct-browser';
const client=createPlatformDirectBrowserClient('codeship');
export const platform=client;
let enabled=false;export function enablePlatform(value:boolean){enabled=value;}
export const appFetch:typeof fetch=(input,options)=>enabled&&typeof input==='string'&&input.startsWith('/api/v1/')?platform.fetch(input,options):fetch(input,options);
