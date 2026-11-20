export const retirementMigration:string;
export const platformRetirementProbeCode:string;
export function assertPlatformRetirementPreflight(plans:any[],probe:()=>any,preservation?:any):void;
export function parseHistoricalIdentityMetadata(value:any):{schema:number;source:string;rows:{public_id:string;source_digest:string}[]};
