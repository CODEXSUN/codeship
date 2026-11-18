import {startHttpServer} from '@workspace/framework';
import {preflight} from './preflight.ts';
import {createServer} from '../src/api/server.ts';
// A copied database must not automatically duplicate the native operator's jobs/sync.
const config=await preflight();
await startHttpServer(createServer({auditRoot:config.auditRoot,syncScheduling:false,workTaskScheduling:false}),config);
