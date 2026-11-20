const keys=['PLATFORM_TENANCY_MODE','PLATFORM_SINGLE_TENANT_CORPORATE_ID','PLATFORM_ENTRY_BINDINGS'];
export const platformRuntimeProbeCode=`
import {readGatewayConfiguration} from './src/api/modules/gateway/configuration.ts';
import {readTenancyConfiguration} from './src/api/modules/tenant/tenancy-mode.ts';
import {readEntryBindings} from './src/api/modules/entry/configuration.ts';
try {
 let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>65536)throw Error('Configuration too large');}
 const values=JSON.parse(input);values.PLATFORM_GATEWAY_ENABLED='1';
 readGatewayConfiguration(values,'production');readTenancyConfiguration(values);readEntryBindings(values.PLATFORM_ENTRY_BINDINGS);
 console.log('Platform routing configuration accepted');
}catch{console.error('Platform routing configuration rejected');process.exitCode=1;}
`;

export function platformRuntimeProbeSettings(environment,{hostinger,localServiceOrigins}){
 const settings=Object.fromEntries(keys.filter(key=>typeof environment[key]==='string').map(key=>[key,environment[key]]));
 return {...settings,PLATFORM_GATEWAY_ENABLED:'1',PLATFORM_GATEWAY_ALLOWED_ORIGINS:hostinger?environment.PLATFORM_GATEWAY_ALLOWED_ORIGINS:JSON.stringify(localServiceOrigins),PLATFORM_GATEWAY_IMAGE_UPLOADS:JSON.stringify(hostinger?[]:[{appKey:'ecommerce',path:'/api/v1/desk/product-images'}])};
}

/** Ask the immutable candidate's own pure validators; never mount private settings or connect a network. */
export function probePlatformRuntime(image,environment,options,docker){
 const settings=platformRuntimeProbeSettings(environment,options);
 try{docker(['run','--rm','-i','--network','none','--entrypoint','node',image,'--input-type=module','-e',platformRuntimeProbeCode],JSON.stringify(settings));}
 catch{throw Error('Platform routing/tenancy settings are invalid for the approved release; correct saved settings locally before setup/update');}
}
