# codeship Changelog

## Version State

Current version: 1.0.42

Release tag: v-1.0.42

Changelog label: v 1.0.42

The release-tag field is a naming convention; publishing does not create a Git tag.

## v-1.0.42

### [v 1.0.42] 2026-11-21 - Preserve effective Platform peers and resume checked IILabs setup

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.42.
- Merge Compose environment overrides before transforming Platform configuration, preserving computed peers and existing domains/secrets.
- Add explicit guarded resume for the recorded first IILabs configuration failure only: verify ownership, original checked backup and unchanged public frontend; reuse every existing private credential; skip database/tenant provisioning and attest the real tenant/sole owner using original Platform password verification.
- Keep same-image Platform availability and public-first recovery; refuse normal updates, unknown partial states or a completed backend as setup recovery.
- Reproduced Compose-only peer storage on Ubuntu staging; same-image host readiness, existing devkit logins and IILabs login/save/reopen passed. Focused policy tests and full207 tests passed before one additional credential-retention test, which also passes.

## v-1.0.41

### [v 1.0.41] 2026-11-21 - Upgrade released host metrics and private snapshot publication

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.41.
- Move only the verified existing Hostinger metrics service from the retained21 operator to the clean approved release; preserve its reader/restart policy, private recovery copy and rollback on admission failure.
- Publish redacted metric/log snapshots as root-owned0640 with group1000 only when explicitly configured on a Linux root collector; application containers retain read-only access and no Docker socket or operator key.
- Verified exact old-unit transformation, rejection of other owners/targets, atomic publication, and actual root publisher/non-root read-only access in disposable local Docker. Typecheck and focused tests pass.

## v-1.0.40

### [v 1.0.40] 2026-11-21 - Reconcile private Platform transport before local updates

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.40.
- Reconcile exact managed loopback browser origins before selected local setup/update, activating Platform19’s original private SDK service-context policy.
- Preserve accounts, grants, database schemas and approved image; retain private configuration recovery and restore configuration if admission fails. Adapter rejects Linux/cloud targets.
- Verified original local Codeitz18 login, workspace and both task/chat streams after correction; repeated reconciliation preserves the same Platform container. Three policy tests and typecheck pass.

## v-1.0.39

### [v 1.0.39] 2026-11-21 - Private staging pipeline and independent IILabs backend deployment

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.39.
- Added a separately guarded private Ubuntu staging pipeline with synthetic identities, isolated PostgreSQL, pinned images, SSH tunnel origins, retained ownership and checked off-host master recovery.
- Added explicit IILabs full-backend setup, independent tenant/runtime roles and original public-site recovery on a failed first replacement; default public-only mode remains explicit.
- Transferred owner configuration only through private SSH input; preserved existing verified Platform domains and same-image multi-tenant availability.
- Added VPS-scoped registry mirroring and exact-owner Docker metrics; no new deployment locks.
- Verified staging original login, tab/CSRF/origin isolation, IILabs client save/reopen and existing owner access; UIUX17 interactive preview acceptance passed. CodeShip typecheck/build and195 tests passed; three additional ticket tests passed. Production promotion remains a separately recorded operation.

## v-1.0.38

### [v 1.0.38] 2026-11-20 - Deploy IILabs public pages independently of backend

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.38.
- Added selected stateless IILabs public-site setup/update using its approved image and original public build.
- Reuses shared frontend serving, blocks backend/login with503 and source paths with404, binds only127.0.0.1:14435 and preserves all other containers.
- Local Docker/browser checks passed original Home/Services/Approach/Studio and linked assets. No tenant/database/Platform mutation.

## v-1.0.37

### [v 1.0.37] 2026-11-20 - Match infrastructure cards to existing Docker services

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.37.
- Match VPS and local Infrastructure records to their exact Compose project and service, showing each registered service once.
- Recognize existing File Browser service aliases without cross-project guesses.
- Preserve all records, credentials, volumes and service configuration; no schema changes.

## v-1.0.36

### [v 1.0.36] 2026-11-20 - Wait for reloaded ingress TLS workers

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.36.
- Added bounded transport retries to ingress admission because Nginx reload returns before replacement TLS workers are ready.
- Retains existing certificate and prior configuration on failure; does not install an application.

## v-1.0.35

### [v 1.0.35] 2026-11-20 - Fix public ACME challenge directory permissions

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.35.
- Explicitly set public traversal permissions on every ACME webroot parent while retaining private recovery permissions; run Certbot under its public challenge umask.
- Local Nginx Docker reproduced403 with a private parent and returned200 after the correction. Previous ingress restored automatically after failed certificate admission.

## v-1.0.34

### [v 1.0.34] 2026-11-20 - Add scoped IILabs public HTTPS ingress

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.34.
- Added selected Hostinger IILabs Nginx setup/update entries with existing-account ACME, private upstream, ownership checks and configuration recovery.
- Local Nginx 1.28.3 Docker validation passed for HTTP/TLS configuration, HTTPS absent-upstream 503 and HTTP-to-HTTPS 308. No application deployment or data changes.

