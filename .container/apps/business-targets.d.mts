export interface BusinessTarget {readonly name:string;readonly prefix:string;readonly apiPort:number;readonly port:number;readonly relayPort:number;readonly database:string|null;readonly dependencies:readonly string[];}
export const businessTargets:Readonly<Record<string,BusinessTarget>>;
export function businessTarget(name:string|undefined):BusinessTarget;
export function businessServiceProfile(target:BusinessTarget,service:Record<string,unknown>,release:{token:string;version:string;image:string}):{manifest:Record<string,unknown>;token:string;version:string;image:string};
