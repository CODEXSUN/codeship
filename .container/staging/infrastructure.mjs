import fs from 'node:fs';
import cp from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {requireStagingHost,stagingRoot,stagingNetwork,stagingSubnet,ingressNetwork,ingressSubnet,addresses} from './profile.mjs';
requireStagingHost();
const image='postgres@sha256:ff64c9e3bdf8e2120107d3559de8db314e8305f7e38c5105903c6295876738ff';
const execute=(args,input)=>cp.execFileSync('docker',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:16*1024*1024}).trim();
const inspect=(type,name)=>{try{return JSON.parse(execute([type,'inspect',name]))[0];}catch{return null;}};
const privateFile=stagingRoot+'/private/credentials.json';
let credentials;
if(fs.existsSync(privateFile)){
 if(!fs.lstatSync(privateFile).isFile()||fs.lstatSync(privateFile).isSymbolicLink()||(fs.statSync(privateFile).mode&0o077)!==0)throw Error('Protected staging configuration required.');
 credentials=JSON.parse(fs.readFileSync(privateFile,'utf8'));
}else{
 credentials={schema:1,target:'ubuntu-staging',postgresPassword:randomBytes(32).toString('hex'),platformPassword:randomBytes(32).toString('hex'),codeitzPassword:randomBytes(32).toString('hex'),ownerPassword:randomBytes(24).toString('hex'),ownerUsername:'stageowner',ownerEmail:'stageowner@example.invalid'};
 fs.writeFileSync(privateFile,JSON.stringify(credentials,null,2)+'\n',{mode:0o600,flag:'wx'});
}
if(credentials.schema!==1||credentials.target!=='ubuntu-staging'||!['postgresPassword','platformPassword','codeitzPassword','ownerPassword'].every(k=>/^[a-f0-9]{48,64}$/.test(credentials[k]??'')))throw Error('Staging secret configuration differs.');
let network=inspect('network',stagingNetwork);
if(!network){execute(['network','create','--internal','--subnet',stagingSubnet,'--label','io.codebiz.target=ubuntu-staging',stagingNetwork]);network=inspect('network',stagingNetwork);}
if(network.Labels?.['io.codebiz.target']!=='ubuntu-staging'||network.IPAM.Config[0].Subnet!==stagingSubnet||network.IPAM.Config[0].Gateway!=='172.30.40.1'||network.Internal!==true)throw Error('Existing staging network differs.');
let ingress=inspect('network',ingressNetwork);
if(!ingress){execute(['network','create','--subnet',ingressSubnet,'--label','io.codebiz.target=ubuntu-staging',ingressNetwork]);ingress=inspect('network',ingressNetwork);}
if(ingress.Labels?.['io.codebiz.target']!=='ubuntu-staging'||ingress.IPAM.Config[0].Subnet!==ingressSubnet||ingress.IPAM.Config[0].Gateway!=='172.30.41.1'||ingress.Internal!==false)throw Error('Staging ingress network differs.');
const volume='codebiz-staging_postgres';
let storage=inspect('volume',volume);
if(!storage){execute(['volume','create','--label','io.codebiz.target=ubuntu-staging',volume]);storage=inspect('volume',volume);}
if(storage.Labels?.['io.codebiz.target']!=='ubuntu-staging')throw Error('Existing volume belongs to another operation.');
const passwordFile=stagingRoot+'/private/postgres-password';
if(fs.existsSync(passwordFile)){if(fs.readFileSync(passwordFile,'utf8')!==credentials.postgresPassword)throw Error('Staging credential differs; refusing rotation.');}
else fs.writeFileSync(passwordFile,credentials.postgresPassword,{mode:0o600,flag:'wx'});
const name='codebiz-staging-postgres';let container=inspect('container',name);
if(!container){
 execute(['pull',image]);
 execute(['run','-d','--name',name,'--label','io.codebiz.target=ubuntu-staging','--restart','unless-stopped','--network',stagingNetwork,'--network-alias','postgres','--ip',addresses.postgres,'--mount','type=volume,source='+volume+',target=/var/lib/postgresql','--mount','type=bind,source='+passwordFile+',target=/run/secrets/postgres_password,readonly','-e','POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password',image]);
 container=inspect('container',name);
}
if(container.Config.Labels?.['io.codebiz.target']!=='ubuntu-staging'||Object.keys(container.HostConfig.PortBindings??{}).length||!container.NetworkSettings.Networks[stagingNetwork])throw Error('Existing staging PostgreSQL ownership or private binding differs.');
let ready=false;
for(let i=0;i<60;i++){
 try{const result=execute(['exec',name,'sh','-c','PGPASSWORD="$(cat /run/secrets/postgres_password)" psql -h 127.0.0.1 -U postgres -tAc "SELECT 1"']);if(result==='1'){ready=true;break;}}catch{}
 await new Promise(r=>setTimeout(r,1000));
}
if(!ready)throw Error('Staging PostgreSQL authentication/readiness failed.');
fs.writeFileSync(stagingRoot+'/state/infrastructure.json',JSON.stringify({target:'ubuntu-staging',image,imageId:container.Image,containerId:container.Id,network:stagingNetwork,volume,publicPorts:false,ready:true,verifiedAt:new Date().toISOString()},null,2)+'\n',{mode:0o600});
console.log('Staging PostgreSQL verified; persistent isolated storage, authenticated SQL, no published database port.');
