# Codeship

Codeship owns deployment, updates and maintenance for local Docker and future live VPS environments. Other workspace apps supply build/test and schema contracts; they do not independently deploy live.

- Native operator: http://127.0.0.1:4320
- Docker registry/history UI: http://127.0.0.1:4450/registry
- Version: 1.0.6; Compose project: devkits
- SQLite permanent records; encrypted application credentials and .env blocks; separate vault key.
- Overview, Applications, approved Deployments/history, Metrics, Incidents, Registry create/edit and Settings.

## Prepare and deploy

Requires Node.js 26.13.1, Linux Docker and workspace sibling framework/UI dependencies. Run inside this repository:

```sh
npm ci
npm run db:migrate
npm run vault:init
npm run inventory:import
npm run verify
node scripts/prepare-release-set.mjs codeship@v-X.Y.Z codeitz@v-X.Y.Z uiux@v-X.Y.Z
sh setup.sh --release-set /absolute/path/to/approved-set.json
# Windows: npm run deploy:setup
```

`sh update.sh --release-set ...` installs successful GitHub release images by immutable identity. Daily coding does not deploy. A checked database backup and explicit migration run occur only if migrations are pending. Image-only updates retain database/key volumes. `npm run deploy:verify` checks the deployed group. See the [tagged release standard](../../mcp-governance/docs/tagged-releases.md).

Docker runs registry/history mode without a Docker socket or host execution authority. The host Codeship operator executes reviewed deployment scripts. VPS execution is not connected; host identity, private authentication and recovery require a separate implementation. Native/Docker records are independent snapshots, not a synchronized database.

Store .env/password/token/SSH settings through Registry. Secret fields are write-only; blanks retain existing values. Portable recovery needs the SQLite backup **and** its separately protected vault key. Do not commit either.

[Docker stages and recovery](docs/docker-lifecycle.md) · [Deployment profiles](docs/deployment-profiles.md) · [Operations and VPS plan](docs/operations.md) · [Work record](docs/work-record.md)

Infrastructure now includes PostgreSQL, Redis, File Manager and legacy MariaDB inventory, encrypted credentials and private install/maintenance preparation. See [Infrastructure guide](docs/infrastructure.md). File Manager uses the standalone Codexsun File Browser pattern; enter its login before installation.

Local Docker runs the CodeShip-managed `devkits` group: `codeship` on 4450, `codeitz` on 4451 and `uiux` on 4452, with direct loopback HTTP ports. No Nginx gateway is required. Production Cloudflare Tunnel configuration remains a separate step.

## Local web and API ports

Run `npm run dev:api` and `npm run dev:web` in separate terminals. Open http://127.0.0.1:4320; API is http://127.0.0.1:4325. The web server proxies `/api` to its API and refuses an occupied port. `npm start` serves the built app together on the API port. See [port rules](../../mcp-governance/docs/local-ports.md).

### Current Docker deployment

CodeShip, Codeitz and UIUX run in the `devkits` Compose group, separately from `codebiz-infra`. Use root `setup.sh` / `update.sh` or the per-service scripts under `.container/devkits/`; npm deployment commands delegate to these shell entry points. Current release state is `.codeship/devkits/state.json`. CodeShip retains its existing SQLite/key volumes, and Codeitz uses a separate copied PostgreSQL database and editable workspace. Native development remains independent. See [Devkits operations](.container/devkits/README.md).

### Docker metric reports

Infrastructure, Applications and Devkits open the corresponding live metric cards. Direct report routes remain available. The host collector (`npm run metrics:watch`) publishes live scoped Docker snapshots through a read-only mount; the Docker app receives no engine socket. See [Docker metrics](docs/docker-metrics.md) for scope, refresh and startup details.
