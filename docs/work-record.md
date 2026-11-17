# Work Record

## Goal

Operate local Docker deployments and regular updates across workspace apps, with durable history and monitoring. Local remains development; a future VPS adapter will serve production.

## Completed — 2026-11-17

- Created Codeship from governed app template v22 in `devkit/codeship`, port 4350, using shared framework, MainLayout, Master List, activity feed, cards, confirmation dialogs and appearance settings. No copied UI components or custom styles.
- Reviewed read-only deployment/orchestration samples in `D:/project`; recorded useful patterns and their actual local-only limitations in `reference-review.md`.
- Added separate master Deployment Target, business Deployment and business Monitor modules, public contracts, module-local migrations/seeders and typed table definitions. Created separate local PostgreSQL `codeship` database and restricted `codeship_app` login; credentials only in ignored `.env`. Disposable tests use `codeship_test` and random isolated schemas.
- Registered the existing Codeitz local Docker profile through an ignored operator allowlist. Fixed script and environment paths are contained in each registered app owner; browser requests cannot submit commands, scripts, environment variables or arbitrary hosts.
- Added explicitly approved preflight/deploy/update/verify runs, bounded/redacted saved output, target concurrency enforcement, idempotent retries, interrupted-work recovery and a single operator scheduling lease. App-owned deployment scripts retain backup/migration/recovery responsibility and their own lock. No automatic rollback, deployment retry, unsafe cancellation or coding approval.
- Added minute-based health/container/CPU/memory observations and durable deduplicated health incidents with recovery resolution. Planned deployment maintenance skips probes. Recent record windows are bounded; older records are retained in PostgreSQL. Detailed app tracing, query and queue instrumentation remain future work.
- Added clean Applications, Deployments, record detail, Metrics, Incidents and Settings pages. App/record paths restore on refresh/Back/Forward. Master List state remains local according to its current public contract, documented honestly.

## Verified

- Typecheck, frontend production build, preflight, all three PostgreSQL migrations, repeatable explicit seed and version checks passed.
- 13 tests passed: migrations/IDs, registration, profile containment, redaction/units, approvals, target lock, retry deduplication, saved success/failure, interrupted recovery, health incident lifecycle, planned-maintenance suppression, local/CORS access and repository tools.
- Real Codeitz Docker preflight, verify and update completed through Codeship. Update run `7rhe4zhw` succeeded; post-update verification `kxw6evhy` succeeded and repeated request keys returned the same record. Existing native development remains healthy on 4310; Docker deployment remains healthy on 4410. Native `.env` hash unchanged.
- Saved target/run records survived actual Codeship process restarts. Observed real Docker metrics from three healthy Codeitz containers. Browser approval/result/history, refresh and shared dark theme persistence/reset verified.
- No cloud connection, fresh Codex login, Git commit or push. Other apps/reference services and their data were not reconfigured.

## Next

- Register another app only after its owner provides a verified deployment adapter and isolated environment.
- Add opt-in shared application telemetry for requests, exceptions, queries and queues in a separately approved foundation task.
- Choose VPS identity, credentials and private remote adapter before implementing cloud execution. The current local operator service is not public or multi-tenant authentication.
- Final workspace governance audit passed with zero violations. Codeship database login is non-superuser without create-database/create-role privileges. Local Git initialized for the independent app; .env, .codeship runtime/configuration and node_modules verified ignored. No commit, remote or push.

## 2026-11-17 — Overview and Applications separation
- Moved summary statistics to /overview (also the root landing view). Applications displays deployed app cards only; pending targets and registration stay on Overview so initial deployment remains available.
- Added consistent vertical section spacing through shared UI composition. Typecheck and production build passed. No database, deployment or shared UI changes.

## 2026-11-17 — Requested audit
- Reviewed product documentation, module layout, local request protection, deployment approval/profile restrictions, execution, monitoring and tests.
- Fresh `npm run verify` passed: typecheck, production build, all 13 tests and version consistency (0.1.0). Tests used the isolated test database/schema; no real deployment was requested or run.
- Build warnings remain: main JavaScript chunk is 534.63 kB (159.45 kB gzip), shared dependency `use client` directives, and an extensionless Vite configuration import.
- Repository files are currently untracked; no committed baseline is available. Existing scope remains local Docker operations; cloud execution, multi-user authentication, deeper telemetry and automatic rollback are not implemented.
- No implementation changes. Live browser behavior and current deployed service health were not rechecked during this audit.

## 2026-11-17 — GitHub version 1.0.1 publication preparation
- Read Central Governance, MCP execution contract and repository publishing rules. User explicitly authorized remote connection, commit and push to CODEXSUN/codeship at version 1.0.1.
- Connected origin to https://github.com/CODEXSUN/codeship.git, retained its initial main history and LICENSE, and preserved its ignore rules with the Codeship private configuration exclusion.
- Set app manifest, lockfile roots and changelog to 1.0.1. Shared dependency versions and database schema unchanged.
- Fresh npm run verify passed: typecheck, production build, all 13 tests and version consistency. Existing build warnings remain.
- Prepared publication of app-owned files only; local credentials, deployment allowlist, dependencies and generated build outputs remain ignored. GitHub push result is verified after publication in the chat.
