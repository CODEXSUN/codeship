> Current deployment uses the CodeShip-managed `devkits` group. See [Devkits operations](../.container/devkits/README.md) for the supported shell entry points and current ports. Standalone lifecycle details below are retained as history.

# Codeship local Docker lifecycle

## Identity and layout

| Item | Reviewed value |
| --- | --- |
| App release | 1.0.2 |
| Compose project | `codeship-local` |
| Browser | `http://127.0.0.1:4450/registry` |
| Native development | `http://127.0.0.1:4320` |
| Runtime image | `codeship-local:1.0.2-<12-character-source-digest>` |
| Containers | `codeship-local-app-1` (single runtime container) |
| Data volume | `codeship-local_data` → `/data/codeship.sqlite` |
| Key volume | `codeship-local_keys` → `/keys/vault.key` |
| Private host state | `.codeship/docker/` (ignored) |

Codeship uses direct Docker access with no Nginx container. Host loopback port 4450 maps straight to the application on container port 4350. The application binds 0.0.0.0 only inside the reviewed isolated Docker runtime. Native development remains bound to loopback. Its app-owned transport policy admits only loopback and explicitly discovered Docker bridge gateway addresses, validates local Host and exact same-origin requests, and ignores forwarded headers. Shared API documentation rendering uses the same per-app policy. No PostgreSQL server, host Docker socket, workspace mount, public login or VPS connection is included. Docker runs registry/history mode; deployment and live metric controls are visibly disabled. The host Codeship operator owns actual execution. The new Docker database is an independent initial snapshot, not an automatically synchronized replica of native development.

`.container/` contains the app-owned runtime recipe and the Codeship orchestration entry point. Setup and update shell files are thin POSIX wrappers around the same Node implementation used on Windows. Their line endings are fixed to LF. Product-specific migrations stay under their owning modules; orchestration stays in Codeship. Source digests cover runtime/build inputs across Codeship/framework/UI, excluding private state, dependencies/build output, documentation, tests and repository tools. Runtime image labels and the release state record the full digest, version and immutable Docker image ID.

## Prepare the operator database

Run inside `devkit/codeship` with Node 26.13.1 and Docker Desktop Linux containers. Build shared dependencies as described in their own READMEs. For a fresh SQLite database:

```sh
npm ci
npm run db:migrate
node scripts/initialize-vault.ts
node scripts/inventory.ts
```

Inventory reads actual direct app/devkit/infrastructure package manifests and encrypts their existing native `.env` blocks without printing them. Existing inventory records are skipped to preserve edits. Missing versions or connection details are not invented; enter them in Registry. It does not start/deploy those apps or turn inventory rows into trusted deployment profiles.

For the existing local PostgreSQL installation only, after SQLite migration and before operations tables contain records, explicitly run `node scripts/import-postgres.ts`. It reads the existing ignored native `.env`, uses a repeatable-read read-only source transaction, and copies original IDs, public IDs, timestamps, histories and links into one SQLite transaction. It refuses a nonempty destination. The PostgreSQL source and its published migrations remain intact. This task imported 1 target, 5 deployment runs and 38 observations at the snapshot point; it did not implement ongoing synchronization.

## Stage 1 — setup

```sh
sh .container/setup.sh
# Windows / same entry point:
node .container/deploy.mjs setup
```

Setup creates only the reviewed private local profile (`codeship-local`, 4450). It rejects an existing release, containers or retained volumes. It creates an exclusive operation lock, builds the candidate image, and uses SQLite's online backup API to snapshot the prepared operator database. The encrypted database and master key travel separately over the bootstrap command's stdin, never in command arguments or output. Bootstrap writes them into separate volumes, verifies database integrity and clears only the copied technical operator lease. Its temporary root process receives CHOWN/DAC_OVERRIDE solely to initialize these two empty volumes; the app runs as the non-root node user with all capabilities dropped.

