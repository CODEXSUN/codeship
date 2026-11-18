import {createHash} from 'node:crypto';
import {createReadStream,existsSync} from 'node:fs';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {githubApi} from './github.mjs';
export async function resolveReleaseImage(manifest,docker,cache) {
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
  const release=await githubApi('/repos/'+manifest.repository+'/releases/tags/'+manifest.tag),asset=release.assets.find(asset=>asset.name===manifest.archive.name);
  if(!asset)throw new Error('Release image archive missing.');
  await writeFile(file+'.part',await githubApi('/repos/'+manifest.repository+'/releases/assets/'+asset.id,{raw:true}),{mode:0o600});
  if(await hash(file+'.part')!==manifest.archive.sha256)throw new Error('Release archive checksum mismatch.');await rename(file+'.part',file);
 }
 if(await hash(file)!==manifest.archive.sha256)throw new Error('Cached release archive checksum mismatch.');
 docker(['load','--input',file]);
 if(docker(['image','inspect',manifest.imageId,'--format','{{.Id}}'])!==manifest.imageId)throw new Error('Loaded image identity mismatch.');
 return manifest.imageId;
}
