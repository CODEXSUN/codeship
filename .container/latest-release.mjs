import {githubApi,githubToken} from './github.mjs';
import {validateManifest} from './release-policy.mjs';
export function compareVersions(a,b){
 const parse=v=>{if(!/^\d+\.\d+\.\d+$/.test(v))throw Error('Use stable semantic versions');return v.split('.').map(Number);};
 const x=parse(a),y=parse(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0;
}
export async function latestRelease(name,{api=githubApi,download=fetch,token=githubToken}={}){
 if(!['codeship','codeitz','uiux'].includes(name))throw Error('Select one supported devkit');
 const repo='CODEXSUN/'+name;
 const releases=await api('/repos/'+repo+'/releases?per_page=100');
 const stable=releases.filter(r=>!r.draft&&!r.prerelease&&/^v-\d+\.\d+\.\d+$/.test(r.tag_name)).sort((a,b)=>compareVersions(b.tag_name.slice(2),a.tag_name.slice(2)));
 if(!stable.length)throw Error('No stable tagged release for '+name);
 const release=stable[0],tag=release.tag_name;
 const commit=await api('/repos/'+repo+'/commits/'+tag);
 const runs=await api('/repos/'+repo+'/actions/runs?head_sha='+commit.sha+'&per_page=100');
 if(!runs.workflow_runs.some(r=>r.path==='.github/workflows/release.yml'&&r.head_branch===tag&&['push','workflow_dispatch'].includes(r.event)&&r.status==='completed'&&r.conclusion==='success'))throw Error(name+' latest release has no successful tagged workflow');
 const manifestAsset=release.assets.find(a=>a.name==='release-manifest.json');
 if(!manifestAsset)throw Error(name+' release manifest missing');
 const manifest=validateManifest(JSON.parse((await api('/repos/'+repo+'/releases/assets/'+manifestAsset.id,{raw:true})).toString()),{owner:'devkit/'+name,repository:repo,tag,commit:commit.sha});
 if(!/^sha256:[a-f0-9]{64}$/.test(manifest.imageId??'')||manifest.archive?.name!=='image.tar.gz'||!/^[a-f0-9]{64}$/.test(manifest.archive?.sha256??''))throw Error('Approved image archive identity missing');
 const imageAsset=release.assets.find(a=>a.name===manifest.archive.name);if(!imageAsset)throw Error('Release image asset missing');
 const response=await download('https://api.github.com/repos/'+repo+'/releases/assets/'+imageAsset.id,{headers:{Authorization:'Bearer '+token(),Accept:'application/octet-stream','User-Agent':'CodeShip-update'},redirect:'manual',signal:AbortSignal.timeout(30000)});
 const url=response.headers.get('location');await response.body?.cancel();
 if(response.status!==302||!validReleaseAssetUrl(url))throw Error('GitHub image download unavailable');
 return {manifest,archiveUrl:url};
}
export function validReleaseAssetUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='release-assets.githubusercontent.com'&&!u.username&&!u.password;}catch{return false;}}
export function updateDecision(installed,manifest,actualImage){
 if(!installed)throw Error('Update requires an existing installed service; use setup.sh separately');
 if(actualImage!==installed.imageId)throw Error('Running service differs from the recorded installed image; no automatic repair');
 const order=compareVersions(manifest.version,installed.version);
 if(order<0)throw Error('Refuse release downgrade');
 if(order===0){if(installed.imageId!==manifest.imageId||actualImage!==manifest.imageId)throw Error('Installed release identity differs; no automatic repair');return 'current';}
 return 'update';
}
