# Work Record

## 2026-11-18 — Automation local database preparation

- Added scripts/prepare-automation-database.ts as a fixed native-development operator command. Preview is read-only; --apply refuses pre-existing Automation development inventory/databases/role and never rotates or drops them.
- Executed the authorized preparation for apps/automation: created automation_local and automation_local_test with a dedicated non-superuser role, saved recovery credentials in the encrypted application inventory before effects and wrote ignored app environment values without printing them.
- Automation authenticated, applied its owned migration and passed real database queue tests. CodeShip typecheck passed with the new preparation command. Existing infrastructure runtime, bindings, volumes, application databases and unrelated pending CodeShip changes were preserved. This is native database setup, not application image deployment or a new CodeShip release.

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

## 2026-11-17 — SQLite inventory and governed local Docker lifecycle (1.0.2)

### Decisions and scope
- User authorized organised Codeship setup/update scripts, actual local Docker deployment and verification, migration-only update backups, stage documentation and exclusive Codeship ownership of local Docker/live VPS maintenance.
- User then explicitly selected permanent SQLite and central application/credential/.env inventory with create/edit forms. This overrides the earlier PostgreSQL choice only for Codeship. Existing PostgreSQL migration files, source database and other apps remain intact.
- Version 1.0.2, fixed project codeship-local and loopback 4450; native development stays on 4350. Image identity is semantic version plus runtime/build source digest, with full digest and immutable image ID retained in the private release record.
- The isolated Docker runtime is explicitly registry/history mode without host Docker access. Host Codeship executes deployment commands. Remote VPS execution and public authentication remain unimplemented; governance records ownership without claiming runtime enforcement.

### Implemented
- Native Node SQLite adapter for Kysely, WAL/foreign keys/busy timeout, module-local independent SQLite migrations, SQLite-compatible operations/monitoring queries and expiring singleton operator lease.
- Explicit read-only PostgreSQL-to-SQLite importer preserved 1 target, 5 deployment runs and 38 observations at the import snapshot. Native PostgreSQL continues to exist; no ongoing sync or destructive conversion.
- Imported 9 actual app manifests and encrypted their existing native .env blocks. Added a real Codeship Local deployment record through the frontend (10 records total) and refreshed non-secret host/port/account metadata without changing encrypted values.
- AES-256-GCM credential vault with random per-write IVs and record identity binding. A separate 32-byte key lives outside SQLite. API responses contain presence/revision metadata only; blank secret edits retain existing values, explicit clear is supported and stale revisions return conflict.
- Shared Master List and Upsert Form create/edit screens at /registry, /registry/new and /registry/:id/edit; shell-header Save, keyboard submission, actual API persistence, private installation fields, error/loading states and API specification for the new routes. OpenAPI version now follows package.json.
- App-owned Dockerfile/Compose, setup.sh/update.sh (LF, thin wrappers), Node setup/update/verify and policy helper. Separate persistent data/key volumes, non-root app and gateway, loopback-only published port, no PostgreSQL container or host socket.
- Explicit initial encrypted database/key bootstrap. First setup failed before writing data because dropped capabilities prevented root access after volume ownership changes. Retained the failed stage log; a reviewed bootstrap-only CHOWN/DAC_OVERRIDE scope allowed empty-volume setup to resume safely and succeed.
- Candidate image migration inspection uses actual persisted history, checks immutable applied files and ordering, and conditionally stops writers, creates/verifies/exports a SQLite backup with SHA-256 before migrations. No-migration updates skip backup/migration/reseed and replace app plus its namespace-bound gateway; retain data/key volumes.
- JSONL and Markdown stage logs, exclusive deployment lock, previous image/recovery references and atomic successful release pointer. No automatic retry/rollback or Git publication.
- Added central Codeship ownership/SQLite/secret-handling guide and links from governance, architecture and migration guidance. Preserved unrelated governance work. Updated README, lifecycle, operations, deployment-profile and migration docs.

### Verified
- npm run verify passed: typecheck, production build, 17 tests and version checks. Existing bundle/directive/config-loader warnings remain.
- Tests include SQLite operation persistence, API local/origin denial, locks/idempotency/recovery/incidents, encrypted secret API behavior, wrong-record ciphertext rejection, blank preservation/explicit clear/stale edits, WAL-aware readable backup, migration backup decisions/immutability, and inventory execution capability boundaries.
- Actual Docker initial setup and two no-migration image updates succeeded. Final image: codeship-local:1.0.2-5f2e659bcb19. App and gateway both healthy; version/source labels matched the saved release identity.
- Final container integrity check returned ok; decrypted 9 imported environment blocks internally without printing them. Retained 10 registry rows, 1 deployment target, 5 runs and 38 observations across image replacements.
- Browser verified create and edit with real persisted records, stored-secret fields remaining blank, and Codeship development port updated to 4350. Those edits survived actual Docker replacements. Screenshot: registry-verification.jpg.
- Deployment verifier passed liveness/readiness, registry pages and APIs, target/run/observation reads and cross-origin denial. OpenAPI 1.0.2/new registry routes verified. POSIX setup/update shell syntax checks passed inside the runtime.
- Final stage record explicitly has database-backup skipped, migration skipped and backupCreated false. No actual new database migration was pending during these Docker updates; migration-backup behavior was covered by isolated tests rather than a fabricated production migration.

### Limits and next steps
- Automatic approval review rejected the attempted native-process restart command as blocked by policy, without a more specific reason. That command did not execute. Port 4350 remains the existing native process and needs a manual restart to load the new SQLite code; the deployed Docker UI at 4450 is current. Do not assume native/Docker databases synchronize.
- An independently protected vault key plus online SQLite backup is required for disaster recovery. Automated restore, key rotation and scheduled off-host backups are not implemented.
- Register/verify a private host-execution or VPS adapter before enabling deployment controls in the isolated container; a saved credential row is not execution authorization.
- New source/governance changes remain local and uncommitted; the earlier 1.0.1 GitHub publication is unchanged. No other app was deployed/reconfigured in this task.

