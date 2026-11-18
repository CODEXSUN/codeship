export interface BusinessTarget {readonly name:string;readonly prefix:string;readonly apiPort:number;readonly port:number;readonly relayPort:number;readonly database:string|null;readonly dependencies:readonly string[];}
export const businessTargets:Readonly<Record<string,BusinessTarget>>;
export function businessTarget(name:string|undefined):BusinessTarget;
