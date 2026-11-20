export function requireRecoveryChannel():void;
export function requestOffhostRecovery(recovery:{kind:'postgresql'|'sqlite';service:string;file:string;sha256:string;imageId?:string;scope?:string;database?:string;requireIdentityRetirementProof?:boolean;candidateImageId?:string}):Promise<any>;
