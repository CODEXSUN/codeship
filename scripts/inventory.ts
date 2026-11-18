import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {workspaceRoot,openDatabase} from '../src/api/database.ts';
import {applicationRepository} from '../src/api/modules/master/application/repository.ts';
import {initializeVault} from '../src/api/modules/master/application/vault.ts';
initializeVault();const {db}=openDatabase();let count=0,secured=0;
try{const repo=applicationRepository(db),existing=await repo.list();for(const area of ['apps','devkit','infrastructure'])for(const entry of await readdir(path.join(workspaceRoot,area),{withFileTypes:true})){
 if(!entry.isDirectory())continue;const owner=area+'/'+entry.name;let pkg:any;try{pkg=JSON.parse(await readFile(path.join(workspaceRoot,owner,'package.json'),'utf8'));}catch{continue;}
 const project=entry.name+'-development';if(existing.some(row=>row.project===project))continue;
 let env:string|undefined;try{env=await readFile(path.join(workspaceRoot,owner,'.env'),'utf8');}catch(error){if((error as any).code!=='ENOENT')throw error;}
 const settings=parseEnv(env??''),prefix=entry.name.toUpperCase().replaceAll('-','_'),port=Number(settings[prefix+'_PORT']);
 await repo.save({name:entry.name,owner,version:String(pkg.version??''),environment:'development',project,host:settings[prefix+'_HOST']??'127.0.0.1',port:Number.isInteger(port)&&port>0&&port<=65535?port:null,username:settings.PGUSER??'',notes:'Imported workspace manifest. Development inventory; deployment is managed only by Codeship.',...(env?{secrets:{env}}:{})});count++;if(env)secured++;
 }console.log(JSON.stringify({applicationsImported:count,encryptedEnvironments:secured}));
}finally{await db.destroy();}
