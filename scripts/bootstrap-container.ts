import {readFileSync,writeFileSync,mkdirSync,chownSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
// Called explicitly by Codeship setup as root. Payload arrives over stdin, never argv/logs.
const payload=JSON.parse(readFileSync(0,'utf8'));
for(const dir of ['/data','/keys']){mkdirSync(dir,{recursive:true,mode:0o700});chownSync(dir,1000,1000);}
if(existsSync('/data/codeship.sqlite')||existsSync('/keys/vault.key'))throw new Error('Initial data/key already exist; inspect setup recovery.');
for(const [file,value]of [['/data/codeship.sqlite',payload.database],['/keys/vault.key',payload.key]]){writeFileSync(file,Buffer.from(value,'base64'),{mode:0o600,flag:'wx'});chownSync(file,1000,1000);}
const db=new DatabaseSync('/data/codeship.sqlite');try{if(Object.values(db.prepare('PRAGMA integrity_check').get()??{})[0]!=='ok')throw new Error('Imported SQLite integrity check failed.');db.prepare('DELETE FROM operator_lease').run();}finally{db.close();}
console.log('Encrypted database and separate vault key installed.');
