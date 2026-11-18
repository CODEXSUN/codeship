import {openDatabase,databaseSettings} from '../src/api/database.ts';
import {applicationMigrator} from './database.ts';
const db=openDatabase();try{const migrations=await applicationMigrator(db,databaseSettings().schema).getMigrations();console.log(JSON.stringify({applied:(await db.selectFrom('kysely_migration' as any).select('name').execute()).map((m:any)=>m.name),pending:migrations.filter(m=>!m.executedAt).map(m=>m.name)}));}finally{await db.destroy();}
