# Codeship

Local operations workspace: deploy, update and monitor applications from this repository.

- Open `http://127.0.0.1:4350/applications`.
- Applications: approved Docker targets, health, CPU, memory and health-check latency.
- Deployments: explicitly approved preflight/deploy/update/verify runs, saved output and results.
- Incidents: persisted health failures and automatic recovery resolution.
- Settings: shared theme selection and reset.

Uses shared framework/UI, its own PostgreSQL database and restricted database login. Native app development and deployed Docker databases remain separate. No SQLite, cloud provisioning, automatic updates, Git publishing or fresh Codex login.

## Start

Node.js 26.13.1, Docker Desktop with Linux containers, PostgreSQL 17 and the existing workspace sibling dependencies are required.

```sh
npm ci
npm run db:status
npm run db:migrate
npm run db:seed
npm run typecheck
npm run build
npm start
```

Configure the ignored `.env` from `.env.example` and supply an existing database/password privately. Database/role provisioning is an operator step; startup never creates or migrates data. Seed registers only profiles explicitly approved in `.codeship/targets.json`; it creates no runs or metrics and preserves existing target IDs/settings. `npm run dev` watches the backend; rebuild the frontend after changes.

[Deployment profiles](docs/deployment-profiles.md) · [Monitoring and cloud plan](docs/operations.md) · [Reference review](docs/reference-review.md) · [Work record](docs/work-record.md)
