import fs from 'node:fs';
import os from 'node:os';
import cp from 'node:child_process';
const source='/home/codebiz/devkit/codeship',state='/home/codebiz/.deployment/state';
const previous='/home/codebiz/.deployment/operators/v-1.0.21/devkit/codeship';
export function releasedMetricsUnit(text){
 const rows=text.split('\n'),working=rows.filter(row=>row.startsWith('WorkingDirectory=')),commands=rows.filter(row=>row.startsWith('ExecStart='));
 if(working.length!==1||commands.length!==1||!rows.includes('Environment=CODESHIP_METRICS_READER_UID=1000')||![source,previous].some(root=>working[0]==='WorkingDirectory='+root&&commands[0]==='ExecStart=/home/codebiz/.deployment/bin/node '+root+'/scripts/collect-docker-metrics.ts --watch'))throw Error('Existing metrics service has another owner or runtime.');
 return rows.map(row=>row===working[0]?'WorkingDirectory='+source:row===commands[0]?'ExecStart=/home/codebiz/.deployment/bin/node '+source+'/scripts/collect-docker-metrics.ts --watch':row).join('\n');
}
export async function ensureReleasedHostMetrics(root,tooling){
 if(process.platform!=='linux'||os.hostname()!=='srv914719'||process.getuid()!==0||fs.realpathSync(root)!==source||!/^[a-f0-9]{40}$/.test(tooling.commit))throw Error('Use the clean released Hostinger metrics owner.');
 const file='/etc/systemd/system/codebiz-codeship-metrics.service',stat=fs.lstatSync(file);
 if(stat.isSymbolicLink()||!stat.isFile()||stat.uid!==0)throw Error('Existing metrics unit ownership differs.');
 const original=fs.readFileSync(file,'utf8'),next=releasedMetricsUnit(original),receipt=state+'/metrics/operator-release.json';
 if(original===next&&fs.existsSync(receipt)&&JSON.parse(fs.readFileSync(receipt)).commit===tooling.commit)return;
 const recovery=state+'/devkits/private/metrics-unit-before-'+Date.now()+'.service';fs.writeFileSync(recovery,original,{mode:0o600,flag:'wx'});
 const systemctl=args=>{try{cp.execFileSync('systemctl',args,{stdio:['ignore','pipe','pipe'],timeout:180000});}catch{throw Error('Released metrics service admission failed.');}};
 try{
  const startedAt=Date.now();fs.writeFileSync(file,next);systemctl(['daemon-reload']);systemctl(['restart','codebiz-codeship-metrics.service']);
  let verified=false;
  for(let attempt=0;attempt<90;attempt++){
   try{const snapshot=JSON.parse(fs.readFileSync(state+'/metrics/snapshot.json')),stat=fs.statSync(state+'/metrics/snapshot.json');if(snapshot.available&&Date.parse(snapshot.collectedAt)>=startedAt&&Date.now()-Date.parse(snapshot.collectedAt)<15000&&stat.uid===0&&stat.gid===1000&&(stat.mode&0o777)===0o640){verified=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(!verified)throw Error('Fresh released host metrics unavailable.');
  fs.writeFileSync(receipt,JSON.stringify({commit:tooling.commit,version:tooling.version,verifiedAt:new Date().toISOString(),recovery}),{mode:0o600});
 }catch(error){fs.writeFileSync(file,original);systemctl(['daemon-reload']);systemctl(['restart','codebiz-codeship-metrics.service']);throw error;}
 console.log('Released host metrics service verified; only redacted snapshots shared with application.');
}
