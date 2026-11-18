import {migrator} from './database.ts';
import {openDatabase} from '../src/api/database.ts';
const {db,sqlite,schema}=openDatabase();try{const migrations=await migrator(db,schema).getMigrations();const exists=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kysely_migration'").get();const applied=exists?sqlite.prepare('SELECT name FROM kysely_migration ORDER BY name').all().map(row=>String(row.name)):[];console.log(JSON.stringify({pending:migrations.filter(m=>!applied.includes(m.name)).map(m=>m.name),applied}));}finally{await db.destroy();}
