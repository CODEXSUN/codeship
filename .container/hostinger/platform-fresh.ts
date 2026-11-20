import {platformIdentityInstallPayload} from './platform-identity-payload.mjs';
import {readFile,writeFile,mkdir,rename,chown} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type pg from 'pg';
import {serializeDeploymentEnvironment} from '../../src/api/modules/master/application/accounts.ts';
/** Selected fresh-target branch of the shared Platform lifecycle; never an update/reset path. */
export async function prepareFreshPlatform({admin,env,root,privateRoot,envFile,markerFile,image,masterIdentityRetired=false,docker,stage}: {
 admin:pg.Client;env:Record<string,string>;root:string;privateRoot:string;envFile:string;markerFile:string;image:string;masterIdentityRetired?:boolean;
 docker:(args:string[],input?:string|Buffer)=>string;stage:(name:string,status:string,detail?:Record<string,unknown>)=>Promise<void>;
}){
 const journal=path.join(root,'fresh-install-ownership.json');
 if(existsSync(journal))throw Error('Fresh Platform operation already started; inspect retained partial state rather than repeating installation.');
 const identityFile=path.join(privateRoot,'identity-transfer.json');
 const bytes=await readFile(identityFile),identity=JSON.parse(bytes.toString());
 if(bytes.length>1048576||identity.schema!==1||identity.master?.tenants?.length!==1||identity.master.tenants[0].code!=='codexsun')throw Error('Only the approved Codexsun identity transfer is accepted.');
 const installationIdentity=platformIdentityInstallPayload(identity,masterIdentityRetired);
 const installationFile=path.join(privateRoot,'identity-installation.json');
 const installationBytes=JSON.stringify(installationIdentity);
 const scopes=[{database:'platform_master',key:'PLATFORM_MASTER_DATABASE_URL'},{database:'platform_codexsun',key:'PLATFORM_TENANT_DATABASE_URL'}];
 const urls=scopes.map(scope=>new URL(env[scope.key]??''));
 if(urls.some((url,index)=>url.hostname!=='postgres'||url.port!=='5432'||url.pathname!=='/'+scopes[index].database||decodeURIComponent(url.username)!=='platform_service')||urls.some(url=>url.password!==urls[0].password)||!urls[0].password)throw Error('Configure the exact fresh Platform targets and restricted role.');
 for(const scope of scopes)if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[scope.database])).rowCount)throw Error('Platform database exists without target ownership; installation refused.');
 if((await admin.query("SELECT 1 FROM pg_roles WHERE rolname='platform_service'")).rowCount)throw Error('Platform role exists without target ownership; installation refused.');
 await mkdir(privateRoot,{recursive:true,mode:0o700});
 await writeFile(envFile,serializeDeploymentEnvironment(env),{mode:0o600});
 await writeFile(installationFile,installationBytes,{mode:0o600,flag:'wx'});
 await writeFile(journal,JSON.stringify({schema:1,target:'hostinger-914719',status:'provisioning',databases:scopes.map(s=>s.database),identitySha256:createHash('sha256').update(bytes).digest('hex'),installationSha256:createHash('sha256').update(installationBytes).digest('hex'),masterIdentityRetired,at:new Date().toISOString()},null,2),{mode:0o600,flag:'wx'});
 const create=(await admin.query("SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', $1::text, $2::text)",['platform_service',decodeURIComponent(urls[0].password)])).rows[0].format;
 await admin.query(create);
 for(const scope of scopes){await admin.query('CREATE DATABASE "'+scope.database+'" OWNER platform_service');await admin.query('REVOKE ALL ON DATABASE "'+scope.database+'" FROM PUBLIC');}
 await chown(envFile,1000,1000);await chown(installationFile,1000,1000);
 await stage('fresh-owned-databases','passed',{role:'platform_service',databases:scopes.map(s=>s.database),dataImported:false});
 const result=JSON.parse(docker(['run','--rm','--network','cxapp-network','--mount','type=bind,source='+envFile+',target=/run/platform.env,readonly','--mount','type=bind,source='+installationFile+',target=/run/identity.json,readonly','-e','PLATFORM_FRESH_INSTALL=codexsun-identity-only','--entrypoint','node',image,'--env-file=/run/platform.env','scripts/install-fresh-identity.ts','/run/identity.json']));
 if(result.copiedSessions!==0||result.copiedBusinessTables!==0||result.tenantId!==identity.master.tenants[0].public_id)throw Error('Fresh Platform identity verification differs.');
 await writeFile(markerFile+'.next',JSON.stringify({status:'fresh-identity-installed',role:'platform_service',scopes,...result},null,2),{mode:0o600});await rename(markerFile+'.next',markerFile);
 await stage('fresh-identity-only','passed',result);
}
