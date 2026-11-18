# codeship Changelog

## Version State

Current version: 1.0.13

Release tag: v-1.0.13

Changelog label: v 1.0.13

The release-tag field is a naming convention; publishing does not create a Git tag.

## v-1.0.13

### [v 1.0.13] 2026-11-18 - Publish CodeShip on 14350 and preserve other app deployments

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.13.
- Publish CodeShip only on loopback 14350:4350 using the internal-port prefix convention. Probe changed ports before effects, verify exact bindings, update monitoring callers, and preserve unselected service definitions/volumes/networks. Include the independently verified SQLite writer-lock correction. No database schema change.

## v-1.0.12

### [v 1.0.12] 2026-11-18 - Configure explicit local Platform application entry hosts

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.12.
- Configure explicit local application entry hosts through the approved Platform candidate adapter before replacement. Preserve private runtime settings and separate containers. Include the reviewed password-policy default clarification. Typecheck/build and all 60 tests passed; no schema migration.

## v-1.0.11

### [v 1.0.11] 2026-11-18 - Give every application an independent container network and port

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.11.
- Each application owns its container network namespace, private bridge address and loopback port. Private TCP bridges retain existing authentication and origin checks. Platform no longer publishes other app ports or controls their container lifetime. PostgreSQL is reattached to the application bridge without replacing its container. Typecheck/build and all 60 tests passed, including independent endpoints and byte-preserving transport. No database schema change.

## v-1.0.10

### [v 1.0.10] 2026-11-18 - Keep production service credentials independent during installation

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.10.
- Generate an independent production credential when importing a native service token, retaining valid independent saved credentials on retries/updates. Persist recovery settings in encrypted SQLite before admission changes and mark registry notes as prepared until verification succeeds. Fix the credential uniqueness rejection found during Core App installation without repeating its verified data import. Typecheck/build and all fifty-six tests passed; no SQLite migration.

## v-1.0.9

### [v 1.0.9] 2026-11-18 - Bind production app profiles and reuse verified image content

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.9.
- Normalize the reviewed Codexsun production binding for database-free native manifests, preserve explicit scope and reject mismatched service identities or other tenants. All eight current image service contracts pass Platform's production validator before rollout. Reuse an already loaded, exact approved image ID without repeating transfers; registry/archive content and caller label checks remain enforced. Typecheck/build and all fifty-five tests passed. No SQLite migration.

## v-1.0.8

### [v 1.0.8] 2026-11-18 - Unify tagged application installation and migration verification

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.8.
- Add reviewed business application release adapters with isolated PostgreSQL roles/databases, snapshot-consistent first copies, persistent Ecommerce uploads, candidate migration plans and checked recovery dumps only for pending migrations. Keep SDK/gateway traffic on loopback in the applications namespace; preserve unchanged images when reconciling Platform. Prepare admission with the gateway disabled and complete through Platform after runtime verification, without adding user grants. Add all-app source/contract audit and reject unpinned external file dependencies. Typecheck and all fifty-one CodeShip tests passed, including a real concurrent PostgreSQL snapshot test. No CodeShip SQLite migration.

## v-1.0.7

### [v 1.0.7] 2026-11-18 - Isolate Platform databases without adopting existing data

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.7.
- Assign stable isolated Platform database names and a dedicated non-superuser service role. Save encrypted recovery settings before provisioning and update tenant routing only inside the copied master database. Existing target database collisions remain protected. All 48 tests passed; no new schema migration.

## v-1.0.6

### [v 1.0.6] 2026-11-18 - Preserve deployment secrets and validate Platform handoff

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.6.
- Use Compose raw environment files to preserve secret dollars, quotes, hashes, spaces and empty values; require Compose 2.30+. Validate Platform SA/admin/user handoff before provisioning. All 46 tests passed, including actual Docker environment inspection; no database migration.

## v-1.0.5

