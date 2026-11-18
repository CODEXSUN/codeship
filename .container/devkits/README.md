# CodeShip-managed Devkits

Installation and updates now require successful tagged GitHub releases. See [the release standard](../../../../mcp-governance/docs/tagged-releases.md). Local frozen builds below are historical installation records; they cannot be resumed as a new release.

The local Compose project is `devkits`. Its stable containers are `codeship`, `codeitz` and `uiux`; the infrastructure project remains `codebiz-infra`.

| Service | Version at installation | Local URL |
| --- | --- | --- |
| CodeShip | 1.0.2 | http://127.0.0.1:4450 |
| Codeitz | 1.0.2 | http://127.0.0.1:4451 |
| UIUX | 0.1.5 | http://127.0.0.1:4452 |

## Supported commands

From `devkit/codeship`, use a POSIX shell (Git Bash on Windows):

```sh
sh setup.sh --release-set /absolute/path/to/approved-set.json
sh update.sh --release-set /absolute/path/to/approved-set.json
sh .container/devkits/verify.sh      # verify without replacing services
```

Each service also has `.container/devkits/<service>/setup.sh`, `update.sh` and `verify.sh`. Codeitz and UIUX root `setup.sh`/`update.sh` delegate to those CodeShip-owned scripts. Existing installs require update; setup never resets their data. Prepare the approved set with `node scripts/prepare-release-set.mjs codeship@v-X.Y.Z codeitz@v-X.Y.Z uiux@v-X.Y.Z`. Each selected service needs an explicit successful tagged release; updates preserve data and do not roll back databases.

`npm run deploy:setup`, `deploy:update` and `deploy:verify` invoke these shell entry points. The Node lifecycle backend requires the shell entry marker. Legacy standalone deployment helpers are blocked after group adoption; do not run separate Compose deployments for these services.

## Data and safety

This profile adopts the existing reviewed CodeShip installation and configured infrastructure; it is not a VPS provisioning adapter. CodeShip reuses the exact external `codeship_data` and `codeship_keys` volumes. Codeitz uses its own `codeitz` database/role on infrastructure PostgreSQL. The first install copied native Codeitz data using a consistent PostgreSQL dump and transactional restore; the original native database and development ports remain separate and unchanged. Updates never repeat that import.

Codeitz reuses `codeitz-docker-local_workspace`, preserving its File Manager attachment. A sanitized workspace is copied once, excluding environment files, credentials, Git internals, dependencies and runtime databases. Existing workspace edits are never replaced. `devkits_codeitz_state` and `devkits_codeitz_codex` retain runtime state and future CLI authentication. Git and the pinned Codex CLI come from Codeitz's supplied image contract; Windows credentials are not copied. Automatic sync/task scheduling is paused in the copied Codeitz instance to avoid duplicating the native operator's work. Manual app features remain available; a separate Codex login is required for agent execution.

All HTTP ports bind to host loopback. Explicit Docker gateway peers, local Host validation and same-origin checks protect the apps. Codeitz's unencrypted database connection is explicitly limited to the private Docker hostname `postgres`; other remote PostgreSQL hosts still require verified TLS. No Docker socket or host credential directories are mounted into an application.

## Releases and recovery

Each build uses a frozen source context, application version, source digest and image ID. Prepared images may be reused only when a successful build of the exact tag is recorded. Registry uniqueness is scoped to `(project, owner, environment)`, allowing one group to contain distinct applications while rejecting duplicate registrations.

Only pending schema migrations trigger database backups/migrations. The grouping migration preserved IDs, encrypted secrets, timestamps and sequence counters. Native SQLite writes were locked during its verified online backup and migration. Docker CodeShip was stopped before its backup/migration. The later normal update skipped both.

Private artifacts are under `.codeship/devkits/`: `state.json`, generated `compose.json`, `stages.jsonl`, frozen `builds/`, native migration backups and `private/` database snapshots/rendered environments. Docker migration backups also remain in the CodeShip data volume under `/data/backups`. Keep the vault key separately with portable SQLite recovery. Preserve previous images and these files on failure; no automatic destructive rollback or pruning is performed.

The host metrics collector starts from CodeShip's native API and these deployment commands. Service/owner matching keeps the three Devkits in their own metric category. Native registrations remain in Registry but are omitted from the operational card list when the same owner has deployed Docker metrics.