## 2026-11-17 — Three installation users and deployment environment integration
- User specified sa/admin/user for the pending registry change, then requested a Platform audit. Platform passed npm run verify (20 tests) and all 3 disposable PostgreSQL tests; its real account prefixes/realm rules informed this implementation. Audit recorded in Platform work record; no Platform implementation, accounts or live database changed.
- Added Application and Users & secrets tabs, three fixed installation account forms and encrypted persistence in the existing vault payload. API exposes safe user metadata/password-presence flags only. Passwords are write-only and blanks preserve values; no fake credentials, identities or authority are created.
- Added tested role mapping to SUPER_ADMIN, TENANT_ADMIN and TENANT_USER .env settings. Approved host deploy/update consumes matching registry secrets only after owner/project/environment/port checks; read-only checks retain existing behavior and protected settings cannot be injected.
- Added Docker registry-environment stage and private /data/runtime.env, loaded by the replacement container before server startup. Runtime identity, storage paths and execution authority remain protected. No schema migration is needed for the existing encrypted payload; regular backup policy remains migration-only.
- Fresh npm run verify passed typecheck, build, all 18 tests and version consistency before local Docker update. Added integration coverage for encrypted three-user save, safe responses, password retention, exact prefix mapping, actual private .env output, identity mismatch rejection and protected overrides. Final Docker/browser results recorded after deployment below.
- Final Docker update succeeded with registry-environment passed and database backup/migration skipped. /data/runtime.env exists with mode 0600; no credentials were supplied for Codeship Local, so its generated environment is intentionally empty. Ten existing application records remain, each exposes three safe role metadata entries and no password fields.
- Browser verified the Application and Users & secrets tabs, SA/admin/user fields and preservation of an unsaved display-name edit across tab changes; restored the field without saving invented accounts. Screenshot: users-secrets-verification.jpg. Existing stored passwords are tested using isolated fixtures; no live credentials or real identities were reset.
- Source changes remain local/uncommitted. The separate native process on 4350 was not restarted. No Platform deployment or account changes were performed.

## 2026-11-17 — Infrastructure registry and standalone shared File Manager
- User requested PostgreSQL, Redis, File Manager and legacy MariaDB with encrypted installation/maintenance credentials; clarified File Manager is standalone with app-volume access, using Codexsun as the reference. User chose to enter the File Manager login in Infrastructure; no login was generated or silently copied.
- Read Codexsun media Compose/Dockerfile/environment sample without changing that repository. Confirmed File Browser v2.63.5 standalone root/service-database pattern, Redis 7.4-alpine and legacy MariaDB 11.8 reference definitions. These are inventory/recipe versions, not running-service claims.
- Added a separate infrastructure-service module, public contracts, explicit SQLite migration 20261117000500_infrastructure_services, encrypted CRUD/revision handling, safe credential-presence responses and private install/maintenance .env preparation. Added four explicit requested service inventory records while preserving existing records.
- Added Infrastructure navigation/list/New/Edit and shared form tabs Service, Credentials, Maintenance & storage. Installation and maintenance artifacts can be prepared from saved credentials; missing credentials fail closed. No host Docker execution authority was added to the container UI.
- Added standalone File Browser recipe generation with pinned image, loopback 7090, separate service database, bcrypt bootstrap password, disabled command runner and existing named app-file-volume bindings at /srv/<owner>. Rejected duplicate/traversal/database/key/internal-state bindings. The existing Codeitz workspace binding is prefilled. Other native-development apps have no verified Docker file volumes yet; they are not falsely marked connected.
- Added guarded host File Manager setup/verify command with retained-installation refusal, explicit existing-volume checks, private recipe and stage/release records. Fixed Compose literal-dollar escaping for bcrypt hashes; Docker Compose model round-trip test verifies the hash is preserved. The host-only script passed syntax verification. Actual File Manager installation/login remains pending operator credential entry; it was not started.
- Updated central Codeship ownership guidance, app infrastructure operations docs and infrastructure/services/file-manager owner documentation. Service-specific unattended PostgreSQL/Redis/MariaDB updaters and File Browser credential rotation remain unimplemented; preparing .env files does not claim those effects.
- Fresh verify passed typecheck/build, initially 21 tests and version checks; after the Compose regression check, all 22 tests passed. New coverage includes encrypted service credentials, safe API responses, private .env writes, password preservation, revision/type conflicts, local-origin denial, all four service variable contracts, File Browser hash/mount validation and Docker Compose escaping.
- Actual Codeship Docker update succeeded. Its real pending migration triggered a SQLite online backup, integrity check, host export and SHA-256 record before migration. Independently rechecked exported backup checksum and SQLite integrity (ok). Migration, four-record registration, readiness/page/API checks and final release stage passed. All 10 application records were preserved.
- Browser verified Infrastructure and File Manager type/version/name, shared Codeitz volume mapping and blank credential controls. Left File Manager credentials open for the user. Evidence: infrastructure-verification.jpg. No passwords were entered or exposed during browser checks; no external infrastructure service was installed/restarted.
- New work remains local/uncommitted. Existing native process and other apps remain unchanged.

## 2026-11-17 — Remove Codeship Nginx and use direct Docker origin
- User explicitly requested removing Nginx and publishing Codeship directly locally; production is intended to use Cloudflare Tunnel later. Scoped this change to Codeship, preserving Codeitz and its existing gateway/database.
- Removed the gateway service and nginx.conf. Codeship now binds container-only 0.0.0.0:4350 and publishes 127.0.0.1:4450 directly. Native development remains loopback-only.
- Added app-owned direct-Docker transport policy: exact discovered bridge gateway IPs plus loopback, local Host validation, exact same-Origin checks and no forwarded-header trust. Startup permits the container bind only with explicit docker-direct/inventory settings and a Docker marker. Registry .env values cannot override the transport settings.
- Kept shared API documentation rendering with the same app-owned guard; no framework changes or copied documentation implementation. Added tests for direct API/readiness/docs, invalid hosts/ports, foreign peers/origins and forwarded spoofing.
- Updated the deployment script to inspect/create the named bridge, record the exact peer, drop the obsolete NGINX_IMAGE setting and remove only containers labelled as the Codeship gateway service during replacement. No volume deletion or broad orphan cleanup.
- npm run verify passed typecheck, production build, all 24 tests and version consistency. Actual image update succeeded: codeship-local:1.0.2-3104eaea1411. No migration was pending, so backup/migration were skipped and backupCreated is false.
- Verified actual direct HTTP 200 for registry, infrastructure, documentation/OpenAPI and read APIs on 4450; observed the allowed Docker transport peer 172.19.0.1. An actual separate container on the same bridge received 403 even with spoofed local Host; a foreign browser Origin also received 403.
- Confirmed only Codeship app-1 remains, published host address is 127.0.0.1, gateway container is absent, data/key volume names are unchanged, all 10 application and 4 infrastructure records remain and Codeitz container IDs are unchanged.
- Updated lifecycle and central ownership docs for direct origin/future tunnel. No Cloudflare tunnel, public hostname/DNS, Cloudflare Access policy, VPS or public app authentication was configured. Production domain/verified access is a subsequent task. Source changes remain local/uncommitted.

