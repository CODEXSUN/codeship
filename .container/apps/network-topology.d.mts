export const applicationNetwork:string;
export interface ApplicationTopology {name:string;subnet:string;gateway:string;addresses:Record<string,string>;peers:string;}
export function applicationAddresses(subnet:string):Record<string,string>;
export function ensureApplicationNetwork(docker:(args:string[])=>string,postgresProject?:string):ApplicationTopology;
export function applyIndependentNetwork(service:any,name:string,topology:ApplicationTopology):any;
export function verifyIndependentContainer(name:string,facts:any):void;
