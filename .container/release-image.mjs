import {createHash} from 'node:crypto';
import {createReadStream,createWriteStream,existsSync} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {randomUUID} from 'node:crypto';
import {validReleaseAssetUrl} from './latest-release.mjs';
import {mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {githubApi} from './github.mjs';
export function requireReleaseImageStore(manifest,driverStatus){
 if(manifest.imageId&&manifest.image?.endsWith('@'+manifest.imageId)&&!driverStatus.some(row=>row[0]==='driver-type'&&row[1]==='io.containerd.snapshotter.v1'))throw Error('Approved release requires the containerd image store; target differs. Correct the target configuration through its reviewed setup, not image aliases.');
}
export async function resolveReleaseImage(manifest,docker,cache) {
 requireReleaseImageStore(manifest,JSON.parse(docker(['info','--format','{{json .DriverStatus}}'])));
 // An approved content-addressed image already loaded from a checked release
 // does not need another registry transfer. Callers still check release labels.
 if(/^sha256:[a-f0-9]{64}$/.test(manifest.imageId??''))try{
  if(docker(['image','inspect',manifest.imageId,'--format','{{.Id}}'])===manifest.imageId)return manifest.imageId;
 }catch{} // Missing locally: use the checked registry/archive path below.
 try{docker(['pull',manifest.image]);const id=docker(['image','inspect',manifest.image,'--format','{{.Id}}']);if(id!==manifest.imageId)throw new Error('Registry image content differs from the release.');return manifest.image;}catch(error){
  // Private GHCR requires a separate packages token. Authenticated GitHub release assets
  // provide the same checked image without storing broad registry credentials on the host.
  if(!/^sha256:[a-f0-9]{64}$/.test(manifest.imageId??'')||manifest.archive?.name!=='image.tar.gz'||!/^[a-f0-9]{64}$/.test(manifest.archive?.sha256??''))throw error;
 }
 await mkdir(cache,{recursive:true});const file=path.join(cache,manifest.archive.sha256+'.tar.gz');
 const hash=async(file)=>{const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');};
 if(!existsSync(file)){
  const part=file+'.part-'+randomUUID();
  try{
   let approved;
   if(process.env.CODESHIP_RELEASED_UPDATE_ENTRY==='1'){
    const assets=JSON.parse(process.env.CODESHIP_RELEASE_ASSETS_JSON??'{}');approved=assets[manifest.repository+'@'+manifest.tag];
    if(approved&&!validReleaseAssetUrl(approved))throw Error('Unapproved image download host');
   }
   if(approved){
    const response=await fetch(approved,{redirect:'error',signal:AbortSignal.timeout(900000)});
    if(!response.ok||!response.body)throw Error('Approved image download failed; resolve release locally again');
    await pipeline(Readable.fromWeb(response.body),createWriteStream(part,{flags:'wx',mode:0o600}));
   }else{
    const release=await githubApi('/repos/'+manifest.repository+'/releases/tags/'+manifest.tag),asset=release.assets.find(asset=>asset.name===manifest.archive.name);
    if(!asset)throw Error('Release image archive missing.');
    await writeFile(part,await githubApi('/repos/'+manifest.repository+'/releases/assets/'+asset.id,{raw:true}),{mode:0o600,flag:'wx'});
   }
   if(await hash(part)!==manifest.archive.sha256)throw Error('Release archive checksum mismatch.');
   await rename(part,file);
  }catch(error){if(existsSync(part))await unlink(part);throw error;}
 }
 if(await hash(file)!==manifest.archive.sha256)throw new Error('Cached release archive checksum mismatch.');
 docker(['load','--input',file]);
 if(docker(['image','inspect',manifest.imageId,'--format','{{.Id}}'])!==manifest.imageId)throw new Error('Loaded image identity mismatch.');
 if(process.env.CODESHIP_RELEASED_UPDATE_ENTRY==='1'&&process.env.CODESHIP_KEEP_RELEASE_ARCHIVES==='0')await unlink(file);
 return manifest.imageId;
}
