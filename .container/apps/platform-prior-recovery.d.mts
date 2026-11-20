export interface PlatformPriorFingerprint {schemaSha256:string;dataSha256:string;legacyIdentitySha256:string;tables:Record<string,number>;}
export function snapshotPlatformPriorDatabase(client:{query:(sql:string,values?:unknown[])=>Promise<{rows:any[]}>}):Promise<PlatformPriorFingerprint>;
export function hashPlatformPriorFiles(files:Record<'state'|'environment'|'compose'|'composeEnvironment',string>):Promise<Record<string,string>>;
export function validatePlatformPriorRecovery(options:any):{action:string;version:string;imageId:string;failedRun:string;schemaChanged:boolean;dataRestored:boolean};
export function platformPriorStartArguments(composeFile:string,waitSeconds?:number):string[];
export function executePlatformPriorRecovery(options:any,callbacks:{recheck:()=>Promise<any>;start:(args:string[])=>Promise<any>;verify:()=>Promise<any>;record?:(stage:string,status:string,details:any)=>Promise<any>}):Promise<ReturnType<typeof validatePlatformPriorRecovery>>;

export function hashPlatformPriorArchiveSchema(sql:string):string;
