import {readFileSync} from 'node:fs';
import path from 'node:path';
import {databaseFile} from '../src/api/database.ts';
import {deploymentEnvironment} from '../src/api/modules/master/application/accounts.ts';
const file=path.join(path.dirname(databaseFile()),'runtime.env');
const values=deploymentEnvironment({env:readFileSync(file,'utf8')});
Object.assign(process.env,values);
await import('../src/api/server.ts');
