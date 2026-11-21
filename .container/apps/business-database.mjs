import {businessTarget} from './business-targets.mjs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {readdir} from 'node:fs/promises';
const target=businessTarget(process.env.CODESHIP_APP_NAME),command=process.argv[2];
if(!['plan','migrate'].includes(command)||process.cwd()!=='/opt/codebiz/apps/'+target.name)throw Error('Use the approved application migration adapter.');
if(!target.database){console.log(JSON.stringify({applied:[],pending:[]}));}
else{
 const root=process.cwd(),load=file=>import(pathToFileURL(path.join(root,file)).href);
 let db,runner;
 if(target.name==='core-app'||target.name==='billing'){
  db=(await load('src/api/database/connection.ts')).openDatabase(process.env);
  runner=await(await load('src/api/database/migrate.ts')).createMigrator(db,path.join(root,'src/api/modules'));
 }else if(target.name==='automation'){
  db=(await load('src/api/database/connection.ts')).connectDatabase();runner=(await load('src/api/database/migrations.ts')).migrator(db);
 }else if(target.name==='zetro'){
  db=(await load('src/api/database/connection.ts')).connectDatabase(process.env.ZETRO_DATABASE_URL);runner=(await load('src/api/database/migrations.ts')).migrator(db);
 }else if(target.name==='abconnect'){
  db=(await load('src/api/database/connection.ts')).connectDatabase(process.env.ABCONNECT_MIGRATION_DATABASE_URL);runner=(await load('src/api/database/migrations.ts')).migrator(db);
 }else if(target.name==='iilabs'){
  const scope=new URL(process.env.IILABS_MIGRATION_DATABASE_URL??'');
  if(!['postgres:','postgresql:'].includes(scope.protocol)||scope.hostname!=='postgres'||scope.pathname!=='/app_iilabs'||scope.username!=='app_iilabs_migrator')throw Error('Use the reviewed IILabs migration database and role.');
  db=(await load('src/api/database/connection.ts')).openDatabase(process.env.IILABS_MIGRATION_DATABASE_URL);
  const {Migrator}=createRequire(path.join(root,'package.json'))('kysely/migration');
  const {ModuleMigrations}=await load('src/api/database/migrations.ts');
  runner=new Migrator({db,provider:new ModuleMigrations()});
 }else if(target.name==='ecommerce'){
  db=(await load('src/api/database.ts')).openDatabase();
  const migrations={},base=path.join(root,'src/api/modules');
  for(const file of (await readdir(base,{recursive:true})).filter(file=>/database[\\/]migrations[\\/].+\.ts$/.test(file)).sort()){
   const name=path.basename(file,'.ts');if(Object.hasOwn(migrations,name))throw Error('Duplicate migration name.');migrations[name]=await import(pathToFileURL(path.join(base,file)).href);
  }
  const {Migrator}=createRequire(path.join(root,'package.json'))('kysely/migration');runner=new Migrator({db,provider:{getMigrations:async()=>migrations}});
 }
 if(!db||!runner)throw Error('Missing reviewed database adapter.');
 try{const migrations=await runner.getMigrations();if(command==='plan')console.log(JSON.stringify({applied:migrations.filter(row=>row.executedAt).map(row=>row.name),pending:migrations.filter(row=>!row.executedAt).map(row=>row.name)}));
  else{const result=await runner.migrateToLatest();if(result.error)throw Error('Application migration failed; inspect retained recovery data.');console.log('Application migrations complete.');}
 }finally{await db.destroy();}
}