## 2026-11-17 — Infrastructure and Registry standard header layout
- Read central live-module construction rules and the current shared AppHeader breadcrumb/action contracts. Scoped the request to Infrastructure/Registry control placement and duplicate heading/description removal; retained existing list-to-edit operation support.
- Removed page-canvas headings, introductory descriptions and duplicate local New/Cancel/Back controls. Lists now start with the shared Master List toolbar/table; their New button lives in the persistent app header and is independent of list loading/error state.
- New/Edit routes now use module/New or module/public-reference/Edit breadcrumbs with Cancel then Save in the app header. Infrastructure's existing install/maintenance preparation commands use the shared header Actions dropdown before Cancel/Save. Route-scoped action registration prevents old record actions appearing on another module.
- Preserved form IDs, tab fields, credential behavior, supported routes and all APIs/data. No schema migration or new backend tests were needed for this reversible UI layout change.
- Typecheck and the actual Docker production build passed. Codeship image replacement and deployment verifier succeeded with no pending migration; backup/migration were skipped according to policy.
- Browser verified Infrastructure list header New while loading, New/Cancel navigation, Edit breadcrumbs/Actions/Cancel/Save, both preparation menu entries, Registry header New and New/Cancel, and removal of stale Infrastructure actions after switching modules. Both canvases have no duplicate page heading/description. No records or credentials were saved or changed during browser verification. Kept the user's original tab untouched by testing in a separate tab.
- Screenshot: module-header-verification.jpg. Updated module-layout documentation. Source changes remain local/uncommitted.

## 2026-11-17 — Relevant sidebar icons
- User requested distinct, relevant icons for the sidebar items shown in their screenshot.
- Added existing lucide-react icons through the shared MainLayout navigation contract: Infrastructure Server, Registry NotebookTabs, Applications AppWindow, Deployments Rocket, Incidents TriangleAlert. Shared Overview and Settings icons remain unchanged.
- App-only presentation change; no new dependencies, shared UI changes, routes, credentials or data changes. Typecheck passed; local Docker rebuild/replacement verification recorded below.
- Actual Docker production build/replacement and deployment verifier passed; no pending migration, so backup/migration were skipped. Browser inspected all five rendered Lucide classes and visually verified the distinct icons. Screenshot: sidebar-icons-verification.jpg. Source remains local/uncommitted.

## 2026-11-17 — Fill registry/SQLite from current Codeitz, Platform and Codeship data
- User authorized collecting current configuration and .env variables from the three owners, filling Codeship SQLite for later manual edits. Read source settings privately and preserved original files, account ownership and unknown values.
- Added an explicit host refresh script with read-only preview, scoped owner/profile discovery, revision-checked transactional SQLite import, encrypted full source snapshots and filtered managed Docker environment values. No credentials are passed in command arguments, logs or public API responses. Source/private key files and other application databases were not changed.
- Initial transaction updated 4 existing application records, added the actual existing Codeitz Docker deployment inventory record, imported/verified 89 source variables and refreshed 1 PostgreSQL infrastructure connection. A subsequent Docker-only refresh captured the final deployed Codeship profile after the UI metadata update. Inventory totals 11 applications, including the five refreshed records.
- Filled available manifest/version, native/Docker host/port/account metadata, database credentials and Platform's SA/admin/user installation names/emails/passwords from its private .env. Codeitz/Codeship do not define those identities, so Platform credentials were not copied into them. No live account/password/permission reset or other-app deployment occurred.
- PostgreSQL version was inspected through a local read-only Platform master connection when available; its infrastructure notes distinguish native source settings from a shared Docker deployment. Existing Redis/File Manager/MariaDB entries were preserved; these three owners do not supply their missing credentials.
- API exposes only sorted stored source-variable names plus existing credential-presence flags. Registry edit now displays that inventory, with values still encrypted/write-only and blank secret fields preserving saved values. Added a focused regression assertion that variable names are exposed while secret values are absent.
- Typecheck and all 5 registry tests passed; actual Docker build/update/deployment verifier passed with no pending migration or backup. Independently verified encrypted source snapshots (5), exact variable count (89), Platform configured accounts (3), SQLite integrity (ok) and absence of actual source passwords in public application API responses.
- Browser verified CodeShip Local's 13 stored variable names and unchanged write-only controls without entering/saving any credentials. Screenshot: current-environment-verification.jpg. Other application records/manual fields remain; missing SSH/API credentials and undefined account fields are intentionally blank, not invented.
- Source changes remain local/uncommitted; updates are in the live Docker SQLite on 4450. Manual refresh/import is opt-in; no recurring synchronization or automation was created.

## 2026-11-17 — Editable .env fields with masked secrets and Show
- User explicitly requested all Registry .env variables as key/value fields, view/edit/save to SQLite, secret masking and a Show option. This authorizes the narrowly scoped local reveal exception documented in central Codeship operations; general list responses and unrelated credential fields remain write-only.
- Added Environment tab with current imported/managed variable rows, normal visible values, conservative default masking for secret/unknown types, per-value Show/Hide and Add variable. Only modified rows are submitted; placeholders and unchanged revealed rows are not saved as replacement passwords. Header Save retains standard behavior and stale revisions reject conflicting writes.
- Added no-store environment metadata and record/key/revision-scoped explicit POST reveal under existing local/Docker Host/Origin/peer policy. No generic vault export, browser persistent storage, public-domain enablement or secret logging. General application API responses still contain no secret values/ciphertext.
- Save re-encrypts edits in the existing vault, preserves untouched values, supports intentional empty/new values and synchronizes matching installation account aliases. Imported source controls remain visible/editable as saved configuration but are excluded from managed Docker runtime overrides, preserving approved deployment identity.
- Fixed .env serialization to verify a lossless Node-parser round trip rather than JSON escaping, covering spaces, quotes, dollar/hash characters and backslashes. Unsupported single-line/quote forms produce safe validation errors instead of corrupting values.
- npm run verify passed typecheck, production build, all 26 tests and version checks. New tests cover default masking, targeted reveal/no-store, foreign Origin rejection, encrypted persistence, untouched/empty/new values, stale and invalid edits, protected controls, account password synchronization and quoting.
- Actual Docker image update and deployment verifier passed with no pending database migration; backup/migration skipped and data/key volumes retained.
- Browser verified Environment rows, normal values, masked fields, Show -> text and Hide -> password. Submitted a row at its unchanged configured value (CODESHIP_PORT=4350) through the real header Save and reopened the record; no operational port or secret was changed. Screenshot: environment-editor-verification.jpg. No actual password/private key was revealed during browser verification.
- Post-save checks confirmed 11 application records, all 89 variables across the five refreshed records, default null values for masked secrets, no-store response headers, correct encrypted SQLite save, protected runtime filtering and SQLite integrity ok.
- Updated central exception and environment/current-data docs. No source .env, actual account/password, other app or production tunnel was changed. Work remains local/uncommitted.