An interrupted initial setup may use `node .container/deploy.mjs setup --resume` only after inspecting the saved failure. It still refuses an existing release or existing database/key files; it does not overwrite retained data. Setup's first attempt exposed a volume initialization permission issue before any data was written. Adding the narrowly scoped bootstrap permissions resolved it; the subsequent setup succeeded. Both attempt logs were retained.

## Stage 2 — plan schema changes

After building, the candidate image queries the actual target migration table and its module-owned SQLite migration definitions. Applied names and previously recorded checksums must still exist unchanged. New names must sort after applied history. A missing/edited/out-of-order migration fails before replacement. The reviewed PostgreSQL-to-SQLite conversion uses a separate SQLite initial history; original PostgreSQL files are not rewritten.

## Stage 3 — conditional backup and migration

For updates with pending migrations: stop the application to quiesce writes, create a SQLite online backup in `/data/backups/`, verify `PRAGMA integrity_check`, export a copy to ignored host `.codeship/docker/backups/`, and save its SHA-256 and prior image reference. Only then run the explicit migration command from the candidate image. The separate key volume is retained unchanged. Protect an independent copy of the key for disaster recovery; copying a database backup alone cannot decrypt secrets.

With **no pending migrations**, record backup and migration as **skipped** and replace only the app runtime image. No reseed, database service, database image update, volume reset or database copy occurs. The transition from the old topology removes only containers labelled as this project's gateway service, without deleting volumes or stopping another app. Normal startup never creates schema or seed data.

## Stage 4 — update and verify

```sh
sh .container/update.sh
# Windows:
node .container/deploy.mjs update
# Read-only preflight and verification:
node .container/deploy.mjs update --check
node .container/deploy.mjs verify
```

The previous successful release is required. App semantic version plus source digest identifies every image; run timestamps identify logs only. Versions do not bump implicitly. No Git fetch, commit, push or tag occurs. A dependency/infrastructure image change requires a separate review; the local Node version are explicitly constrained.

Verification checks liveness/readiness, registry pages, application/target/run/observation APIs, same-origin denial, no pending migrations and the immutable image ID. A release pointer and private environment are atomically replaced only after verification. Initial seed data is the explicitly prepared database, not generated examples. UI changes persist across container recreation in the data volume.

## Stage 5 — records and recovery

Each operation appends started/passed/skipped/failed events to `.codeship/docker/runs/<timestamp-id>/stages.jsonl` and `stages.md`. The successful pointer is `.codeship/docker/deploy.env.release.json`, including version, source digest, exact image ID, prior image, migration checksums and backup decision. Update app docs/work-record and changelog during authorized changes; no recurring automation is installed.

On failure, retain the lock evidence/logs, current data and key volumes, previous image and any verified backup. Inspect the exact stage before retrying. Do not use `docker compose down -v`, delete deployment state or restore a database automatically. After a completed migration, review compatibility and restore explicitly if needed; rollback code alone does not undo schema changes. An interrupted lock is not automatically stolen. No automated restore, vault rotation or off-host backup schedule is claimed.

## Application registry

Open `/registry`, select an app to edit, or choose New application. Shell-header Save and Ctrl/Cmd+S submit the shared form. Store owner, version, unique deployment name, environment, host, port, username and notes. Installation fields accept `.env`, password, provider token and SSH key. Secrets are AES-256-GCM encrypted with unique IVs and record identity binding. The API never returns plaintext or ciphertext. Blank secret fields preserve saved values; check Clear only for deliberate removal. Revision conflicts require reloading. Keep secrets out of metadata/notes. A saved VPS row does not authenticate a host or enable remote execution.

## VPS responsibility

Only Codeship may own live VPS deployment and updates. Before implementing that adapter, choose the host, verified SSH identity, scoped account, private secret delivery, operator access controls/TLS, backup storage and recovery procedure. Other apps may build and test, but do not independently deploy live. The current implementation deploys locally only.

## SA/admin/user installation settings

