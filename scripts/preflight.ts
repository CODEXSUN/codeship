import { loadServerEnvironment, requirePreflight } from '@workspace/framework';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appDetails } from '../contracts/app.ts';
import {existsSync} from 'node:fs';
import {codeshipAccessPolicy} from '../src/api/local-access.ts';

export const appRoot = fileURLToPath(new URL('../', import.meta.url));
export async function preflight() {
  const config = loadServerEnvironment({ root: appRoot, prefix: appDetails.prefix, defaultPort: appDetails.port });
  const direct=config.values.CODESHIP_BIND_MODE==='docker-direct';
  if(direct){
    if(!existsSync('/.dockerenv')||config.host!=='0.0.0.0'||config.values.CODESHIP_EXECUTION_MODE!=='inventory'||!config.values.CODESHIP_DOCKER_PEERS)throw new Error('Direct Docker binding requires the reviewed isolated container configuration.');
    codeshipAccessPolicy(config.values.CODESHIP_DOCKER_PEERS.split(','));
  }else if(!['127.0.0.1','localhost','::1'].includes(config.host))throw new Error('Native Codeship must bind to loopback.');
  await requirePreflight({
    name: appDetails.name, root: appRoot, host: config.host, port: config.port,
    requiredPaths: [
      { path: 'src/api/server.ts', kind: 'file', label: 'Server entry' },
      { path: 'dist/web/index.html', kind: 'file', label: 'Frontend build' },
      { path: 'node_modules/@workspace/ui/dist/src/index.js', kind: 'file', label: 'Shared UI build' },
      { path: '.codeship/targets.json', kind: 'file', label: 'Operator deployment profiles' },
    ],
  });
  return config;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await preflight(); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Preflight failed.'); process.exitCode = 1; }
}