## 2026-11-17 — Dedicated local port pair

- Set web 4320 and API 4325; updated environment defaults, development commands, strict Vite binding/API forwarding and applicable local navigation links. Existing unrelated work preserved.
- Typecheck and resolved Vite listener/proxy audit passed. No database migration/reset or production deployment. UIUX restart and web/API forwarding were verified live; other apps require their own terminal restart to adopt new settings. See central local-ports guide.

## 2026-11-17 — Compact environment table and inline pencil editing
- User supplied a visual reference and requested the Environment editor in the same light, simple table tone.
- Replaced repeated field cards with the shared Table composition: softly tinted key column, plain displayed values, thin borders, right-aligned pencil actions and a small count/saved/revision toolbar. Kept shared semantic colors and form/header Save behavior.
- Pencil enters inline editing. Check/Enter applies to the draft; X/Escape restores/cancels the row. New variable rows are editable drafts. Secret values retain masked display and accessible eye Show/Hide controls; Apply/Cancel are disabled while a reveal request is pending to avoid acting on an incomplete reveal.
- Preserved API contracts, encrypted storage, revision checks, runtime profile protections and all existing data. This presentation-only change adds no schema or backend tests.
- Typecheck and Docker production build passed. Browser verified existing-row cancellation, draft state, Enter applying without submitting the form, actual header Save/reopen (revision 3 to 4 with the configured port restored to its original 4350), discarding a new unsaved variable and Show/Hide on a non-credential build digest. No actual secret or operational setting was changed.
- Screenshot: environment-table-verification.jpg. Updated environment editor documentation. Final deployment status recorded after completion below.
- Final Docker replacement (including the pending-reveal button guard) succeeded and its saved release/image identity matched the running container. Deployment checks passed, no migration/backup was needed, 11 application records and the saved 13-variable CodeShip profile remained intact. Existing APIs/SQLite behavior were unchanged. Source remains local/uncommitted.

### 2026-11-17 — Local port conflict resolved
- Verified the stale CodeShip listener on 4350 using /api/live, then stopped that exact process.
- Started CodeShip API on its registered 4325 port and Vite frontend on 4320.
- Verified both /api/live endpoints return HTTP 200 and service codeship; port 4350 is free for CRM.
- Workspace port audit passes: all nine registered web/API pairs are unique and configured. Other app and database processes were preserved.


### 2026-11-17 — Table editors and native SQLite infrastructure
- Application, Users & secrets, and all Infrastructure edit tabs now use the public shared InlineFormDetails block: tinted label cells, values, pencil editing, apply/cancel, and app-header Save. An open draft is included in header submission. No nested forms or row-level database saves.
- Credential values remain write-only; blank replacements preserve saved credentials. Stored-field presence flags contain no secrets. Show/Hide only reveals replacement drafts. Environment retains its existing targeted reveal behavior.
- Native SQLite was missing migration 20261117000500. Created `.codeship/backups/before-infrastructure-20261117.sqlite` with online backup and successful integrity check, then applied that migration. Registered four infrastructure records with the existing idempotent seed script; existing application data was preserved. Credentials not supplied remain unconfigured.
- Built shared UI and Codeship; Codeship and UIUX typechecks pass. All 26 Codeship tests pass. Existing Vite directive/config warnings remain.
- Verified at http://127.0.0.1:4320: Application pencil editor, header Save while editing, Users & secrets password masking and Show/Hide, Infrastructure list (four records), Service header Save, Credentials and Maintenance & storage tables. No test credentials were stored.
- Local CodeShip API restarted on 4325 after the previous operator lease expired; frontend remains on 4320. No Docker/VPS deployment was performed.

### 2026-11-17 — Populate native operational inventory
- Added explicit native refresh dry-run/apply script; no Docker database synchronization or deployment.
- Applied current manifests and 109 source environment variables across nine apps, with encrypted roundtrip verification and source-relative edit preservation in one transaction. Retained public IDs, custom fields, existing saved credentials and unrelated records.
- Filled Platform SA/admin/user installation metadata, PostgreSQL credentials from Platform and legacy MariaDB credentials/Redis address from Codexsun. Redis and File Manager passwords were unavailable and remain for operator entry. No account reset or live service change occurred.
- Typecheck passes; SQLite integrity check ok. Local 4320 API reports nine applications, four infrastructure records and healthy readiness. No migration was required.

### 2026-11-17 — Infrastructure deployment names
- Removed only the codeship- prefix from all four native SQLite infrastructure deployment names: postgres-local, redis-local, files-local, mariadb-legacy-local. IDs and encrypted credentials are preserved; revisions incremented in one transaction.
- Updated seed defaults and File Manager adapter name validation, retaining compatibility with existing prefixed recipes. Seed detects existing kind/environment records to avoid duplicates.
- Typecheck and all four infrastructure tests pass. Verified names through local 4320 API. No Docker containers or persistent volumes were renamed or deployed.


### 2026-11-17 — Consolidate fixed Infrastructure service editors
- Removed duplicate editable name and generic Credentials tab. Existing kind is fixed; name follows kind on save. Connection fields now depend on PostgreSQL/MariaDB, Redis or File Manager. SQL database is optional; File Manager alone exposes app file volumes.
- Deployment & maintenance keeps operational settings and MariaDB-specific root bootstrap credential. Removed generic env/token/SSH and blanket clear controls from the form without deleting existing encrypted values. Hidden fields preserve prior metadata on submit.
- Typecheck/build and all four Infrastructure tests pass, including root-connection bootstrap mapping. Verified all four connection forms and File Manager header Save at local 4320. Screenshot: infrastructure-consolidated-local.png.
- API restart was rejected by automatic approval review (blocked by policy). Existing API remains running; the root-password preparation helper change is pending restart. Live frontend changes are active. No schema change or deployment occurred.

