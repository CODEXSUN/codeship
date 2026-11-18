// Fixed native-development provisioning, owned by CodeShip. No deployment or existing-data import.
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';
import { openDatabase, workspaceRoot } from '../src/api/database.ts';
import { applicationRepository } from '../src/api/modules/master/application/repository.ts';

if (!process.argv.includes('--apply')) {
  console.log('Preview: create automation_local and automation_local_test with a dedicated non-superuser role; save encrypted CodeShip inventory and ignored app environment. Use --apply.');
} else {
  const { db } = openDatabase();
  try {
    const existing = await db.selectFrom('applications').select('public_id').where('owner', '=', 'apps/automation').where('environment', '=', 'development').execute();
    if (existing.length) throw new Error('Automation development inventory already exists; refusing credential replacement.');
    const psql = (input: string) => execFileSync('docker', ['exec', '-i', 'codebiz-infra-postgres-1', 'sh', '-c', 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const collisions = psql("SELECT datname FROM pg_database WHERE datname IN ('automation_local','automation_local_test'); SELECT rolname FROM pg_roles WHERE rolname='automation_local';");
    if (collisions.trim()) throw new Error('Database or role already exists; refusing to replace it.');
    const password = randomBytes(32).toString('hex');
    const url = `postgresql://automation_local:${password}@127.0.0.1:5433/automation_local`;
    const testUrl = url + '_test';
    // Persist the recovery reference before effects; no credentials enter stage output.
    await applicationRepository(db).save({ name: 'Automation', owner: 'apps/automation', version: '1.0.1', environment: 'development', project: 'automation', host: '127.0.0.1', port: 4395, username: 'automation_local', notes: 'Native development PostgreSQL provisioning; verify databases after preparation.', secrets: { env: `AUTOMATION_DATABASE_URL=${url}\nAUTOMATION_TEST_DATABASE_URL=${testUrl}\n` } });
    psql(`CREATE ROLE automation_local LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE;\nCREATE DATABASE automation_local OWNER automation_local;\nCREATE DATABASE automation_local_test OWNER automation_local;\nREVOKE ALL ON DATABASE automation_local FROM PUBLIC;\nREVOKE ALL ON DATABASE automation_local_test FROM PUBLIC;`);
    const envPath = path.join(workspaceRoot, 'apps/automation/.env');
    const values = parseEnv(readFileSync(envPath, 'utf8'));
    values.AUTOMATION_DATABASE_URL = url;
    values.AUTOMATION_TEST_DATABASE_URL = testUrl;
    writeFileSync(envPath, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
    console.log('Created dedicated Automation local/test databases. Credentials saved encrypted in CodeShip and in ignored app environment; values omitted.');
  } catch {
    console.error('Automation database preparation stopped. Inspect fixed target and encrypted registry recovery reference before retrying; no automatic cleanup or rotation.');
    process.exitCode = 1;
  } finally { await db.destroy(); }
}
