import {createHash} from 'node:crypto';
import path from 'node:path';
import {infrastructureInput,infrastructureNetwork} from './service.ts';
import {fileManagerDefinition} from './file-manager.ts';
import type {InfrastructureService} from '../../../../../contracts/infrastructure.ts';

export function infrastructureCompose(row:InfrastructureService,secrets:Record<string,string>,templateRoot:string){
 const fields=['kind','name','version','environment','project','host','port','docker_port','binding_mode','allowed_ips','username','database','storage','notes','revision'];
 infrastructureInput.parse(Object.fromEntries(fields.map(key=>[key,(row as any)[key]])));
 const images={postgres:/^postgres:\d[\w.-]*$/,mariadb:/^mariadb:\d[\w.-]*$/,redis:/^redis:\d[\w.-]*$/,'file-manager':/^filebrowser\/filebrowser:v\d+\.\d+\.\d+$/};
 if(!images[row.kind].test(row.version))throw new Error('Select a versioned '+row.kind+' image.');
 if(row.environment!=='local-docker')throw new Error('Only local Docker infrastructure is supported.');
 if(!row.port||!row.docker_port)throw new Error('Set host and Docker ports.');
 const network=infrastructureNetwork(row),files:Record<string,string>={};
 const build={context:path.join(templateRoot,row.kind),args:{BASE_IMAGE:row.version}};
 const service:any={image:row.project+':'+row.version.split(':').at(-1),build,restart:'unless-stopped',ports:[network.bindAddress+':'+row.port+':'+row.docker_port],security_opt:['no-new-privileges:true']};
 const compose:any={name:row.project,services:{[row.kind]:service},volumes:{data:{name:row.project+'_data'}}};
 const secret=(name:string,value:string|undefined)=>{if(!value)throw new Error('Save '+name.replaceAll('_',' ')+' before generating.');files[name]=value;compose.secrets??={};compose.secrets[name]={file:'./private/'+name};service.secrets??=[];service.secrets.push(name);return '/run/secrets/'+name;};
 if(row.kind==='postgres'){
  if(!row.username)throw new Error('Set PostgreSQL username.');
  service.environment={POSTGRES_USER:row.username,POSTGRES_PASSWORD_FILE:secret('password',secrets.password),...(row.database?{POSTGRES_DB:row.database}:{})};
  service.command=['postgres','-p',String(row.docker_port)];
  service.volumes=['data:'+ (Number(row.version.match(/:(\d+)/)?.[1])>=18?'/var/lib/postgresql':'/var/lib/postgresql/data')];
  service.healthcheck={test:['CMD','pg_isready','-p',String(row.docker_port),'-U',row.username,'-d',row.database||row.username],interval:'10s',timeout:'5s',retries:10};
 }else if(row.kind==='mariadb'){
  service.environment={MARIADB_ROOT_PASSWORD_FILE:secret('root_password',secrets.rootPassword||(row.username==='root'?secrets.password:undefined)),...(row.database?{MARIADB_DATABASE:row.database}:{})};
  if(row.username&&row.username!=='root'){
   if(!row.database)throw new Error('MariaDB installation with a non-root user requires a database for its grants.');
   service.environment.MARIADB_USER=row.username;service.environment.MARIADB_PASSWORD_FILE=secret('password',secrets.password);
  }
  service.command=['mariadbd','--port='+row.docker_port];service.volumes=['data:/var/lib/mysql'];
  service.healthcheck={test:['CMD','healthcheck.sh','--connect','--innodb_initialized'],interval:'10s',timeout:'5s',retries:10};
 }else if(row.kind==='redis'){
  if(!secrets.password)throw new Error('Save Redis password before generating.');
  const user=row.username||'default';if(!/^[a-zA-Z0-9_-]+$/.test(user))throw new Error('Use a simple Redis ACL username.');
  const hash=createHash('sha256').update(secrets.password).digest('hex');
  files['users.acl']=(user!=='default'?'user default off\n':'')+'user '+user+' on #'+hash+' ~* &* +@all\n';
  compose.secrets={acl:{file:'./private/users.acl'}};service.secrets=[{source:'acl',target:'users.acl'}];
  service.command=['redis-server','--port',String(row.docker_port),'--appendonly','yes','--aclfile','/run/secrets/users.acl'];service.volumes=['data:/data'];
 }else{
  if(!row.username)throw new Error('Save File Manager administrator username before generating.');
  if(!secrets.password||secrets.password.length<12)throw new Error('Save File Manager password (at least 12 characters) before generating.');
  const definition=fileManagerDefinition(row,secrets.password);
  const fileService=definition.services.filemanager;
  fileService.environment.FB_PASSWORD=fileService.environment.FB_PASSWORD.replaceAll('$',()=> '$$');
  return {compose:{...definition,services:{filemanager:{...fileService,image:service.image,build}}},files,network};
 }
 // Compose interpolates dollar signs even in JSON; escape operator-supplied env values.
 if(service.environment)for(const key of Object.keys(service.environment))service.environment[key]=service.environment[key].replaceAll('$',()=> '$$');
 return {compose,files,network};
}
