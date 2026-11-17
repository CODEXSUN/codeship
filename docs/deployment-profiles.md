# Deployment profiles

Codeship owns the operations record. Each managed app owns its Docker files, migration commands, backups and deployment behavior. Codeship does not copy Codeitz's application-specific deployment script into unrelated apps.

## Register another application

1. Give the app an audited `.container/deploy.mjs` entry point implementing the contract below. Provide a separate deployment environment, Compose project, ports and persistent volumes. Never use native development `.env` or databases.
2. Prepare its private deployment environment before registering. First installation may have no running containers; a health incident is expected until deployment succeeds.
3. Add a profile to the ignored Codeship `.codeship/targets.json`. This is a trusted local operator file, never a browser-supplied command or uploaded configuration.
4. Restart is not required for profiles. Open Applications and select Register, or run `npm run db:seed` explicitly. Registration checks the script/environment real paths and matching project/port.
5. Run Preflight, review the confirmation, Deploy for a fresh installation or Update for an existing release, then Verify and inspect metrics.

```json
[
  {
    "key": "codeitz-local",
    "name": "Codeitz",
    "owner": "devkit/codeitz",
    "envFile": ".codeitz/docker/deploy.env",
    "project": "codeitz-docker-local",
    "port": 4410
  }
]
```

Multiple profiles can use different applications and deployments, with distinct project names and ports. Owners must be direct apps/devkit children. Scripts and private environment files must resolve inside their owner. A changed project/port/owner requires operator review and a distinct registration; database records are not silently repointed.

## App adapter contract, version 1

Codeship launches Node directly with argument arrays, no shell or arbitrary browser commands:

| Action | App command |
| --- | --- |
| Preflight | `node .container/deploy.mjs update --env <private file> --check` |
| Deploy | `node .container/deploy.mjs setup --env <private file>` |
| Update | `node .container/deploy.mjs update --env <private file>` |
| Verify | `node .container/deploy.mjs verify --env <private file>` |

The environment must declare matching `COMPOSE_PROJECT_NAME` and `HOST_PORT`. The public app health route is `/api/health` on that loopback port. Compose resources must use the matching project label. Exit zero means success; nonzero means failure. Bounded stdout/stderr is saved with known secrets redacted. Never emit credentials, user request bodies or database dumps to stdout.

App deploy/update must guard concurrent operations and active workers, preserve volumes/IDs, back up PostgreSQL before migrations, run explicit migrations, avoid update reseeding, verify replacement health and retain recovery artifacts. No automatic destructive rollback. Initial setup refuses retained installations; interrupted initial setup recovery stays a deliberate app-owned operator action.

## Approval, retries and recovery

Every run needs a separate confirmation and unique request key. Retrying that same request key returns the saved run, including after refresh/restart; a conflicting action/key is rejected. PostgreSQL enforces one running operation per target, while the app script's own lock protects other launchers.

Codeship never automatically retries deployments. On server interruption, running records become Interrupted with preserved output. The Docker operation may still be running: inspect containers, app logs and its lock before retrying. Do not delete deployment locks or restore a database merely because Codeship restarted. There is no unsafe Stop button for migrations.
