import {readdirSync,existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {validateContract} from '../.container/release.mjs';

// Readiness checks never install, migrate, publish or replace a running service.
const workspace=path.resolve(import.meta.dirname,'../../..');
const output=path.resolve(import.meta.dirname,'../.codeship/audit/apps');
mkdirSync(output,{recursive:true});
const results=[];
const contractsOnly=process.argv.slice(2).length===1&&process.argv[2]==='--contracts-only';
if(process.argv.length>2&&!contractsOnly)throw new Error('Use no arguments, or --contracts-only.');
for(const area of ['apps','devkit'])for(const entry of readdirSync(path.join(workspace,area),{withFileTypes:true})){
 if(!entry.isDirectory())continue;
 const root=path.join(workspace,area,entry.name);
 if(!existsSync(path.join(root,'package.json')))continue;
 const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
 const row={owner:area+'/'+entry.name,version:pkg.version,contract:false,verification:false,missing:[]};
 for(const file of ['.container/Dockerfile','.container/Dockerfile.dockerignore','.container/compose.yml','.container/release.json','.container/release.mjs','.container/setup.sh','.container/update.sh','.container/verify.sh','.github/workflows/release.yml','docs/release-notes.md'])if(!existsSync(path.join(root,file)))row.missing.push(file);
 if(!row.missing.length)try{validateContract(JSON.parse(readFileSync(path.join(root,'.container/release.json'),'utf8')),pkg.version,'v-'+pkg.version,{...pkg.dependencies,...pkg.devDependencies});row.contract=true;}catch{row.missing.push('Valid immutable dependency pins for all external file dependencies');}
 const command=pkg.scripts?.verify;
 if(command&&!contractsOnly){
  // npm's JS entry avoids shell interpolation and Windows command-file quoting.
  const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
  const run=spawnSync(process.execPath,[npm,'run','verify'],{cwd:root,windowsHide:true,encoding:'utf8',timeout:900000,maxBuffer:32*1024*1024});
  writeFileSync(path.join(output,entry.name+'.log'),(run.stdout??'')+(run.stderr??''),{mode:0o600});
  row.verification=run.status===0;row.exitCode=run.status;
 }else if(!command)row.missing.push('verify script');
 results.push(row);
 writeFileSync(path.join(output,contractsOnly?'contracts.json':'readiness.json'),JSON.stringify({at:new Date().toISOString(),scope:contractsOnly?'Contract validation only; source tests not run':'Source readiness only; not deployment certification',results},null,2)+'\n');
 console.log(row.owner+': verification '+(contractsOnly?'not requested':row.verification?'passed':'FAILED')+', contract '+(row.contract?'valid':'INCOMPLETE'));
}
if(results.some(row=>!row.contract||(!contractsOnly&&!row.verification)))process.exitCode=1;
