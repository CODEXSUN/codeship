import {writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {githubApi} from '../.container/github.mjs';
import {validateManifest} from '../.container/release-policy.mjs';
import {businessTargets} from '../.container/apps/business-targets.mjs';
const root=path.resolve(import.meta.dirname,'..');
const entries=process.argv.slice(2),services={};
if(!entries.length)throw new Error('Supply explicit app@v-x.y.z releases; latest is not a deployment identity.');
for(const entry of entries) {
 const match=/^([a-z][a-z0-9-]*)@(v-\d+\.\d+\.\d+)$/.exec(entry);if(!match)throw new Error('Invalid release selection.');
 const [,name,tag]=match;if(!['codeship','codeitz','uiux','platform',...Object.keys(businessTargets)].includes(name))throw new Error('Unsupported release owner.');
 const repository='CODEXSUN/'+name,owner=(['codeship','codeitz','uiux'].includes(name)?'devkit/':'apps/')+name;
 if(services[name])throw new Error('Duplicate release selection.');
 const commit=await githubApi('/repos/'+repository+'/commits/'+tag);
 const runs=await githubApi('/repos/'+repository+'/actions/runs?head_sha='+commit.sha+'&per_page=100');
 if(!runs.workflow_runs.some(run=>run.path==='.github/workflows/release.yml'&&['push','workflow_dispatch'].includes(run.event)&&run.head_branch===tag&&run.status==='completed'&&run.conclusion==='success'))throw new Error(name+' tagged release workflow has not succeeded.');
 const release=await githubApi('/repos/'+repository+'/releases/tags/'+tag);
 if(release.draft||release.prerelease)throw new Error('Release is not approved for stable deployment.');
 const asset=release.assets.find(asset=>asset.name==='release-manifest.json');if(!asset)throw new Error('Release manifest missing.');
 const manifest=JSON.parse((await githubApi('/repos/'+repository+'/releases/assets/'+asset.id,{raw:true})).toString());
 services[name]=validateManifest(manifest,{owner,repository,tag,commit:commit.sha});
 console.log(name+' '+tag+' verified from successful GitHub release.');
}
const directory=path.join(root,'.codeship/releases');mkdirSync(directory,{recursive:true});
const file=path.join(directory,'approved-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
writeFileSync(file,JSON.stringify({schema:1,source:'github',approvedAt:new Date().toISOString(),services},null,2)+'\n',{mode:0o600});console.log(file);
