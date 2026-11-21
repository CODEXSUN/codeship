import fs from 'node:fs';
import cp from 'node:child_process';
import {operator,docker,read} from './engine.mjs';
import {requireStagingHost,stagingRoot,ports} from './profile.mjs';
requireStagingHost();
const env={...process.env,CODESHIP_EXECUTION_MODE:'inventory',CODESHIP_SQLITE_FILE:stagingRoot+'/state/data/codeship.sqlite',CODESHIP_VAULT_KEY_FILE:stagingRoot+'/state/keys/vault.key'};
const run=(script,args=[],input)=>cp.execFileSync(process.execPath,[script,...args],{cwd:operator,env,input,encoding:'utf8',stdio:['pipe','pipe','pipe']});
run('scripts/database.ts',['migrate']);run('scripts/initialize-vault.ts');
const rows=[];
for(const name of Object.keys(ports)){
 const file=stagingRoot+'/state/'+name+'/state.json';if(!fs.existsSync(file))continue;
 const state=read(file);rows.push({name,owner:(['platform','iilabs'].includes(name)?'apps/':'devkit/')+name,project:['platform','iilabs'].includes(name)?'applications':'devkits',environment:'local-docker',host:'127.0.0.1',port:ports[name][0],version:state.version,username:'',notes:'Isolated Ubuntu staging; synthetic identities only.'});
}
const payload=JSON.stringify(rows);run('scripts/register-devkits.ts',[],payload);
let mirrored=[];
if(fs.existsSync(stagingRoot+'/state/codeship/state.json')){
 const supported=JSON.parse(docker(['exec','codeship','node','--input-type=module','-e',"import {businessTargets} from './.container/apps/business-targets.mjs';console.log(JSON.stringify(Object.keys(businessTargets)));"]));
 mirrored=rows.filter(row=>!row.owner.startsWith('apps/')||row.owner==='apps/platform'||supported.includes(row.owner.split('/')[1]));
 docker(['exec','-i','codeship','node','scripts/register-devkits.ts'],JSON.stringify(mirrored));
}
run('scripts/collect-docker-metrics.ts',['--once']);
const snapshot=read(stagingRoot+'/state/metrics/snapshot.json');
if(!snapshot.available||rows.some(row=>!snapshot.containers.some(c=>c.owner===row.owner)))throw Error('Staging managed inventory metrics are incomplete.');
cp.execFileSync(process.execPath,['--input-type=module','-e',"import{ensureMetricsCollector}from'./scripts/metrics-runtime.ts';await ensureMetricsCollector();"],{cwd:operator,env:{...env,CODESHIP_EXECUTION_MODE:'operator'},stdio:['ignore','pipe','pipe']});
console.log('Staging host inventory and all selected Docker metrics verified; app registry mirrored '+mirrored.length+'/'+rows.length+' supported products.');
