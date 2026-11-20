interface ProbeOptions {hostinger:boolean;localServiceOrigins:string[];}
export const platformRuntimeProbeCode:string;
export function platformRuntimeProbeSettings(environment:Record<string,string>,options:ProbeOptions):Record<string,string>;
export function probePlatformRuntime(image:string,environment:Record<string,string>,options:ProbeOptions,docker:(args:string[],input?:string)=>string):void;
