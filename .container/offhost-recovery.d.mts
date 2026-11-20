export function requireRecoveryChannel():void;
export function requestOffhostRecovery(recovery:{kind:'postgresql'|'sqlite';service:string;file:string;sha256:string;imageId?:string}):Promise<any>;