### 2026-11-17 — Docker ports and SQL exposure policies
- Added nullable Docker port, local/public/whitelist mode and allowed source fields via migration 006. Created integrity-checked online backup `.codeship/backups/before-infrastructure-network-20261117.sqlite` before applying the pending migration. Existing rows remain local; public IDs, credentials and host ports preserved.
- Added separate Docker port/list Binding columns and SQL-only external/whitelist checkboxes. Backend validates ports, SQL-only exposure and IP/CIDR entries. Defaults do not expose any service.
- Prepare writes a network policy artifact; whitelist remains bound locally until a firewall-capable installer exists. No host firewall, Docker service or public binding was changed. File Manager recipe now honors its Docker port while retaining loopback-only exposure.
- Full suite passed 27 tests before the final File Manager port addition; subsequent six Infrastructure tests pass, including the new File Manager mapping test. Typecheck and production build pass.
- Verified local 4320 list columns, MariaDB Docker port/public/whitelist draft controls and Redis absence of exposure controls. Discarded the unsaved public/whitelist draft. Screenshot infrastructure-network-options.png shows the unsaved draft only.
- User agreed to restart native API after migration because automatic approval review blocked the prior restart. New save/preparation handlers require that restart; UI and schema are current.

### 2026-11-17 — Refresh all available native fields
- Reapplied the explicit native source refresh: nine apps and 109 source variables, retaining saved credentials and source-relative edits. Four infrastructure records retain existing binding choices; any missing Docker port is filled from its service default.
- All six migrations already applied; no schema change or migration backup needed. SQLite integrity ok and local 4320 Infrastructure/readiness APIs verified.
- Redis and File Manager login settings are absent from available sources; existing values are preserved and unavailable credentials remain unset. No public binding, firewall or Docker deployment changed.


### 2026-11-17 — Resolve live Infrastructure validation mismatch
- Reproduced Provide valid operation fields in the visible 4320 MariaDB editor. Confirmed current source schema accepts the stored connection/network payload, while the stale API process rejected it.
- Under the user's live-fix request, stopped the verified CodeShip API process 7504 successfully, waited for its singleton lease to expire, then restarted the current API on 4325. No bypass or alternate port was used; no schema or credential changes were required.
- Reloaded the live form and pressed header Save; it succeeded and returned to the Infrastructure list. Local-only bindings preserved. Proof: infrastructure-save-fixed.png. This restart also activates the previously pending network/save/preparation handlers.

### 2026-11-17 — SQLite-driven infrastructure Compose generation
- Added service-specific Dockerfiles and infra:generate. Generates private per-service Compose and network manifests from local SQLite; incomplete records are blocked independently. No deployment or database mutation.
- Typecheck and seven Infrastructure tests pass, including Compose validation for all four service fixtures. Actual native generation validated MariaDB; PostgreSQL image, Redis password and File Manager login remain missing.
- See docs/infrastructure-compose-generation.md and .container/infrastructure/README.md for artifacts, credentials and binding limitations.


### 2026-11-17 — Install and verify all local Docker infrastructure
- User authorized filling missing settings, saving native SQLite, generating Compose and installing all four services. Generated Redis/File Manager passwords were encrypted without printing; set Redis default user, File Manager admin and PostgreSQL image postgres:17.12-alpine.
- Preserved native SQL servers and source data. Resolved occupied host ports with Docker PostgreSQL 5433 and MariaDB 3307; retained saved SQL public binding and MariaDB internal port 3307. Redis/File Manager stay loopback-only.
- Added infra:deploy with deployment lock, record-revision/port/retained-data checks, stages, image builds, volume ownership guards and authenticated verification. No pending migrations; backup stage skipped. Existing volumes are retained on failure.
- Created the absent declared Codeitz file volume empty. Fixed File Manager configuration access and bcrypt dollar escaping; repaired only the new bootstrap account without dropping its database or files. Named config volume and explicit healthcheck now used.
- All four verified: PostgreSQL/MariaDB SQL queries, Redis authenticated PING and unauthenticated rejection, File Manager login and Codeitz resource access, actual Docker bindings, volume mounts and immutable image IDs. SQLite integrity ok; local API ready. Typecheck/all 29 tests pass.
- See docs/local-infrastructure-deployment.md for final ports and limitations. Private per-service records, release.json and stage history are under .codeship/infrastructure-runtime. The new databases are fresh; apps were not redirected and existing data was not migrated.

### 2026-11-17 — Group Docker infrastructure as codebiz-infra
- User selected codebiz-infra as the shared Docker Desktop dropdown. Recreated all four containers under that Compose project, retaining image IDs, credentials, published ports and all volume identities/targets. Only replaced containers were removed; no volumes or database data were removed.
- Added grouped Compose composition and infra:group with revision checks, deployment lock, retained mount checks and stage records. Per-service metadata separates logical deployment names from Docker group/service. Independent installer now rejects already-grouped records.
- Docker Compose reports exactly codebiz-infra running(4). All image/mount checks, SQL queries, File Manager login and Redis authenticated PING passed. Typecheck and focused grouping regression test pass. Docker Desktop was minimized during UI inspection; group membership was verified through Docker's project metadata.

## 2026-11-17 — Consistent list header construction

- Shared AppHeader now keeps actions at 32px inside a 40px rail, uses the Tasks hover/focus lift with reduced-motion support, and makes the current breadcrumb semibold. MainLayout defaults to workspace action alignment; gallery import actions explicitly retain edge alignment. Shared workspace-list-content aligns list/table right edges with the header.
- Existing list shells and duplicate list headings were audited and adapted, including Billing financial lists, Codeship operations lists and Codeitz Todo Categories. UIUX live preview and typed usage use the shared content class. Governance and new-app template capture the construction rule. No Project Manager changes/builds.
- Shared UI build, nine app typechecks/builds, 13 governance tests and two Master List tests passed. UIUX browser measured header 40px and New 32px with table outer-edge alignment. UIUX suite has 15 passes and one unrelated Login example parity failure from ongoing auth-template work; those auth files were preserved.

