import {backup,DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {databaseFile} from '../src/api/database.ts';
const destination=process.argv[2];if(!destination||existsSync(destination))throw new Error('Provide a new backup filename.');mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});
const source=new DatabaseSync(databaseFile(),{readOnly:true});try{await backup(source,destination);}finally{source.close();}chmodSync(destination,0o600);
const copy=new DatabaseSync(destination,{readOnly:true});try{const result=copy.prepare('PRAGMA integrity_check').get();if(!result||Object.values(result)[0]!=='ok')throw new Error('Backup integrity check failed.');}finally{copy.close();}console.log('SQLite online backup and integrity check passed.');
