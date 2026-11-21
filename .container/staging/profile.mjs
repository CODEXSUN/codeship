import os from 'node:os';
import fs from 'node:fs';
export const stagingRoot='/srv/codebiz-staging';
export const stagingTarget={id:'ubuntu-staging',hostname:'cxserver',host:'192.168.1.34',root:stagingRoot,binding:'127.0.0.1',publicExposure:false,dataPolicy:'synthetic-fresh'};
export const stagingNetwork='codebiz-staging_backend';
export const stagingSubnet='172.30.40.0/24';
export const ingressNetwork='codebiz-staging_ingress';
export const ingressSubnet='172.30.41.0/24';
export const addresses={postgres:'172.30.40.2',platform:'172.30.40.10',codeship:'172.30.40.11',codeitz:'172.30.40.12',uiux:'172.30.40.13',iilabs:'172.30.40.20'};
export const ports={platform:[14385,4385],codeship:[14350,4350],codeitz:[14305,4305],uiux:[14315,4315],iilabs:[14435,4435]};
export function validateStagingProfile({platform,hostname,uid,username,target}){
 if(platform!=='linux'||hostname!=='cxserver'||uid!==1000||username!=='cx')throw Error('Use the approved cx Ubuntu LAN staging operator.');
 if(!target||Object.keys(stagingTarget).some(key=>target[key]!==stagingTarget[key]))throw Error('Staging target identity or data policy differs.');
 return target;
}
export function requireStagingHost(){
 if(!fs.existsSync(stagingRoot)||fs.realpathSync(stagingRoot)!==stagingRoot)throw Error('Isolated staging root required.');
 const target=JSON.parse(fs.readFileSync(stagingRoot+'/target.json','utf8'));
 return validateStagingProfile({platform:process.platform,hostname:os.hostname(),uid:process.getuid?.(),username:os.userInfo().username,target});
}