### [v 1.0.5] 2026-11-18 - Isolate release verification from operator settings

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.5.
- Remove private operator-profile dependencies from operations tests using isolated temporary workspace fixtures and injected profile resolution. Typecheck and all 43 tests pass; production defaults and databases are unchanged.

## v-1.0.4

### [v 1.0.4] 2026-11-18 - Controlled tagged workflow dispatch

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.4.
- Add explicit dispatch on a selected version tag for initial workflow registration/retry. CodeShip accepts only a successful run for that exact tag and commit. Initial tags remain unchanged; no unverified image has been deployed. No new database migration.

## v-1.0.3

### [v 1.0.3] 2026-11-18 - Tagged image releases and managed Docker operations

#### Database Changes

- Database update: Yes (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.3.
- SQLite registry and encrypted install credentials; typed infrastructure forms, direct Docker deployment, container metrics/cards and Devkit grouping. Added GitHub-tag workflows, immutable release sets, safe helper publishing and Platform local deployment adapter. Typecheck/build and all 43 tests passed. Product runtime publication/deployment remains a separately recorded stage.

## v-1.0.2

### [v 1.0.2] 2026-11-17 - Add portable SQLite registry and governed Docker deployment

#### Database Changes

- Database update: Yes (manual). Add a separate SQLite history for the explicit Codeship storage conversion and encrypted application registry. Published PostgreSQL migrations remain unchanged.

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.2.
- Add named local Docker setup/update/verify, candidate migration inspection, conditional verified SQLite backup, immutable image identity and per-stage logs.
- Add application inventory and shared create/edit forms with authenticated encrypted, write-only installation settings.
- Preserve existing PostgreSQL records by explicit read-only import; retain the original source.
- Define Codeship-only local Docker/VPS deployment ownership and the product-specific SQLite exception in central governance.

## v-1.0.1

### [v 1.0.1] 2026-11-17 - Publish Codeship local deployment and monitoring workspace

#### Database Changes

- Database update: No (manual). No schema changes from the audited 0.1.0 implementation.
- Includes the existing module-owned PostgreSQL migrations and explicit deployment-profile seeder.

#### App Codebase Changes

- Publish the local Docker operations workspace with approved deployment execution, saved history, metrics and incidents.
- Set package, lockfile and changelog version to the explicitly requested 1.0.1.
- Connect CODEXSUN/codeship while preserving its initial history and license.
- Verify typecheck, production build, all 13 tests and version consistency; retain documented build warnings and local-only limitations.

## v-0.1.0

### [v 0.1.0] 2026-11-17 - Add local deployment and monitoring workspace

#### Database Changes

- Database update: Yes (manual).
- Add module-owned PostgreSQL migrations for deployment targets, runs, observations and incidents. Explicit profile seeder; no invented runs or measurements.

#### App Codebase Changes

- Create the governed app structure, shared UI/framework references, environment examples, and work records.
- Include app-local GitHub review, version checks, patch bump/preview, and optional SSH-key tools.
- Add approved Docker operations, persisted output/results, target locking, retry protection, health and resource monitoring, incident recovery and shared appearance settings.
- Verify builds, database migrations/seeders, security and operation tests, restart persistence, UI and real Codeitz preflight/update/verification. No publication or cloud connection.

## Ongoing 1.0.2 infrastructure work

- Add module-owned Infrastructure registry migration, encrypted credentials and shared forms for PostgreSQL, Redis, File Browser and legacy MariaDB.
- Add private install/maintenance .env preparation, standalone File Browser named-volume recipe and guarded host setup/verify.
- Verify the real migration with a checked SQLite backup and retain all app records; 22 tests pass. Service installation awaits configured credentials.

- Remove Codeship Nginx; publish loopback port 4450 directly to app:4350 with explicit Docker peer and same-origin protection. Verified the single-container deployment and all 24 tests.

- Align Infrastructure and Registry with standard app-header New, Cancel/Save and scoped Actions; remove duplicate canvas headings/descriptions. Typecheck, Docker build and browser navigation checks passed.