### 2026-11-17 — Deploy CodeShip as standalone codeship group
- User requested a separate CodeShip group, then explicitly removed the local suffix for a portable VPS identity. Default profile is now .codeship/docker/codeship.env, group/image prefix codeship, endpoint 127.0.0.1:4450 and container port 4350. Explicit legacy profiles remain compatible; old release history was preserved.
- Registered the codeship deployment in native SQLite, then used existing setup orchestration to build codeship:1.0.2-04b52e0d862f and initialize dedicated codeship data/key volumes from an integrity-checked online snapshot. SQLite and vault key were transferred privately. No schema migration was pending; migration and migration-backup stages were skipped.
- Setup completed with release succeeded. UI/API/readiness, registry/Infrastructure routes and foreign-origin rejection passed. Browser verified the deployed Infrastructure UI and saved docs/codeship-docker-deployment.png. Docker Compose lists codebiz-infra running(4) and codeship running(1).
- Deployed inventory has ten applications and four infrastructure services, with credential presence intact. Container remains private and inventory-only. Native development continues independently; no implicit later synchronization or VPS deployment was configured.
- Syntax/typecheck and all 30 tests pass; Docker build typecheck/build also passed. See docs/docker-lifecycle.md for the portable identity and environment boundaries.

### 2026-11-17 — Reports: Infra, App and Devkit Docker metrics
- Added shared-header Reports submenu with separate lazy pages/routes for Infra Metric, App Metric and Devkit Metric. Shared cards and Master List show running count, CPU/memory totals, health/state, CPU, memory limit, network/block I/O, PIDs, restarts, ports, start time, owner/group and image. Columns keep readable single-line values; primary metrics appear first.
- Added read-only host Docker collector and typed, validated, server-filtered report endpoint. Collector uses exact verified Infrastructure group/service membership and native host registry owner/project identities; unrelated containers and native processes are excluded. Current counts: four Infra, zero Apps, one Devkit. Background collector is active; host reboot autostart is not claimed.
- Container receives only read-only metrics snapshot directory; no Docker socket, host write access or new execution authority. API returns no-store, displays stale/unavailable state and keeps existing peer/Host/Origin protection. Client refresh is every ten seconds with a manual header action.
- Typecheck, build and all 32 tests passed. Two focused metrics tests cover explicit ownership separation, unrelated/native exclusion, stale/malformed/missing snapshots. Docker update completed with no pending migrations; backup/migration skipped, data/key volumes preserved. Native API restarted for new routes.
- Verified actual 4320 and 4450 category APIs, fresh counts, no-store and foreign-origin rejection. Browser verified Reports navigation, Infra four rows, App empty state, Devkit CodeShip row, and Refresh changing timestamp/metrics. Screenshot infra-metrics-report.png. Docker metrics mount is read-only (RW=false); app is healthy.
- See docs/docker-metrics.md for collector startup, host registry authority and current-snapshot/no-history limits.

## 2026-11-18 — Metric cards and detail pages

- Replaced the Infrastructure, App and Devkit metric tables with responsive summary cards showing service, group, state, health, CPU and memory.
- Each card opens a clean, directly addressable container detail route using shared RecordDetailV1. Details show identity, image, published ports, start time, CPU, memory limit, cumulative network/disk totals, processes and restarts.
- Header Back to cards and Refresh actions retain category separation. Missing containers show a clear empty state. The existing 10-second collection refresh and stale warning remain.
- Typecheck, production build and all 32 tests passed. No SQLite schema or data changes.
- Docker update completed successfully on port 4450; all category routes and existing container detail links returned HTTP 200. A one-shot collection verified all five containers. Automatic approval review blocked restarting the stopped background collector; it remains stopped. Browser visual inspection was not performed in this change.

## 2026-11-18 — Performance graphs and status indicators

- Infra, App and Devkit metric cards now show two accessible coloured circle indicators in the card header action area: runtime and health. Green means running/healthy, red means exited/dead/unhealthy, amber means other/unconfigured, and grey means stale/unavailable. Hover and screen-reader labels retain exact status.
- Shared Sparkline CPU and memory graphs appear on each card and container Show page. Only genuine fresh, distinct snapshots accumulate during the current report visit (up to 60 samples). Collection gaps reset the series; no fabricated historical values. Waiting state appears until two valid samples arrive.
- Typecheck and production build passed; all 33 tests passed, including duplicate/stale/gap/retention behavior. No database migration.
- Local Docker release succeeded at port 4450; readiness/origin checks and report/detail HTTP routes passed. The host collector remains stopped following the earlier automatic approval rejection; graphs correctly wait rather than invent values. Browser visual inspection was not performed.

## 2026-11-18 — Native watch startup lease recovery

- Native startup previously exited immediately if the previous process's 30-second database lease had not expired. Node watch then waited indefinitely for a file change even after expiry.
- Startup now retries atomic lease acquisition for at most 32 seconds with one waiting message. Expired leases are replaced; an actively renewed lease is preserved and produces an actionable duplicate-operator message. No lease deletion or schema change is used for recovery.
- Typecheck and all 34 tests passed, including expiring-lease recovery and active-owner exclusion. The existing native watcher restarted on the code change; native readiness returned HTTP 200 on loopback port 4325.

## 2026-11-18 — Automatic metrics collection

- Native CodeShip API startup now ensures the host metrics collector is running and checks every 15 seconds. Host Docker setup/update/verify ensures the same collector exists and requires a fresh metric report. Inventory-mode containers do not launch a collector or gain Docker access.
- A launch lock and the collector PID lock prevent duplicate workers; private logs receive output. The detached host collector survives API watch and Docker app replacements. OS login/startup registration is not installed; starting CodeShip's native API or deployment command after a host restart starts collection.
- Verified repeated/concurrent ensure calls retained one collector. Native API 4325 and Docker 4450 returned available=true, stale=false, four Infra containers. All 34 tests and typecheck passed.
- Docker release codeship:1.0.2-4ecf3815a955 succeeded at 4450. Verification required fresh live metrics and passed; final Infra report returned available=true, stale=false with four containers. Collector timestamps advanced repeatedly during deployment. No database migration/backup was needed.

## 2026-11-18 — Faster initial performance graphs

- Reduced the collector pause and metric page polling from 10 to 5 seconds. Real Docker sampling adds collection time; expected initial graph availability is 10–20 seconds under normal local load.
- Typecheck passed. Restarted only the verified CodeShip collector and ensured automatic collection resumed. Three successive fresh snapshots measured 7.944 and 7.946 seconds apart.

## 2026-11-18 — Disk usage ring