Registry New/Edit has Application and Users & secrets tabs. Both remain mounted so switching tabs preserves unsaved input and one header Save submits the whole record. The three fixed roles are sa, admin and user, each with username, email, display name and write-only password. Existing imported .env account metadata is displayed from the encrypted record; saved passwords are indicated but never returned. No passwords are invented and no live identities or privileges are created by saving registry fields.

Account settings map to the current Platform configuration prefixes:

| Registry role | Installation .env prefix |
| --- | --- |
| sa | SUPER_ADMIN |
| admin | TENANT_ADMIN |
| user | TENANT_USER |

Each emits _USERNAME, _EMAIL, _NAME and _PASSWORD when supplied. Metadata and passwords remain in the existing encrypted vault payload, so this change requires no database schema migration. Empty password edits preserve existing values. Duplicate roles are rejected. A saved .env block is merged first; explicit role fields override corresponding values.

For the Codeship Docker target, setup/update includes a registry-environment stage. A candidate-image tool reads only the devkit/codeship + codeship-local + local-docker record from the target database, decrypts internally and atomically writes /data/runtime.env with private permissions. The replacement runtime loads it before starting. The command prints no values; no secret-export HTTP endpoint exists. Protected Node/loader/Docker/Compose and Codeship identity/storage/execution settings cannot be overridden. This stage also runs on image-only updates without triggering a database backup.

For an approved host-managed application, deploy/update matches owner/project/local-docker and validates the registered port before materializing settings into its already approved private deployment environment. Existing deployment identity and other required profile values remain. Read-only checks do not write .env files. A lock, target mismatch or protected override fails closed. Native and Docker registries remain independent; edits must be made in the database used by the relevant operator.

Platform remains the owner of actual account creation, password hashing, realm permissions and tenant membership. Its explicit installation/seed contracts consume these variables; routine updates must not reset existing accounts. Other apps need an approved compatible adapter before these settings can install identities. Codeship itself currently has no public SA/admin/user login system; these are installation credentials, not newly enabled local authentication.

## Direct origin and future Cloudflare Tunnel

The host operator creates/reuses the named external Codeship bridge and records its exact IPv4 gateway as the permitted Docker peer. Startup permits the container bind only with the reviewed docker-direct mode, inventory execution mode and Docker marker; saved registry .env values cannot override these transport controls. No private-subnet-wide peer allowance or trust-proxy setting is enabled. Native request behavior remains unchanged.

The runtime container is the HTTP origin at localhost:4450. Production can later use a Cloudflare Tunnel origin directly, with no Nginx dependency. No Cloudflare tunnel, DNS change, public hostname, Cloudflare Access policy or VPS authentication was configured in this task. The current local Host/Origin rules deliberately do not accept a public production domain. Review the public domain, verified identity/access and exact trusted connector path in the production task. A tunnel alone does not add app user authentication.

## Portable standalone identity

The current default app group is `codeship`, separate from `codebiz-infra`. New setup/update/verify commands use `.codeship/docker/codeship.env`. The default host endpoint remains 127.0.0.1:4450 and container port remains 4350. Image identity is `codeship:<version>-<source-digest>`. Explicit legacy codeship-local profiles remain supported without replacing their release history.

This name is environment-neutral and can be retained on a future Linux VPS. The image and Compose topology are reusable; the current reviewed profile remains private/loopback and inventory-only. Moving to a VPS still requires an explicitly selected host, protected access or tunnel, the target's own Docker gateway configuration, and coordinated transfer of the encrypted SQLite database and its separate key. No public VPS access or remote deployment is configured by renaming the group.

Initial setup takes a consistent online SQLite snapshot from the native workspace and installs it into separate Docker data/key volumes. This is initial data transfer, not an ongoing synchronization mechanism. Later edits in native development and Docker are independent; use the Docker UI when auditing its deployed inventory. Database backup/migration on update remains conditional on pending migrations.
