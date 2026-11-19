import {randomBytes} from 'node:crypto';import {hostname} from 'node:os';import {readFileSync,existsSync} from 'node:fs';import path from 'node:path';
import {openDatabase,appRoot} from '../../src/api/database.ts';
import {applicationRepository} from '../../src/api/modules/master/application/repository.ts';
import {decryptSecrets} from '../../src/api/modules/master/application/vault.ts';
import {currentEnvironment} from '../../src/api/modules/master/application/environment.ts';
import {installationUsers,serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
import {hostingerTargetPolicy} from '../hostinger/target-policy.mjs';
const name=process.argv[2];if(!['codeship','codeitz','uiux'].includes(name))throw Error('Select one existing devkit.');
let text='';for await(const part of process.stdin){text+=part;if(text.length>16384)throw Error('Configuration decision too large.');}
const input=JSON.parse(text);if(Object.keys(input).some(key=>key!=='existingSuperAdministrators')||!Array.isArray(input.existingSuperAdministrators)||input.existingSuperAdministrators.length<1||input.existingSuperAdministrators.some((id:unknown)=>typeof id!=='string'||!/^[a-z0-9]{8}$/.test(id)))throw Error('Provide the explicit existing super administrator selection.');
const file=path.join(appRoot,'.codeship/target.json'),target=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):undefined;
const cloud=target?.id==='hostinger-914719';
if(cloud)hostingerTargetPolicy({target,platform:process.platform,hostname:hostname(),appRoot,mode:'update',selected:[name]});
else if(process.platform!=='win32'||target)throw Error('Only the existing Windows Docker or verified Hostinger target is supported.');
const {db}=openDatabase();try{
 const rows=await db.selectFrom('applications').selectAll().where('owner','=','devkit/'+name).where('project','=','devkits').where('environment','=','local-docker').execute();
 if(rows.length!==1)throw Error('Existing selected devkit registry must be unique.');const row=rows[0],secrets=row.encrypted_secrets?decryptSecrets(row.public_id,row.encrypted_secrets):{},env=currentEnvironment(secrets),prefix=name.toUpperCase();
 const port={codeship:14350,codeitz:14305,uiux:14315}[name];
 if(env[prefix+'_PLATFORM_SERVICE_TOKEN']&&!/^[a-f0-9]{64}$/.test(env[prefix+'_PLATFORM_SERVICE_TOKEN']))throw Error('Existing service credential needs operator review.');
 Object.assign(env,{[prefix+'_PLATFORM_AUTH']:'1',[prefix+'_PLATFORM_ORIGIN']:'http://platform:4385',[prefix+'_PLATFORM_TRANSPORT']:'docker-network',[prefix+'_PLATFORM_SERVICE_TOKEN']:env[prefix+'_PLATFORM_SERVICE_TOKEN']??randomBytes(32).toString('hex'),[prefix+'_BROWSER_ORIGINS']:JSON.stringify(cloud?['https://'+name+'.codexsun.com','http://127.0.0.1:'+port]:['http://127.0.0.1:'+port]),[prefix+'_PLATFORM_APPROVED_SA_IDS']:JSON.stringify(input.existingSuperAdministrators)});
 const preserved=Object.fromEntries(['password','token','sshKey','saPassword','adminPassword','userPassword'].filter(key=>secrets[key]).map(key=>[key,secrets[key]]));
 await applicationRepository(db).save({name:row.name,owner:row.owner,project:row.project,version:row.version,environment:row.environment,host:row.host,port:row.port,username:row.username,notes:row.notes,users:installationUsers(secrets).map(({hasPassword,...user})=>user),secretRevision:row.secret_revision,secrets:{...preserved,env:serializeDeploymentEnvironment(env)}},row.public_id);
 console.log('Selected devkit Platform configuration saved encrypted; existing credentials preserved, no container replaced.');
}finally{await db.destroy();}
