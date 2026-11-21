const products=Object.freeze({codeship:{owner:'devkit/codeship',state:'devkits/state.json',lifecycle:'.container/devkits/lifecycle.ts'},codeitz:{owner:'devkit/codeitz',state:'devkits/state.json',lifecycle:'.container/devkits/lifecycle.ts'},uiux:{owner:'devkit/uiux',state:'devkits/state.json',lifecycle:'.container/devkits/lifecycle.ts'},platform:{owner:'apps/platform',state:'apps/platform/state.json',lifecycle:'.container/apps/lifecycle.ts'}});
const iilabsPublic={owner:'apps/iilabs',state:'apps/iilabs-public/state.json',lifecycle:'.container/hostinger/iilabs-public.mjs'};
export function product(name){const entry=name==='iilabs'?iilabsPublic:Object.hasOwn(products,name)?products[name]:null;if(!entry)throw Error('Unsupported deployment product');return {...entry,repository:'CODEXSUN/'+name};}
export function installedProduct(name,state){return ['platform','iilabs'].includes(name)?state:state?.services?.[name];}
export function deploymentProduct(name,runtimeMode){
 const descriptor=product(name);
 if(runtimeMode===undefined)return descriptor;
 if(name!=='iilabs'||runtimeMode!=='full-app')throw Error('Unsupported selected runtime mode.');
 return {...descriptor,state:'apps/iilabs/state.json',lifecycle:'.container/hostinger/iilabs-lifecycle.mjs'};
}
