import {Migrator,type Migration} from 'kysely/migration';
import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {openDatabase,appRoot} from '../src/api/database.ts';
export function migrator(db:any,schema:string){return new Migrator({db,migrationTableSchema:schema,provider:{async getMigrations(){const migrations:Record<string,Migration>={};async function scan(dir:string){for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await scan(file);else if(path.basename(dir)==='migrations'&&e.name.endsWith('.ts')){const key=e.name.slice(0,-3);if(migrations[key])throw new Error('Duplicate migration name.');migrations[key]=await import(pathToFileURL(file).href);}}}await scan(path.join(appRoot,'src/api/modules'));return migrations;}}});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {db,schema}=openDatabase();try{
 const action=process.argv[2];
 if(action==='migrate'){await db.schema.createSchema(schema).ifNotExists().execute();const result=await migrator(db,schema).migrateToLatest();if(result.error)throw result.error;console.log(result.results);}
 else if(action==='status')console.log((await migrator(db,schema).getMigrations()).map(m=>({name:m.name,applied:!!m.executedAt})));
 else if(action==='seed'){for(const file of ['master/deployment-target','business/deployment','business/monitor'])console.log(await(await import(pathToFileURL(path.join(appRoot,'src/api/modules',file,'database/seeders/seed.ts')).href)).seed(db));}
 else throw new Error('Use migrate, status or seed.');
 }catch(error){console.error(error instanceof Error?error.message:'Database command failed.');process.exitCode=1;}finally{await db.destroy();}
}
