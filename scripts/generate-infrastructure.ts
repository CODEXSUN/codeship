import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {openDatabase,appRoot} from '../src/api/database.ts';
import {decryptSecrets} from '../src/api/modules/master/application/vault.ts';
import {infrastructureCompose} from '../src/api/modules/master/infrastructure-service/compose.ts';
if(process.argv.length>2)throw new Error('Use npm run infra:generate. Settings come only from local SQLite.');
const {db}=openDatabase();
const output=path.join(appRoot,'.codeship/infrastructure-generated',new Date().toISOString().replaceAll(/[:.]/g,'-')+'-'+randomBytes(3).toString('hex'));
try{
 const rows=await db.transaction().execute(trx=>trx.selectFrom('infrastructure_services').selectAll().orderBy('kind').execute());
 await mkdir(output,{recursive:true,mode:0o700});const report=[];
 for(const row of rows){
  try{
   const secrets=row.encrypted_secrets?decryptSecrets(row.public_id,row.encrypted_secrets):{};
   const generated=infrastructureCompose(row as any,secrets,path.join(appRoot,'.container/infrastructure'));
   const directory=path.join(output,row.public_id);await mkdir(path.join(directory,'private'),{recursive:true,mode:0o700});
   for(const [name,value]of Object.entries(generated.files))await writeFile(path.join(directory,'private',name),value,{mode:0o600,flag:'wx'});
   const file=path.join(directory,'compose.json');await writeFile(file,JSON.stringify(generated.compose,null,2)+'\n',{mode:0o600,flag:'wx'});
   await writeFile(path.join(directory,'network.json'),JSON.stringify(generated.network,null,2)+'\n',{mode:0o600,flag:'wx'});
   const check=spawnSync('docker',['compose','-f',file,'config','--quiet'],{encoding:'utf8',windowsHide:true});
   if(check.status!==0)throw new Error('Docker Compose validation failed; no services started.');
   report.push({id:row.public_id,kind:row.kind,project:row.project,revision:row.revision,status:'generated',compose:file,firewallPending:generated.network.requiresFirewall});
  }catch(error){
   const message=error instanceof Error?error.message:'';
   const safe=/^(?:Select a versioned|Set host|Set PostgreSQL|Save |MariaDB installation|Only local Docker|Use a simple Redis|Docker Compose validation)/.test(message)?message:'Check service fields, credentials and volume bindings.';
   report.push({id:row.public_id,kind:row.kind,status:'blocked',reason:safe});
  }
 }
 await writeFile(path.join(output,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),services:report},null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({directory:output,services:report,started:false}));
}finally{await db.destroy();}