## v-1.0.33

### [v 1.0.33] 2026-11-20 - Keep portal sign-in available after workspace access denial

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.33.
- Pin UI 0.1.21 and SDK 0.1.13 to keep public login portals and aliases available after workspace denial, with a form message and selected-tab preparation.
- Preserve the complete published 1.0.32 operator, recovery, migrations and frontend; no deployment or new migration from this patch.

## v-1.0.32

### [v 1.0.32] 2026-11-20 - Preserve historical identity proof during checked Platform migration

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.32.
- Add an explicit reviewed Platform16 historical-preservation path, bounded credential-free metadata transport and exact immutable-image admission.
- Independently restore the current master backup locally and obtain its legacy snapshot through the approved image’s original export; bind the attestation to the scoped SHA before the immutable migration.
- Insert only the three matching historical metadata records, preserve current tenant identities/credentials/roles, and use official retirement authorization/provider/history.
- Adapt the fresh installation payload for the retired master schema while retaining the original private input; reject sessions/business tables before provisioning.
- No changed application migration, public exposure, new deployment lock, direct VPS repair or credential overwrite.

## v-1.0.31

### [v 1.0.31] 2026-11-20 - Add tab-isolated app launcher

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.31.
- Add the authenticated app launcher and tab-isolated Platform sessions, including administrator sign-in.
- Verify selected application metrics through the private host snapshot, with a bounded wait for the collector.

## v-1.0.30

### [v 1.0.30] 2026-11-20 - Recover unchanged Platform service through verified released scripts

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.30.
- Add explicit Platform prior-service recovery through the released Hostinger update entry; require exact approved stopped image/configuration, migration history and independently checked scoped recovery fingerprints.
- Preserve current databases and successful release pointers; refuse recovery after completed migration/replacement, unknown schema/data changes or incomplete proof.
- Probe populated legacy retirement read-only before stopping a writer, and refuse unsupported preservation orchestration without changing schema.
- No new deployment locks, app UI/dependency changes, automatic rollback, database import/reset or VPS source repairs.

## v-1.0.29

### [v 1.0.29] 2026-11-20 - Automate selected setup and updates with scoped Platform recovery

#### Database Changes

