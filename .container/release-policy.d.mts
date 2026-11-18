export interface ReleaseManifest {schema:number;owner:string;repository:string;version:string;tag:string;commit:string;image:string;imageId:string;migrations:Record<string,string>;[key:string]:unknown;}
export function validateManifest(value:unknown,expected:{owner:string;repository:string;tag:string;commit:string}):ReleaseManifest;
