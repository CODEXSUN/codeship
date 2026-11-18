import {openDatabase} from '../src/api/database.ts';
import {applicationRepository} from '../src/api/modules/master/application/repository.ts';
import type {ApplicationInput} from '../contracts/application.ts';
let input='';for await(const chunk of process.stdin)input+=chunk;
const rows=JSON.parse(input) as ApplicationInput[];
if(!Array.isArray(rows)||rows.length>4||rows.some(row=>!['devkit/codeship','devkit/codeitz','devkit/uiux','apps/platform'].includes(row.owner)||row.project!==(row.owner==='apps/platform'?'applications':'devkits')||row.environment!=='local-docker'))throw new Error('Invalid fixed managed application registry payload.');
const {db}=openDatabase();try{
 const repo=applicationRepository(db);
 for(const row of rows){const existing=await db.selectFrom('applications').selectAll().where('owner','=',row.owner).where('environment','=','local-docker').execute();if(existing.length>1)throw new Error('Ambiguous Docker registry identity.');await repo.save({...row,...(existing[0]?{secretRevision:existing[0].secret_revision}:{})},existing[0]?.public_id);}
 console.log('Devkit registry updated; saved credentials remain encrypted.');
}finally{await db.destroy();}
