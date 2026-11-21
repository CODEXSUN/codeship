import cp from 'node:child_process';
import fs from 'node:fs';
const [action,name,...args]=process.argv.slice(2);
if(!['setup','update'].includes(action)||!['platform','codeship','codeitz','uiux','iilabs'].includes(name)||args.length>(name==='iilabs'?1:0)||name==='iilabs'&&args[0]!=='--backend')throw Error('Select one staging app; IILabs requires --backend.');
let state;
function selectOperator(){state=JSON.parse(fs.readFileSync('.codeship/staging/operator.json','utf8'));if(state.target!=='ubuntu-staging'||!/^\/srv\/codebiz-staging\/operators\/v-\d+[.]\d+[.]\d+\/devkit\/codeship$/.test(state.operator))throw Error('Prepare approved staging operator first.');}
selectOperator();
const ssh=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-i','D:/workspace/codebiz/deploy/.ssh/ubuntu_local_ed25519','cx@192.168.1.34'];
function run(file,args){const r=cp.spawnSync(process.execPath,[file,...args],{stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error('Staging operation stopped; retain recorded state.');}
function remote(script,args){const r=cp.spawnSync('ssh',[...ssh,'/srv/codebiz-staging/bin/node '+state.operator+'/.container/staging/'+script+' '+args.join(' ')],{stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error('Selected staging operation stopped; no production change.');}
run('.container/staging/prepare.mjs',[name]);
selectOperator();
if(name==='iilabs'){
 if(action==='setup'){remote('iilabs.mjs',['prepare']);run('.container/staging/verify-iilabs-backup.mjs',[]);remote('iilabs.mjs',['activate']);}
 else remote('iilabs.mjs',['update']);
}else if(name==='platform')remote('platform.mjs',[action]);
else remote('devkits.mjs',[action,name]);
remote('inventory.mjs',[]);
