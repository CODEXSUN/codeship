// Mounted into the approved Codeitz image as scripts/codeship-fresh.ts.
// First installation only: required references, never business/demo records.
import {openDatabase} from '../src/api/database.ts';
import {seed as users} from '../src/api/modules/master/user/database/seeders/seed.ts';
import {seed as priorities} from '../src/api/modules/master/task-priority/database/seeders/seed.ts';
import {seed as statuses} from '../src/api/modules/master/task-status/database/seeders/seed.ts';
import {seed as revision} from '../src/api/modules/todos/database/seeders/seed.ts';
const db=openDatabase();try{
 for(const table of ['projects','tasks','todos','coding_tasks'])if((await db.selectFrom(table as any).selectAll().limit(1).execute()).length)throw Error('Fresh bootstrap refused: existing business records');
 await users(db);await priorities(db);await statuses(db);await revision(db);
 for(const table of ['projects','tasks','todos','coding_tasks'])if((await db.selectFrom(table as any).selectAll().limit(1).execute()).length)throw Error('Reference bootstrap introduced business records');
 console.log('Required Codeitz references initialized; business tables empty');
}finally{await db.destroy();}
