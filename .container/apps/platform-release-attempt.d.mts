interface AttemptFiles {stateFile:string;envFile:string;composeFile:string;markerFile:string;}
export interface PlatformReleaseAttempt {schema:number;id:string;product:string;action:string;phase:string;createdAt:string;replacedAt?:string;completedAt?:string;manifestSha256:string;candidateStateSha256:string;inputs:Record<string,string|null>;candidateState:any;}
export function preparePlatformReleaseAttempt(options:AttemptFiles & {directory:string;action:string;approvedManifest:any;candidateState:any}):Promise<PlatformReleaseAttempt>;
export function markPlatformAttemptReplaced(directory:string,id:string):Promise<PlatformReleaseAttempt>;
export function validatePlatformResume(options:AttemptFiles & {directory:string;resumeId:string;approvedManifest:any;actualImageId:string}):Promise<PlatformReleaseAttempt>;
export function validatePlatformResumeMigrations(plans:any[],previous:Record<string,string>,manifest:any):void;
export function completePlatformReleaseAttempt(directory:string,id:string):Promise<PlatformReleaseAttempt>;
