import {spawnSync} from 'node:child_process';
export function githubToken() {
  if(process.env.GH_TOKEN)return process.env.GH_TOKEN;
  if(process.env.GITHUB_TOKEN)return process.env.GITHUB_TOKEN;
  const result=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',windowsHide:true});
  const line=result.stdout?.split('\n').find(row=>row.startsWith('password='));
  if(result.status!==0||!line)throw new Error('GitHub authentication unavailable.');
  return line.slice(9).trim();
}
export async function githubApi(route,{method='GET',body,raw=false}={}) {
  const response=await fetch('https://api.github.com'+route,{method,headers:{Authorization:'Bearer '+githubToken(),'User-Agent':'CodeShip-release','X-GitHub-Api-Version':'2022-11-28',Accept:raw?'application/octet-stream':'application/vnd.github+json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok)throw new Error('GitHub '+method+' '+route+' returned '+response.status);
  return response.status===204?null:raw?Buffer.from(await response.arrayBuffer()):response.json();
}