- Database update: Yes (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.29.
- Remove deployment file/flock gates and add forward migration removing the per-target deployment index; preserve request deduplication and approval.
- Add selected Platform/Devkit setup/update transport for registered local Docker and Hostinger, explicit product selection, bound operator state and verified current-release no-op.
- Stop Platform updates from importing or initializing missing ownership; require every current master/tenant recovery scope and offhost restore approval before VPS migration.
- Add isolated Docker-in-Docker Platform setup/update harness; actual fresh12setup,13imageupdate/no-op and16migration with two independently restored scoped backups passed.
- Validate routing before provisioning, require matching image-store/client versions, and support explicit hash-bound recorded replacement resume without direct repairs.

## v-1.0.28

### [v 1.0.28] 2026-11-20 - Use clean GitHub latest releases and checked migration recovery

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.28.
- Add selected clean-GitHub update.sh entry with latest stable successful tagged-release discovery, immutable image checks, version/no-op/downgrade guards and exclusive locking. Keep GitHub credentials local and send only temporary approved asset links. Preserve external private state; no server builds or patches.
- Keep image-only updates free of backup/migration work and never migrate unselected CodeShip. Existing PostgreSQL/SQLite migrations require quiescence, checked backup and off-host local-Docker restore approval before schema effects. Failures preserve recovery and block migration.

## v-1.0.27

### [v 1.0.27] 2026-11-19 - Allow explicit SA sign-in after a tenant session

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.27.
- Explicit /sa/login, /admin/login and /login show the original shared form instead of reusing an existing denied session. Submit the requested realm, preserve the old session on failed credentials, and return to the dashboard after successful login. Existing authoritative workspace permission verification remains unchanged.

## v-1.0.26

### [v 1.0.26] 2026-11-19 - Bundle working light and dark logos for shared login

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.26.
- Bundle the app-owned light/dark brand assets in the original shared login instead of nonexistent /logo URLs. No auth, schema, dependency or Cloudflare change.

## v-1.0.25

### [v 1.0.25] 2026-11-19 - Keep existing native and Docker login sessions independent

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.25.
- Pin SDK0.1.9 cookie selection so native and Docker sessions can coexist in one browser. Preserve existing login UI, API paths, dependencies other than SDK, permissions and databases. Duplicate cookies for the expected transport remain rejected.

## v-1.0.24

### [v 1.0.24] 2026-11-19 - Resolve ingress peers on every selected service network

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.24.
- Resolve the existing tunnel connector IP on each network attached to the selected service. Codeitz can be reached through both its Devkits and infrastructure bridge; other services retain their narrower exact-peer list. No Cloudflare, database, dependency or login UI changes.

## v-1.0.23

### [v 1.0.23] 2026-11-19 - Preserve Platform login settings in selected Docker updates

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.23.
- Preserve selected CodeShip environment settings, wire stable private Platform connectivity and exact connector peers, verify metrics directly from the host snapshot, and perform release-identity/permission-aware devkit admission. Reuse the shared exclusive setup/update lifecycle, fresh identity-only Hostinger adapter and existing-SA decision. Retire the rejected custom-login adapter. No database migrations.

## v-1.0.22

### [v 1.0.22] 2026-11-19 - Use the original shared Platform login on approved Docker domains

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.22.
- Reuse the original shared WorkspaceAccessGate and Platform session client. Protect app-owned APIs through authoritative tenant/service/permission checks while preserving direct API paths and existing private defaults. Add explicit browser origin and actual Docker peer configuration. No database migration.

## v-1.0.21

### [v 1.0.21] 2026-11-19 - Use full available Overview canvas

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.21.
- Overview uses the available canvas with responsive padding; Master List and form wrappers retain their existing alignment.

## v-1.0.20

### [v 1.0.20] 2026-11-19 - Live bounded container logs on metric details

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.20.
- Add compact live container logs to metric show pages for Applications, Devkits and Infrastructure, with a fixed288px shared slim scroll area, pause/resume, manual refresh, copy and follow-latest controls.
- Host collector independently samples bounded timestamped stdout/stderr tails for registered containers, redacts known registry/Docker credentials and common secret patterns before writing a read-only cache. No Docker socket or host execution added to the application container.
- Selected-ID/category API uses existing Host/Origin policy, no-store responses and stale/malformed fail-closed behavior. Logs limited to100recent Docker entries/24,000characters per container, max100registered containers.
- No database migration. CodeShip-only deployment; sibling applications preserved.

## v-1.0.19

### [v 1.0.19] 2026-11-19 - Open apps from metric cards and show per-container disk rings

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.19.
- Add accessible external-link icons to application/devkit metric cards and registered app cards, opening actual published app URLs in a separate tab without changing card-details navigation. File Manager also exposes its browser link; database/Redis TCP services do not.
- Replace plain per-container disk text footer with the shared usage ring, comparing writable-layer-plus-mounted-data bytes to Docker filesystem capacity; unavailable capacity remains unknown. Shared filesystem usage remains in the top summary only.
- No database migration; deploy CodeShip only and preserve sibling containers.

## v-1.0.18

### [v 1.0.18] 2026-11-19 - Align dependency startup health and operation deadlines

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.18.
- Allow bounded300s PostgreSQL dependency recovery, retaining fatal credentials/schema checks.
- Align Docker health grace360s and operation wait480s so late dependency recovery leaves child startup and health sampling time.
- Reuse one policy across Platform and business app runtime/Compose generation; add virtual-time near-deadline regression coverage. No database migration.

## v-1.0.17

### [v 1.0.17] 2026-11-19 - Reconcile isolated app ports and recover reused metrics leases

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.17.
- Reconcile reviewed app adapters and standard loopback host/container port mappings, retaining private relays and independent production credentials.
- Render Docker-only Billing/Core browser origins from assigned bindings; preserve native settings.
- Validate metrics collector process identity so a stale PID reused by a browser cannot block live metrics startup.
- Preserve applied migrations and require each target history plan before rollout; database adoption is not implied by port updates.

## v-1.0.16

### [v 1.0.16] 2026-11-19 - Bound container database startup retries and frontend source discovery

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.16.
- Wait for read-only PostgreSQL dependency checks through framework0.2.0 before launching container applications. Retry only recovery/transport errors; preserve fatal credential/schema errors and shutdown cancellation.
- Bound Tailwind source discovery to app frontend sources; keep existing shared UI styling.
- Publish the documented CodeShip loopback port14350:4350 contract. No database migration or live rollout is performed by source publication.

## v-1.0.15

### [v 1.0.15] 2026-11-18 - CRM existing-record Docker adapter

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.15.
- Add least-privilege CRM existing-record copy with MariaDB 11-compatible constraint names and 14355:4355 ingress. Verified copy identities/relationships, typecheck and five targeted tests; CRM v-0.1.2 deployed successfully.

## v-1.0.14

### [v 1.0.14] 2026-11-18 - Restrict single-service maintenance to selected registry and runtime files

#### Database Changes

- Database update: No (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.14.
- Limit registry payloads, rendered environments and workspace maintenance to the selected service. Refuse unselected or duplicate registry owners before writes. Correct the v1.0.13 audit finding that rewrote Codeitz/UIUX registry rows while preserving their containers; Codeitz registry port restored to 14305 without changing its credentials. Preserve all unselected runtime definitions, metadata and secret bytes. No database migration.

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