- Added optional root filesystem used/total bytes to Docker metrics. The host collector runs the fixed read-only `df -Pk /` command only in already registered running containers. Missing df or stopped containers yield unavailable values without failing other metrics.
- CPU and memory sparklines plus a disk percentage ring now share one row in cards and Show pages. Used/total sizes and detail text identify the shared engine filesystem; disk I/O totals remain separate.
- Added public shared UsageRing and UIUX examples for normal/warning/critical/unavailable values. Ring clamps percentages and exposes an accessible label. Typecheck, builds and all 35 tests passed, including malformed df handling. No database migration.
- Local release codeship:1.0.2-71f5f3d74b37 succeeded on 4450. Restarted the verified collector to load disk sampling; all four Infra services returned fresh disk readings around 2% used. Schema/data volumes preserved. Browser visual inspection was not performed.

## 2026-11-18 — Compact, balanced metric cards

- Removed the duplicated CPU/memory summary row. Each metric now has one label, one current value and an aligned 48px graph in equal-width columns with subtle dividers.
- Removed repeated per-graph timestamps and kept the single page collection timestamp. Disk used/capacity context is available on hover and in the detail page. Compact shared Card spacing and one footer align Live state with View details.
- Typecheck and production build passed. Current local Infra metrics were fresh and disk readings were available for all four services. No data/schema or collector behavior changes.
- Local Docker release codeship:1.0.2-14f07af21719 passed readiness and origin checks; report route returned HTTP 200 with fresh metrics for four Infra containers. Browser visual inspection was not performed.

- 2026-11-18: Opted this app into the shared one-time Silver rollout in provider and first-paint initialization; white/grey HTML fallback. Preserves mode, component defaults and subsequent Appearance choices. Shared UI source colour audit and representative UIUX screenshots verified; app typecheck and final production build passed. Project Manager excluded.

## 2026-11-18 — Infrastructure metric cards as primary list

- Infrastructure now composes the existing Infra metric cards instead of the table. Header New and Refresh remain available; matched cards offer Edit plus View details. Configuration forms keep their existing save flow.
- Metric-to-record matching uses service kind/environment with exact project preference; ambiguous records are not guessed. Configured services without metrics remain available as settings cards, including undeployed/VPS records.
- Typecheck and production build passed. Native /infrastructure at port 4325 returned HTTP 200 with fresh metrics; all four containers mapped uniquely to the four saved services.
- Docker deployment completed successfully. Native 4325 and Docker 4450 list/New/Edit routes all returned HTTP 200; both reported fresh Infra metrics. Browser visual inspection was not performed.

## 2026-11-18 — Clickable cards, tighter spacing and disk summary

- Removed card Edit/View details buttons and the entire footer. Registered Docker metric cards now use a public shared CardLink to open their detail route; configuration-only cards link to their saved settings.
- CardLink preserves native link behavior, keyboard activation/focus, modified-click/new-tab behavior and reduced-motion preferences. A 200ms hover shadow/border/lift transition is shared in UI, with a UIUX example.
- Trimmed metric inner vertical padding and removed unused footer spacing. Added a fourth top summary for shared Docker disk used/capacity and percentage ring, counted once rather than summing duplicate root filesystem readings. No readings show unavailable.
- Shared UI build, UIUX typecheck, CodeShip typecheck and production build passed. No schema/data changes.
- Docker release codeship:1.0.2-b82e4c38ea21 succeeded. Native 4325 and Docker 4450 infrastructure/detail routes returned HTTP 200 with fresh metrics and disk readings. Browser hover/click visual inspection was not performed.

## 2026-11-18 — Actual container storage and capacity rings

- Container disk figures now measure Docker SizeRw plus mounted persistent data. Added read-only du/stat scanning with nested same-device mount accounting and unavailable handling; excludes image layers and Docker-managed logs. Shared volume data remains included per attached container, not attributed exclusively.
- Shared Docker filesystem usage remains only in the top summary. Individual storage figures show bytes without inventing a disk quota. Details expose writable/mounted breakdown and scan time. Storage scans cache for 30 seconds; CPU/memory cadence is unchanged.
- Added top CPU and memory rings using Docker engine NCPU/MemTotal. CPU percentage normalizes by engine CPUs; memory uses aggregate container bytes / engine capacity.
- Typecheck, production build and all 37 tests passed. Direct read-only measurements verified distinct totals: File Manager 73728 B, PostgreSQL 48648192 B, MariaDB 168931328 B, Redis 32768 B. Tests cover nested same/different device mounts, null on failures/stopped mounts, writable+mounted totals.
- Local Docker release codeship:1.0.2-6770734387e2 succeeded. Restarted only the verified collector to load new measurements. Native 4325 and Docker 4450 returned fresh reports, engine capacity, four distinct storage totals, and HTTP 200 for Infrastructure/all container detail routes. Asserted each total equals writable + mounted data. Collector snapshots continue advancing. Browser visual inspection was not performed.

## 2026-11-18 — Applications and Devkits metric main lists

- Applications and Devkits now have separate main list pages composing the same live Docker metric cards as Infrastructure. Added a dedicated Devkits sidebar item/icon and page title.
- Whole-card links open category-specific container details and Back to cards returns to that category. Registry records without Docker metrics remain visible as configuration cards with their own Show/Edit routes; native processes are not represented as Docker utilization.
- Both headers include New and Refresh. New/Edit reuse the existing registry form and app-header Save/Cancel, filter records by apps/ or devkit/ ownership, prefill the category prefix and Local Docker for new registrations, and return to the originating list after save. A mismatched owner prefix is rejected in the scoped editor. Registry and old application target detail routes remain available.
- Typecheck, production build and all 37 tests passed. No database schema or deployment ownership changes.
- Local Docker release codeship:1.0.2-62fc7be472f2 succeeded. On both 4325 and 4450, checked Applications/Devkits list, New, each configuration Show/Edit, and live container detail routes (25 routes per origin). All returned HTTP 200. Category APIs were fresh and owner-separated: six app registrations/no Docker app containers, four devkit registrations/one live container. Browser visual inspection and form submission were not performed; no test records were created.

## 2026-11-18 — Devkits group, local install and shell-only maintenance

