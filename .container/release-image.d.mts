import type {ReleaseManifest} from './release-policy.mjs';
export function resolveReleaseImage(manifest:ReleaseManifest,docker:(args:string[],input?:string|Buffer)=>string,directory:string):Promise<string>;