- Installed stable containers codeship, codeitz and uiux in one devkits Compose group, published only on loopback 4450/4451/4452. Removed the replaced codeship-app-1 container without removing volumes. Infrastructure remained unchanged in codebiz-infra.
- Added CodeShip-owned group/per-service setup.sh, update.sh and verify.sh; each Devkit's root setup/update delegates there. npm deployment commands invoke the shell wrapper. Legacy standalone helpers refuse a second deployment after adoption. Both setup.sh and update.sh actually completed successfully.
- Built immutable versioned images from frozen sanitized source snapshots to avoid concurrent workspace edits. Reused only exact tags with recorded successful builds; --resume safely reused prepared artifacts after interrupted setup. Windows explicitly uses system tar, avoiding Git tar interpreting drive-letter paths as remote hosts. Registry payloads use attached stdin.
- Copied native Codeitz PostgreSQL consistently into a separate Docker database/role: 55 tables and 11 projects, with project identifiers verified equal through native/Docker APIs. Native database/services remained unchanged and healthy. Existing File Manager-attached workspace volume was initialized once; source files, runtime state and CLI state persist. Git and pinned Codex CLI 0.169.0-alpha.11.1 verified installed. Host credentials were not copied; copied-instance automatic sync/task scheduling is paused.
- Added an ordered SQLite grouping migration because deployment project was globally unique. The new project/owner/environment key supports three distinct group members. Migration tests prove IDs, ciphertext, timestamps and AUTOINCREMENT sequence retention; duplicate ownership is rejected and unsafe downgrade refuses deletion. Native writes were locked during online backup/migration. Docker CodeShip was stopped for its backup/migration. Both integrity checks passed. The following normal update found no pending migrations and skipped further backups/migrations.
- Service-specific registry classification keeps each Devkit owner correct; operational cards hide duplicate native registrations without deleting them from Registry. All three appear under Devkits with their own metrics.
- Verification: CodeShip suite 39 passed; framework 42 passed/1 existing platform skip; Codeitz private-database transport test passed. All product typechecks/builds passed. All three app origins and original native Codeitz/UIUX origins returned readiness 200; foreign-origin requests were rejected. Persistent CodeShip data/key volumes retained. Final verification details follow below.
- Final local verification: both setup.sh and update.sh succeeded, then verify.sh passed. All service image IDs matched state.json. Devkits report returned exactly codeship/codeitz/uiux in project devkits with correct distinct owners, fresh snapshots and available per-container storage. Collector reported seven registered containers total (four Infra + three Devkits). Whole-group/per-service/root shell scripts passed syntax checks. Codeitz Git/Codex versions executed successfully; no agent coding job or browser visual flow was run. Native/Docker project identifier hashes matched for all 11 Codeitz projects. Native and Docker SQLite integrity passed. Current core data/key volume names were retained; old codeship-app-1 was removed without volume deletion. Original native Codeitz/UIUX readiness remained 200.

## 2026-11-18 — Remove Reports header dropdown

- Removed the Reports dropdown and its unused menu imports from the shared CodeShip header. Existing per-page header actions and direct report/detail routes remain available.
- Typecheck passed. Source-only change: no production build, container restart or deployment was performed, as requested. Ongoing preference: do not deploy each refactor; deploy when explicitly requested.


## 2026-11-18 — Tagged image releases and managed Docker operations

- Prepared 1.0.3 with the user-authorized current changes after audit.
- SQLite registry and encrypted install credentials; typed infrastructure forms, direct Docker deployment, container metrics/cards and Devkit grouping. Added GitHub-tag workflows, immutable release sets, safe helper publishing and Platform local deployment adapter. Typecheck/build and all 43 tests passed. Product runtime publication/deployment remains a separately recorded stage.
- GitHub helper publication/tag and tagged CI/runtime outcomes are recorded by their actual later stages; no unexecuted deployment is claimed here.


## 2026-11-18 — Controlled tagged workflow dispatch

- GitHub accepted the first release branch/tag but no workflow run was registered. Added an explicit tag-selected dispatch path for controlled bootstrap/retry. Earlier tags remain intact. A pushed tag is not a verified image; deployment remains gated on successful CI and release manifests. Prepared 1.0.4; no new database migration.


## 2026-11-18 — Hermetic release verification

- GitHub v-1.0.4 failed before image publication because operations tests required ignored local target settings. Tests now use temporary profiles, inert scripts and isolated SQLite with injected resolvers. Typecheck and all 43 tests passed. Prepared v-1.0.5; prior failed tags retained and no unverified container deployed.


## 2026-11-18 — Audited deployment handoff and literal secrets

- Corrected Platform registry handoff to provide all three fixed user roles and validate before provisioning. Compose runtime files now use raw format; Node migration helpers retain separate dotenv parsing. An unstarted isolated Docker fixture proved literal dollars, mixed quotes, hashes, leading/trailing spaces and empty values survive. All 46 tests passed. Prepared v-1.0.6; earlier verified images remain available, with no app replacement yet.


## 2026-11-18 — Isolated Platform database targets

- Devkits v-1.0.6/v-1.0.5/v-0.1.6 deployed and verified; CodeShip SQLite and all 11 Codeitz project IDs/owners matched the pre-update baseline. No migrations were pending.
- Platform v-1.0.3 setup stopped before writes because infrastructure PostgreSQL already contained cx_master_db. The existing database and native source were preserved.
- The adapter now targets platform_master and platform_codexsun under platform_service, saves encrypted recovery credentials before effects and changes routing only in the cloned master. All 48 tests passed. The corresponding Platform target validation is prepared in an isolated source checkout to preserve ongoing native-admission edits.

## 2026-11-18 - All-app release contract and operator adapters

Standardized all nine business app contracts and published audited source tags through the helper. Added isolated database copying with shared read-only source snapshots, candidate migration plans, checked recovery archives for pending migrations, retained Ecommerce uploads, and Platform-coordinated application admission. The applications group retains loopback SDK/gateway transport in a shared namespace and publishes distinct loopback ports. Typecheck and fifty-one tests passed, including concurrent PostgreSQL snapshot verification. See all-app-release-audit.md for source checks, CI corrections and the current Ecommerce hold. Installation results remain separate stages.

## 2026-11-18 - Final production profile preflight

Validated all eight business manifests against Platform production admission before any application rollout. Database-free native manifests now receive the explicit reviewed Codexsun binding; mismatched app/tenant identities are rejected. Exact approved image IDs already loaded locally are reused without another transfer, with content and label checks retained. Typecheck/build and fifty-five tests passed. Prepared 1.0.9; the earlier installer tag remains unchanged. Ecommerce's source hold is resolved with forty-five passing tests and a successful tagged image build.
