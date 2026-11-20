## 2026-11-19 — CRM existing-record Docker adapter (1.0.15)

Added least-privilege MariaDB compatibility copy and CRM ingress 14355:4355. Initial copy stopped on MariaDB 11 constraint-name uniqueness; retained empty partial target and snapshot were checked, completed with unique constraint names, all 65 tables/328 rows and relationships compared. Native source unchanged. Tagged CRM v-0.1.2 deployed through CodeShip; healthy, protected reads require Platform grants, foreign origins denied, old4456 removed. Five targeted tests and typecheck passed. Unrelated source work preserved in retained pre-sync stash.

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

## 2026-11-18 - Credential-isolated application admission recovery

Devkits 1.0.9/1.0.6/0.1.8 and Platform 1.0.5 deployed successfully. Both Platform data scopes passed snapshot/count/identity verification with no pending migration. Core App's data copy also passed; admission stopped before container replacement on Platform's unique credential constraint because the native token had been retained. The installer now generates a separate production token, preserves independent saved credentials, and saves encrypted recovery settings before admission. Core App's verified import is retained for a safe retry. Typecheck/build and fifty-six tests passed; no SQLite migration.

## 2026-11-18 - Independent application containers

Prepared 1.0.11 after the user requested separate containers. Replaced Platform namespace sharing with distinct container endpoints and published ports on the managed private bridge. Existing images, databases and import markers are retained. The operator preflights Platform and prerequisites before installation; replacement verifies each container owns only its own port. Infrastructure PostgreSQL reconnects to the bridge after managed replacement. Typecheck/build and all 60 tests passed. Publication and local rollout remain separately verified stages; this source audit does not claim deployment completion.

## 2026-11-18 - Verified independent application rollout

Published CodeShip v-1.0.11 (320f68ce518177edef2755331798785f2dcf1cd8) through the GitHub helper; tagged CI 44340428142 succeeded. Governance v-1.0.17 records individual container endpoints and the updated release skill. CodeShip 1.0.11, Codeitz 1.0.6, UIUX 0.1.8, Platform 1.0.5, Core App 0.1.1, Billing 1.0.6, CRM 0.1.1, Ecommerce 1.0.7, HRMS 0.1.1, Automation 1.0.4, Zetro 1.0.2 and Texlinks 0.1.1 now run from checked release image content. All nine application containers own distinct applications_backend endpoints and their own loopback ports 4453-4461. Devkits retain separate containers/ports4450-4452. Infrastructure engines were unchanged.

Every installed app passed readiness, exact image identity, direct missing-grant rejection, foreign-origin rejection, fresh metrics and guarded Platform admission. All candidate migration plans had no pending changes, so updates skipped database backup/migration; initial native data imports retained checked snapshot dumps, counts and public identities. Ecommerce uploads were content-address verified and retained. Core App's verified earlier import was reused; a subsequent private Docker step failed without a retained detailed cause, and its unchanged retry completed successfully after registration validation. No data reset or tag move occurred.

Replaced Platform alone using the reviewed 1.0.11 operator source while preserving concurrent unpublished local edits. All eight app container IDs remained unchanged; their same-origin Platform config requests recovered and all nine endpoints were healthy. Native/Docker application and Codeitz project baseline identities remained intact. Browser inspection showed nine running/healthy metric cards with fresh data. Platform's disposable gateway suite passed again. All 24 existing sa/admin/user login, session, mandatory first-password guard, ignored forged tenant header and logout/revocation checks passed across eight apps; real passwords were unchanged. Permissions after password completion and actual Billing-to-Core reads were not exercised against these real accounts because mandatory password updates remain enforced.

The broader single-public-entry frontend/cloud handoff is recorded in platform-entry-audit.md with actual-versus-required boundaries. It remains separate from verified container isolation. Automation's existing background worker actor mismatch and Ecommerce provider sandbox testing remain product follow-ups. The newly concurrent Abconnect scaffold has no approved release in this managed set. Private stage/recovery records remain under .codeship; no live VPS target has been selected.

- Follow-up isolation: CRM's same-release update succeeded with no pending migration and preserved Platform plus all seven other app container IDs. Final Infra/Apps/Devkits reports were all fresh (4/9/3 managed containers). The tenant-identity and historical Platform-runtime disposable PostgreSQL suites both passed. Their temporary resources were cleaned by the owning tests. Public-entry domain-versus-path selection and the actual live target remain unanswered; no ingress authority or public exposure was inferred.

## 2026-11-18 - Confirmed future ingress direction

User selected app subdomains rather than shared-host paths. Continue local Docker for now; future live domains are codexsun.com and its subdomains, with explicitly verified tenant/app mappings for customer custom domains. Use Cloudflare Tunnel for public HTTPS to the private Platform HTTP origin; no Nginx service. No DNS, tunnel, VPS or public-management exposure was performed. Single-entry frontend/asset routing and authenticated ingress remain explicitly identified work, rather than being claimed by the completed separate-container rollout.

## 2026-11-18 - Local Platform entry adapter

Prepared 1.0.12 with the candidate-owned explicit local-host registration stage. Bindings remain encrypted in the Platform registry environment and are passed through raw private runtime configuration. The adapter refuses tenant-domain conflicts or disabled shared hosts and does not verify customer domains automatically. Included the existing reviewed optional password-change policy default. Typecheck/build and all 60 CodeShip tests passed; no schema migration. Runtime outcomes follow after successful tagged images.

## 2026-11-18 - Concurrent registry writer correction

Two approved 1.0.12 update attempts stopped before replacement because the temporary encrypted-registry writer hit SQLite database-is-locked while the running operator renewed its lease. Existing data/key volumes and 1.0.11 container were retained. Product transactions now reserve the SQLite writer before reading revisions, avoiding invalidation of a deferred WAL read snapshot by a second process. The regression test uses a separate worker/SQLite connection and proves both updates persist. Typecheck/build and all 61 tests passed. Codeitz chat subsequently took ownership of the active Docker recovery; this work performs no concurrent Devkits operation while that handoff is active. Unrelated Registry/Texlinks edits are preserved outside this commit.

## 2026-11-18 - CodeShip-only port convention audit

User resumed deployment for CodeShip only and assigned other app deployments to their own chats. Prepared 1.0.13 in an isolated checkout, excluding unrelated Automation/Registry/Texlinks edits. CodeShip's publication changes from 4450:4350 to loopback 14350:4350, matching the requested internal-port prefix convention. Port-change preflight checks occupancy before effects; verification checks the exact sole binding. Unselected service definitions and shared physical volumes/networks are preserved instead of regenerated. Monitoring callers use the new CodeShip address. Included the previously committed concurrent SQLite writer correction. All 61 pre-existing checks and the new selected-service retention test passed; final combined verification and deployment outcomes follow. No database schema migration.

## 2026-11-18 - Strict selected-service follow-up

CodeShip 1.0.13 deployed successfully on 14350:4350; registry writer locking, readiness, exact image, origin guards and fresh metrics passed with no migration. All other managed container IDs/mounts were unchanged. The post-update registry audit caught a separate group-wide payload path that rewrote Codeitz/UIUX rows and reset Codeitz's saved port to 4451, although its container remained on 14305. Restored the Native/Docker registry port to 14305 without touching ciphertext or restarting Codeitz. The changed ciphertext hashes reflected re-encryption; runtime/credential comparison is recorded separately rather than claiming hashes prove changed plaintext.

Prepared 1.0.14 to scope registry payloads, environment rendering and workspace initialization to the selected service. A pre-write invariant rejects unselected/duplicate registry owners. The new regression verifies group-wide payload rejection; combined checks and final deployment follow. Unrelated owner changes remain outside this isolated release.

- Final source audit: typecheck/build/version checks and all 63 tests passed. Native/Docker Codeitz/UIUX environments match; Codeitz's existing running credential/sync settings match the saved values. Registry Codeitz port is restored to 14305. No credential values were printed. Release/build and post-deployment preservation checks follow.

## 2026-11-18 — Platform-only 14385 publication adapter

User authorized Platform publication/update and 14385:4385 binding from the Platform chat. Isolated this host adapter from unrelated shared Billing/Texlinks/runtime-helper edits and preserved incoming CodeShip selected-service/security fixes. Probe changed port, preserve all unselected definitions, update registry/origin, use installed metrics origin, replace only Platform and compare sibling identities. Password policy is version-aware: legacy <=1.0.6 remains compatible; >=1.0.7 uses the confirmed no-forced-change policy. No CodeShip container deployment or database migration is part of this commit. Focused port/network tests and direct script syntax checks pass; deployment outcome is recorded by the Platform task.

Platform operator follow-up: resolve the private operation directory to its canonical path before rendering mounts/state, so using an isolated audited operator checkout never leaves container runtime mounts dependent on a temporary clone or junction. Direct script syntax check passed; existing shared operation lock remains authoritative.

## 2026-11-18 - Verified CodeShip-only release 1.0.14

Published v-1.0.14 (590392b8e9e8ec9e929a7294ac40dfa06f165a0a) with the GitHub helper; tagged CI 44354996109 succeeded. Approved image895d0fdc93003e54bf9c95e63552b5f98e93d66cc1c7568f965922fe5ee461dc was checksum/content/label verified and deployed through the per-service shell entry from the retained release-matched operator. Canonical run2026-11-18T17-31-03-912Z succeeded17:31:41UTC. CodeShip is healthy on loopback14350:4350; former4450 listener is closed. No pending migration, so backup/migration was skipped and data/key volumes retained.

All63 source checks passed. Final real-runtime baseline compared every other managed container ID/image/mount, complete unselected Native and Docker registry rows including ciphertext, and Codeitz/UIUX private runtime definitions/environment file hashes: unchanged. Existing public IDs, encryption-key identity and SQLite integrity passed. Native/Docker saved environments match and existing Codeitz runtime credentials still match. Readiness, Registry/Infra/Applications/Devkits pages, foreign-origin403 and fresh reports(4infra/9apps/3devkits) passed. Browser Registry loaded on14350 and showed version1.0.14 with encrypted credentials. No secrets were revealed or printed.

Deployment coordination respected each other chat's lock. The final operation selected CodeShip only; Codeitz14305, UIUX14315 and all app containers/registry values were retained from their owners' completed deployments. No primary shared apps adapters were overwritten. The primary checkout's unrelated unfinished changes were excluded; use the release-matched operator under .codeship/operators/v-1.0.14 until that working copy is safely reconciled. Actual stage/state/approval/baseline artifacts remain private under .codeship. No VPS/Cloudflare action.


### 2026-11-19 scoped startup release audit

Preserved earlier port-contract audit separately; source baseline CodeShip1.0.15 commit6c31dea. This release isolates read-only PostgreSQL startup gating through published framework0.2.0; retries only transient recovery/transport errors, not credentials/schema. No migrations. Shared UI remains on its existing published pin; unrelated app-owner adapters remain in the primary checkout and are not included. Tailwind app source discovery bounded to src/web. Build1.79s, typecheck and focused startup/network tests pass on primary. PostgreSQL snapshot + real startup gate test passes in22.7s; prior full suite72/73pass with transient unavailable fixture recorded honestly. Isolated release checks pending.

Shared UI0.1.12 exact e88945f101313051ded3557e14b0363a0a6ca906 is published and pinned; framework0.2.0 exact51daaa2a7bee32d0a8eca806a2b0e8a765a3e1ac pinned. Existing isolated network test was stale against its own released private-IP ingress; corrected test to supply and permit only the assigned private address, retaining loopback/namespace checks. Isolated build1.53s and version checks pass.

Isolated CodeShip1.0.16 checks complete:68/68tests pass in23.69s, including disposable PostgreSQL snapshot/startup gate; typecheck passes; final production build1.67s; diff whitespace check passes. No applied migration changes. Publication and immutable image workflow remain next stages; no Docker boot verification claimed.

Source checks published on isolated codex/codeship-startup-1016 branch; immutable tag is created by a separate helper release operation after the source publication. Tag workflow must succeed before any deployment admission.


### 2026-11-19 adapter reconciliation candidate

Preserved primary app-owner work and selectively adopted deployment-only adapters: independent ABConnect provisioning/roles and combined ingress; released Platform production flags; standard hostprefix1 ports for Core/HRMS/Automation/Texlinks and private-IP ingress; browser metadata now points Billing/Core links to14335/14345 while native API URLs remain unchanged. Automation110s drain retained. Manual native-data copying/migration scripts and registry UI edits remain outside this candidate. Texlinks database adoption is explicitly not approved by its port change and its newer database-backed image remains deferred. All adapters require immutable app manifests and actual migration-plan checks. Verification pending.

Reconciled adapter1.0.17 full suite73/73passed in29.22s; typecheck and production build passed. Permanent collector identity validation rejects unrelated/reused PIDs without killing them and conservatively retains a potentially live owner when OS identity is unavailable. No applied migration changes; actual per-app migration plans remain mandatory.


### 2026-11-19 startup budget alignment

Observed initial PostgreSQL recovery about187s exceeds previous dependency180s. Follow-up uses shared framework deadline300s/max70attempts, child60s, health60s and operation480s. Docker health grace360s with6retries/5s interval/4s timeout; early healthy apps still complete immediately. Near-deadline arithmetic regression rejects previous180s total budget and proves room for child+health after late database recovery. No database mutation. Verification pending.

Startup budget1.0.18 verification complete:75/75tests pass32.76s, typecheck/build pass; near300s dependency recovery covered with virtual timers and no real multi-minute sleep. Earlier snapshot fixture failure is retained in the primary report; full isolated candidate is green.


2026-11-19 live checkpoint: CodeShip1.0.18/Platform1.0.8/Core0.1.4/Billing1.0.8/Ecommerce1.0.12/HRMS0.1.2/UIUX0.1.11 verified through actual immutable-image/migration-plan/health/origin/metrics/admission checks. Billing1.0.8 was interim before later heavy-catalog hold; final Billing/CRM/Texlinks certification remains held, no downgrade/reset. ABConnect/Automation queue in progress; Automation migration backup required if pending. Exact stages, failed16metrics attempt/recovery, workflow18retry and preserved saved public SQL exposure policy recorded in supervisor report. Coldboot still pending; no full-stack completion claimed.


### 2026-11-19 app-owned deployment clarification

Direct user instruction supersedes earlier centralized-chat deployment ownership. Each app-owning chat keeps release/deployment/verification responsibility and may reuse shared CodeShip tooling/lock. CodeShip chat focuses on CodeShip and requested individual audits. Updated active governance, architecture, release/new-app guidance, automation plan, generated release notes and repository/installed release instructions. Historical release records retained. No runtime, database, container or deployment changes. Chat delivery and documentation checks recorded after verification.

Verification: delivered the direct ownership instruction to13 relevant existing chats (including framework/supervisor and governance). Active ownership guides/template contain no remaining exclusive CodeShip-chat deployment rule; historical records retained with a superseding notice. Repository and installed release skills both pass the official validator; scoped whitespace checks pass. Latest GitHub CodeShip release and live Docker label both1.0.18, healthy14350:4350. Documentation/instruction changes only; no app deploy, database change or runtime version bump. Existing unrelated governance edits preserved.


### 2026-11-19 metric card links and disk rings —1.0.19

User authorized CodeShip-only release/deploy. Added sibling external-link icon anchors (no nested interactive elements inside CardLink) to app/devkit metric cards and registry-only app cards; File Manager also supports HTTP opening. URLs prefer actual local Docker bindings over stale localhost registry ports and allow configured HTTP/HTTPS domains; reject credentials/unsafe protocols. Cards retain their details navigation. Disk rings use container storageBytes/root filesystem capacity, not shared-used bytes; null capacity remains unavailable. Focused URL/storage tests passed; final build/full-suite and release/deployment verification pending. Ownership documentation changes from prior authorized task retained. No migrations or sibling-app deployments.

1.0.19 verification:77/77tests pass15.78s, typecheck/version/whitespace checks pass, production build1.36s. Actual isolated headless browser at360/1440 across Applications/Devkits/Infrastructure (6screens) confirms no document overflow, no nested anchors, disk rings present and native new-tab click opens CodeShip14350 while preserving dashboard URL. Screenshots visually reviewed; evidence .codeship/metric-card-browser-proof.json. Preview is read-only and not a deployment. Tagged workflow and selected CodeShip deployment remain pending.


1.0.19 live verification completed: annotatedv-1.0.19/source3224e44f17c0db760d6e16f459b57660b4ebced2, successful tagged workflow44443437756, imagebb370f78cdf581b6e4cd082f5be3c4f0097eb25b6533e03905a832b0c644bb84. Selected CodeShip update2026-11-19T02-22-27-718Z succeeded02:24:37.685UTC on14350:4350; no pending migrations, so database backup/migration skipped. Actual6 live browser checks360/1440 Applications/Devkits/Infrastructure pass: icon links/new-tab behavior, retained dashboard navigation, disk rings, no overflow/nested anchors. Live screenshot visually reviewed, including loaded performance graphs. Strict baseline confirms sibling container IDs/images/mounts, unselected registry/ciphertext/runtime files, public identities and encryption key preserved; SQLite integrity passes.77tests/typecheck/build/version checks passed. No other app deployment performed. Evidence .codeship/metric-card-live-proof.json and metric-card-live-1440.png.


### 2026-11-19 live per-container logs —1.0.20

User authorized CodeShip-only audit/release/deployment. Added shared ScrollArea log panel on each selected metric details page, fixed288px,11px monospaced text, pause/resume/refresh/copy and auto-follow with jump-to-latest. Host-only collector samples recent bounded stdout/stderr tails independently of metric collection; known registry and Docker env credentials, encoded forms and common credential/token/key patterns are redacted before cache persistence. API requires current registered category+container, existing peer/Host/Origin guards, no-store and fails closed for stale/missing/malformed cache. No arbitrary command/path parameters and no Docker socket added. First focused tests exposed encoded punctuation masking and pathological long URL regex performance; both corrected before release. Final tests/browser/release/deployment pending. No schema or sibling app changes.

1.0.20 validation:80/80full tests pass25.55s,3focused log/redaction/scope/Origin-route checks pass, typecheck and final build1.57s pass. Real host Docker log collection tested into a private test directory (selected CodeShip only;19,878sanitized characters, within cap), without modifying live cache. Browser preview checks6show pages (Apps/Devkits/Infra at360/1440):288px viewport, actual vertical overflow/scroll, pause/follow controls and no document overflow; screenshot reviewed. Preview uses explicit synthetic log fixtures; actual deployed log API/collector verification remains pending.

1.0.20 live verification completed: annotated tag v-1.0.20/source 0a25f8cbb9acb84f896d2529858ffe121d53ac5e, successful tagged workflow 44449069607, immutable image sha256:6181a6defc9a58652b0ef93c0ecd4b126952b723b0d9c3ccf8bb70af32e2bf82. Selected CodeShip update 2026-11-19T03-18-38-270Z succeeded at03:20:20.423UTC, healthy14350:4350. No pending migrations; database backup/migration skipped. Switched only the verified CodeShip-owned host collector after waiting for the shared lock normally. All17 managed container log endpoints return fresh available bounded tails with no-store. Six actual live show-page checks at360/1440 across Applications/Devkits/Infrastructure confirm nonempty actual logs,288px viewport, pause and no horizontal document overflow; desktop screenshot visually reviewed. Synthetic preview separately verifies overflow/follow controls. A live follow assertion assumed overflow on quiet containers and was narrowed to pause/layout; no universal live overflow claim. Strict baseline confirms sibling container IDs/images/mounts, unselected registry ciphertext/runtime files, public identities and encryption key preserved; SQLite integrity passes. No other app deployment performed. Evidence: .codeship/container-logs-live-proof.json and container-logs-live-1440.png.80tests/typecheck/build passed before publication.

Follow-up audit requests received from supervisor: aggregate PostgreSQL pool-budget inventory and conditional full-width Overview layout are not included in this immutable logs release; remain unverified/pending separate scoped work. No PostgreSQL configuration or sibling pool changes made.

### 2026-11-19 Overview canvas and read-only pool inventory —1.0.21

Narrow follow-up: root/Overview routes now use full available width with16px mobile/20px desktop padding. Existing Master List class and90% form wrapper remain unchanged; no shared CSS or sidecar changes. Typecheck, production build and version check pass. Preview actual loaded browser9route/viewport combinations (Overview, Registry list, Registry new at360/768/1920) confirm correct wrapper selection and no document overflow; desktop screenshot visually reviewed. Preview uses empty read-only API fixtures because Docker became unavailable; this does not certify populated live screens. Evidence .codeship/overview-width-preview.json and overview-width-1920.png. Initial browser assertion selected outer shell main; corrected to innermost app main before recording success. No added implementation-mirroring tests for this reversible layout-only correction.

Read-only aggregate pool inventory recorded in docs/postgres-pool-inventory.md. Retained release source indicates nominal99 PostgreSQL connections per one-process service set (business apps40, Codeitz25, Platform34 default), before migration/native/worker/maintenance demand. Effective live process counts/reserved slots and full budget remain unverified; owner review required, no pool or PostgreSQL changes performed.

Deployment paused: Docker Linux engine pipe disappeared; supervisor independently confirms WSL stopped and requested no retries/restarts/lock clearing while awaiting user direction. No1.0.21 release set, migration or container update started.1.0.20 deployment evidence remains historical; current live health is not claimed. Publication and tagged CI recorded separately when verified. Existing unrelated primary checkout work preserved.

### 2026-11-19 original shared Platform login

Prepared from approved clean release; unfinished owner folders preserved. Reuse WorkspaceAccessGate and SDK0.1.8/ad91f8ecc3c788984a276e1fe88f02d013739d7e, actual session user/logout, exact origins/peers and authoritative current permissions. Auth opt-in protects every app-owned API including metric/log feeds without routing streams through the JSON gateway. Typecheck/build and 80 existing tests passed. No migrations, custom auth screen/cookie, Cloudflare edits or deployments claimed. Matching local/VPS verification pending Platform installation.

### 2026-11-19 selected Platform/devkit deployment wiring

Platform1.0.12/c0d6d5d10eecaf8cfbfcd211422dbaf0c6884f79/imagebc969027f2d75bf6efa61e8694688b95c966b668052a7339206ec99437b652ab verified on Windows and Hostinger through shared entries. Fresh Hostinger13tenantusers/3legacy masterusers copied by explicit identity allowlist, 0copiedsessions/business tables. Initial empty local-entry configuration caused setup to stop after identity installation; skipped that local-only step on Hostinger and resumed without reimport/reset. Public cx homepage/login/context/session/logout200, Secure HttpOnly host-onlycookie; hostileOrigin403. No Cloudflare edits.

CodeShip1.0.22 UI/auth source tag succeeded but was not deployed. Final1.0.23 adds required saved-env preservation, stable selected backend endpoints, private-host mapping, exact connector peers, metrics snapshot verification and released Platform admission helpers. New optional Windows/Hostinger config command persists independent per-target tokens encrypted before service effects. Grant bootstrap takes explicit existing-SA IDs, verifies active SA roles, never overwrites existing app grants, and records one-time markers. Local dirty folders/unselected containers/data retained. PostgreSQL backup archives copied offhost; restore rehearsal pending. TaggedCI/newdevkitdeployments pending.

### 2026-11-20 ingress peer correction

CodeShip1.0.23 verified on VPS with original login, fresh metrics, CSRF/origin rejection, logout revocation and non-SA denial. Codeitz1.0.13 private admission succeeded but public requests failed closed because the existing connector can reach it over cxapp-network as well as devkits_default.1.0.24 resolves exact source peers only on selected attached networks; no connector/DNS/Cloudflare modification. Regression covers both paths and excludes unrelated peers. LocalPlatform transport compatibility patch is separately pending, with prior working local settings restored. No DB reset/migration or unrelated service changes.

### 2026-11-20 native/Docker cookie compatibility

SDK0.1.9/1ac4441efc2280c89f3348f5f51fc03ca6e57907 selects the expected host/deployment cookie rather than rejecting an unrelated native/Docker cookie. Twenty SDK tests pass. App dependency pin updated; UI and API behavior otherwise unchanged. No migration. User explicitly reaffirmed that this chat should continue local and VPS deployment despite another chat reporting a local-only hold. Final matching verification pending.

### 2026-11-20 VPS logo repair

Login referenced absent /logo/logo.svg and logo-dark.svg. Reuse existing appBrand imported SVG assets so Vite bundles light/dark URLs and release image includes them. No shared component fork, auth/dependency/schema change. VPS-only release/deployment authorized; local Docker and Cloudflare untouched. Verification pending tagged build/deployment.

### 2026-11-20 tenant to SA explicit login

User reproduced denial after tenant login then opening /sa/login. Existing authorized SA passed VPS workspace verification in both user and SA realms; no grant repair needed. Explicit login URL previously reused tenant cookie and failed workspace verification with no fresh login form. App route adapter now requests credentials via original shared gate, sends route realm, preserves old cookie on failed credentials, and returns to / after successful login. Server permission checks unchanged; ordinary pages retain original session flow. Three route tests/typecheck passed. VPS-only release verification pending; no local Docker/Cloudflare changes.

### 2026-11-20 clean latest-release updater, local verification

Prepared1.0.28 tooling with latest stable successful GitHub release selection, manifest/image/version guards, clean GitHub fetch/checkout then tracked update.sh, strict SSH/locks, private external state/dependency links, and temporary approved image URLs (GitHub token stays local). No server source edits/builds/new helper uploads. Migration gate requires quiescence, checked backup and actual off-host local-Docker recovery before existing database schema changes; failure/disconnect blocks migration and retains recovery. Image-only and unselected CodeShip migrations skip.21Linux Docker tests and actual PostgreSQL18.7 writer/backup/independent restore/failure checks passed; SQLite local-Docker recovery passed. Typecheck passed. Full suite105passed plus Windows junction and Docker snapshot failures resolved by targeted3/3 rerun; no claim that failed intermediate runs passed. Prepared Codeitz16/UIUX15 local tests109 and19+4passed. Release/tagged CI and VPS update still pending. Details docs/github-latest-vps-updates.md.

### 2026-11-20 published and deployed through released update.sh

CodeShip tooling1.0.28/9f32ff8a560ce577de76c8f7df116c66325a3b03 tagged CI44675657780 succeeded. Codeitz1.0.16/283f57591ade4ead7b6af10aaf58eb5f68a015f7 and UIUX0.1.15/47494e613ec6aa59a224b5cdd3882b2dbc773bbb tagged CI succeeded and were deployed sequentially on Hostinger using this published selected update.sh only. Both passed immutable image, readiness and Platform admission stages. No pending migrations, new database backup, data import/reset, VPS code fixes/builds/helper uploads, local production deployment or Cloudflare change. Platform1.0.13 and CodeShip service1.0.27 unselected. Second invocation for each reported already latest, no replacement or migration. Functional tests stayed local; cloud browser/login regression was not run. See docs/github-latest-vps-update-results-20261120.md for exact releases, recovery references and limits.

### 2026-11-20 user-controlled deployment coordination — local changes

User requested removing automatic deployment locks and clarified: coordinate with the user and running deployment owners before deployment, touching shared resources only if needed for the approved scope. Removed global operation/deploy/setup file locks from local deployment adapters and Hostinger flock requirement; added forward migrations that remove the per-target one_active_deployment index without changing released migration files. Request-key deduplication, explicit API approval, target/release/private-access checks and migration/recovery gates remain. Collector singleton/database operator lease are not deployment scheduling locks and are unchanged. Recovery export uses its existing scoped expiring export record; it no longer depends on the global operation.lock.

Updated central governance, operations/tagged-release guides and release instructions with user-directed app/target/timing, running-owner coordination, parallel independent work and shared-resource limits. Parallel operations remain subject to human coordination because Compose/state/operator checkout/database resources can overlap; removing a lock is not proof of conflict-free simultaneous deployment. Existing lock files/running operations were not inspected, cleared or stopped. No SSH/VPS changes, local production deployment, release, commit or push requested/performed in this step. Installed1.0.28 tooling still retains its published behavior until an authorized release/update. Local source is in the clean release workspace, preserving concurrent edits in the main checkout.

Typecheck, JavaScript/shell syntax and diff checks passed; focused target/latest-release/recovery and parallel-operation checks passed so far. Final focused suite result follows.

Verification closeout:20/20 focused tests passed (latest-release guards, private target checks, recovery IPC, API approval/deduplication, parallel operations and maintenance). Typecheck and syntax/diff checks passed. No deployment or publication performed.

### 2026-11-20 sequential script automation — Platform first, in progress

User explicitly authorized completing selected app setup/update/Dockerfile/Compose automation, Platform first then dependencies, no direct container repairs/new deployment locks. Two workers are implementing/reviewing Platform safety and isolated real-Docker setup/update tests; no parallel production deployments. Inventory14products, excluding separate-client logicx-app, libraries/addons/templates and copied operator/devdocs folders. Canonical app source is dirty and preserved; clean CodeShip release workspace used. Platform owner is concurrently performing its own local rollout, so this chat has not touched shared local production state or VPS services.

Prepared1.0.29 local script changes: remove deployment file/flock and per-target index gate (new forward migrations), selected Hostinger Platform setup/update and local latest-release entry, no implicit bulk devkit entry, explicit bound SQLite/key paths, immutable no-op/readiness, update ownership guards and all-current-scope offhost Platform recovery.29focused checks/typecheck passed. Disposable Platform13/DinD integration running; no claim of completed setup/deploy yet. Checklist: main docs/sequential-deployment-automation-20261120.md. Publication and selected rollout pending verified integration and owner coordination.

Platform tooling verification update: full CodeShip suite115/115passed in68966ms; no skipped/failed tests.29focused policy/migration/transport checks and typecheck also passed. Production frontend build and isolated actual Platform setup/repeat-setup/update tests remain running/pending; no release or production rollout yet.

Production frontend build for prepared1.0.29 completed successfully; existing Vite extension warning retained, no unrelated config change. Full suite115/115passed; later explicit approved-tag selection added and its focused13test run passed. Disposable full setup/update test still pending; no tagged release or production rollout yet.

Disposable test prerequisite failure: first DinD runtime lacked libatomic for its pinned Node26 Alpine binary. No Platform setup executed. Corrected only the local test Dockerfile to copy libatomic from the same pinned official Node image; no package installed into a running container. Harness removed only its labelled disposable engine/volume. Receipt C:/Users/sunda/AppData/Local/Temp/platform-lifecycle-ba283488-jPUeoW/receipt.json. Rebuild/retry12→13 pending finalized recorded-resume source. Existing production containers were outside the test engine and were not repaired or restarted here. Core App remains pending.

Release selection note: local Platform owner completed1.0.16/996350d5a17eb901023ce74a6509ab0666ae59d6/imagec6e5272c0d3c0bebd0dee73a5436728f1aa3012672e81d90887d6f958cb0aa11 and is proceeding with its own local apps; this chat remains isolated. Existing source12/13 have identical migration manifests;16adds master20261120000000_retire_master_identity.ts, with no changed/removed historical files. New Platform16 approval .codeship/releases/approved-2026-11-20T06-20-28-801Z.json validated successful tagged GitHub release. VPS16 must not be treated as image-only; current plan includes actual local scoped backup/independent restore/migration verification before selected rollout. No VPS deployment started.

Dockerfile finding from actual isolated image transfer: approved Platform12 runtime is about1.4GB because its runtime stage copies the full /opt/codebiz build tree, including installed build dependencies. Do not mutate the published image or strip live files. After script correctness is verified, consider a separately tested Dockerfile-only app release pruning development dependency trees while retaining API dependencies, compiled framework/UI artifacts and frontend assets. Current baseline test intentionally uses unchanged approved image; VFS nested import is progressing slowly. No production Dockerfile/image replacement performed here.

Disposable storage correction: VFS12→13fixture was ended before any Platform setup because measured layer-copy overhead made it impractically slow. Harness ownership checks removed only its labelled engine/volume; absence confirmed by worker. Receipt C:/Users/sunda/AppData/Local/Temp/platform-lifecycle-739b81dc-afmrm8/receipt.json records storage-overhead abort, not a functional app failure. Source harness now has explicit test-only overlay2 selection, Node smoke, bounded image transfers and safe owned cleanup. Corrected12→13baseline rerun is in progress with final source hashes;13→16 pending migration/independent restore test follows only after baseline passes. No production deployment or publication yet.

Target image-store compatibility finding: classic nested Docker reports configuration IDs, whereas these approved releases use containerd manifest image IDs. Do not relabel/fake IDs or relax immutable checks. Read-only Docker info on BOTH actual local Desktop and Hostinger reports driver-type io.containerd.snapshotter.v1. Fixture source now targets that store; classic overlay2 attempt is being closed before application setup and retried in matching mode. Added release-image preflight requiring containerd for manifest-ID releases,2tests passed and typecheck passed. Actualtargetprereqaudit only; no server setting changed.43final policy/recovery/resume checks also passed after the added journal/preflight code; full actual setup/update still pending.

Current proof update: matching containerd fixture imported Platform12 and its strict approved imageIdbc969027f2d75bf6efa61e8694688b95c966b668052a7339206ec99437b652ab inspection passed, resolving the classic-store mismatch without image aliases. Remaining immutable images are transferring before actualsetup. Sourcefinal resume/migration preflight updates passed43targeted checks and2image-store checks plus typecheck. No claimed functional setup/update completion, publication or live rollout.

Read-only Hostinger migration prerequisites verified: pg_dump18.6 and pg_restore18.6 (Ubuntu18.6-0ubuntu0.26.04.1), available under /usr/bin. CurrentPostgres container immutableimage68e33adb18d9962952f00d5e3b8644305e10e375f98dd652bf6ee6a1836314ba, major18. No package/server changes. Scripts now compare client/server majors before channel/writerstop. Test fixture corrected gatewayallowlist and now includes early invalid-settings refusal with no DB/role/container/journal creation; final12→13→13noop→16actualscopedrestore fixture is running. These are tests inprogress, not verifieddeployment outcomes.

Actual isolated Platform baseline results (worker receipt will be finalized after gated16step): invalid gateway settings were rejected before any platform database/role/container/fresh ownership journal; valid12 fresh setup passed; repeatedsetup refused as installed/useupdate and preserved the exact container; synthetic business source row was not imported. Approved13 image update now running, then same13no-op and16scopedmigration/independentrestore. These verifiedlocal stages do not claim VPS/live setup or finishedfulljob; no sourcepublished or proddeployment yet.

### 2026-11-20 Platform actual setup/update/migration integration VERIFIED

Final receipt C:/Users/sunda/AppData/Local/Temp/platform-lifecycle-9d232d22-Zmf1rg/receipt.json completed07:10:48UTC. All8critical production-source hashes match current candidate. Pinned testengine861d456088885a5f8d636a77d3bbf7b5d4d044adc358ed1cd495f50a6c869f91, containerd store exactly matchesbothactualtargets. Negativeconfig rejected beforeDB/role/container/ownershipjournal. Fresh12setup passed with0copied business/sessions; repeatedsetup refused and preservedcontainer. Actual12→13 replacement preserved publicidentities; repeated13update no replacement; image-only no backup/migrate. Actual13→16 update used production recoveryIPC, checked BOTHmaster/tenant dumps and independently restored each in outer network-noneDocker BEFORE newmaster20261120000000_retire_master_identity. Finalimagec6e5272c0d3c0bebd0dee73a5436728f1aa3012672e81d90887d6f958cb0aa11; tenantidentity fingerprint preserved; nestedPostgresID unchanged. No hostsocket/keys/source mounts/ports. Labelledfixturecleanup passed; stagingruntime/context deleted, evidence retained. Host inventory differences due concurrentowner work are recorded without attributing them to thisfixture. This certifies local integration only; no VPS rollout yet. Earlier failedlibrary/VFS/store/invalidfixture attempts remain recorded honestly. Preparing1.0.29release next; broader14-product checklist remainsinprogress.

Final full suite caught3outdated release-image test doubles after the new read-only Docker store query (132/135passed); production integration-source hashes remain unchanged. Updated only those mocks to return DriverStatus and added an assertion that incompatible store fails before image effects.6targeted release-image checks passed. Full suite rerun follows; failed intermediate run is not counted as passing.

Release closeout beforepublication: final full suite136/136passed in17585.93ms,0skipped/failures; typecheck and production build passed. Actual integration receipt remains matchingall8criticalsourcehashes. CodeShip1.0.29approvedscope onlyscript/tooling/requireddeployment-indexmigration/docs/tests; no UI/businessfeature changes. NextstageGitHubhelperpublish/taggedCI, then selectedPlatform16Hostingerupdateonly. Otherowners continue independentWindowsrollouts; thischat does not altertheirlocalproductionCompose/state or clearoperationfiles.

### 2026-11-20 Platform Hostinger migration blocked; prior service recovery in progress

Published CodeShip tooling1.0.29/6a5e9b4ac75df2accbd952208367eca4625f6e50; tagged workflow44693750557 succeeded. Selected Platform13→16 Hostinger update run2026-11-20T07-21-21-112Z passed image/config/client preflight and both scoped backups plus independent offhost local Docker restores. The immutable16 retirement migration refused populated legacy master identities without historical tenant-preservation proof. Platform13 remains stopped; its successful pointer/image and all four retained configuration hashes remain unchanged. No migration-success/replacement stage recorded. No direct VPS repair, source change, database restore/downgrade or Cloudflare change. Other services untouched.

The earlier synthetic fixture had no legacy master identities and missed this populated case. Actual protected backups reproduced the refusal locally. Tenant has13identities and no historical-import metadata; three master identities already exist there, including one password changed before this installation. All three historical native proof digests exactly match the official projection of the restored VPS master. No identity/password/role overwrite or proof insertion has been performed.

Recovery references: local protected recovery/4aa06cad-2c37-4d3d-aeb5-f25ea644b179/platform.dump (master SHA68d4013e273f7085d613bbe1e990dc45be1ab3281f3b1c70dc53d762b1b2300e) and recovery/adbb6b64-e0e3-4f05-b736-a6d20ebc0c81/platform.dump (tenant SHA08fde52d25d6aed8abba1819a143d894ef1d150968b6bf5fa9b747773cdb55e8). Both original verification records confirm offhost restore. Matching dumps retained in target private operational state. No secret values recorded.

Next: develop/test/publish an explicit released-update prior-service recovery bound to exact stopped approved13 image, current/retained config hashes, old migration history, and independently restored schema/data fingerprints for every scope. Start only the unchanged prior service after a fresh proof recheck; no automatic rollback. Then test proof-only metadata reconciliation and official immutable retirement authorization locally before retrying16. All dependent products remain pending.

Prepared1.0.30 local verification: all160tests passed (28427ms), typecheck/version checks passed. A first concurrent test run failed a newly edited static assertion while integration was in progress; corrected assertion and final full suite passed. The strict archive-schema proof compares original pg_restore SQL, stripping only exact paired randomized restrict markers; it does not normalize SQL expressions. This avoids PostgreSQL18 restore/re-deparse changes weakening the check. Actual13 synthetic populated master refusal demonstrated unchanged original archive DDL in both scopes; remaining fixture closeout and actual protected baseline results follow. No30publication or prior runtime start claimed yet.

Actual protected baseline completed locally: original master/tenant archive hashes and offhost verification records checked; both scopes restored independently, data/legacy fingerprints computed, original archive schema SQL hashed without semantic normalization. Protected evidence: platform-retirement-repro-20261120/prior-recovery-baseline.json; bounded credential-free ticket generated separately. Its two scope records bind the exact failed run and backup SHA values above; fixture cleanup confirmed. This is recovery evidence only, not a claim the VPS service has restarted.

Actual isolated prior-recovery integration passed: C:/Users/sunda/AppData/Local/Temp/platform-prior-55da7096-jKpUi6/receipt.json. Approved13 plans, real dump/restore data+identity across different owners, actual16 populated-master refusal, unchanged old history/schema/data/identity, exact original-archive DDL versus fresh current archive in both scopes, and data/schema tamper rejection verified. All owned containers/network cleaned. No shared local application start. Helper SHA977167a4695fe71282a5f9b8fdd13bb8197252c3f7d699fc220a4ea1d73418ba. Selected start args covered by fail-closed tests. Publication30 now authorized after these checks; tagged CI and actual recovery outcome remain pending.

### 2026-11-20 Platform prior availability restored through published updater

CodeShip1.0.30/e1a1d991c8206b0e5885e30d5a8eb385259c7191 taggedworkflow44697839204 succeeded. Invoked published selected update.sh Platform --target hostinger --tag v-1.0.13 --recover-prior protected bounded ticket. Actual current schema SQL/data/legacy fingerprints matched both original checked archives; migration history and current/retained four configuration hashes matched, exact stopped approved13 image admitted. Fresh second proof passed, selected --no-recreate start preserved Platform ID and all sibling bindings, bounded readiness/image/storage/metrics verification passed, prior-recovery passed. Exit0: prior13 availability restored without migration or data restore; successful13 pointer retained. No direct repair/source edits/VPS tests or Cloudflare/local production change. Initial bare bash resolved to unavailable WSL and failed before any remote action; reran same script with installed Git Bash.

Forward16 update remains pending locally verified historical proof-only orchestration. Core and remaining apps pending; no advancing dependent deployment before Platform completion.

Prepared31 script verification:172/172 full tests passed (25610ms), typecheck/version31passed. The real offhost attestation provider restored the protected actual master archive locally, invoked the approved16 image’s original legacyIdentitySnapshot over the isolated restore container namespace, and matched the independent digest/counts3users/3credentials/0sessions/3memberships/1operator. Provider fixture cleanup confirmed. First provider attempt caught missing stdin flag locally; fixed and actual test passed.

Historical stdin-only adapter actual-backup test passed: four unsafe child proofs rejected before metadata insertion; wrong physical archive SHA rejected at host boundary. Correct case preserved every tenant identity/credential/role/grant/session/auth-event fingerprint, inserted only3historical proof rows and ran original authorization/up through normal master migration history. No backup/proof file or recovery database credential mounted into migration image. Exact final production CLI/mount-path test is still running. Read-only review caught ESM package resolution from /run; corrected readonly mounts beneath the immutable app directory and canonical tenant-code check before final test.

Fresh16 setup protocol gap found locally: released installer expects only two master registration tables. Script now validates the retained older payload before provisioning, derives a private installation payload, records both source/installation hashes, preserves all8tenant identity/permission tables, excludes sessions/business tables and retains the original input. Three payload unit tests passed; actual latest16 fresh/setup-refusal/no-op test in progress. No31publication or forward VPS retry yet.

Local fixture housekeeping: an initial fresh16 disposable engine used an unapproved operator image before app setup; stopped and removed only its owned engine/volume, then reran with approved29 operator image. The abandoned local runtime/context folders under Temp/platform-lifecycle-fd3e553e-ssSKnK were retained because automatic approval review rejected their checked native PowerShell removal with only “blocked by policy”; no bypass/retry. This is local test residue, not VPS scratch or application data. Current approved fixture is separate and remains running.

Final31 actual Docker acceptance passed. Latest16 fresh lifecycle receipt C:/Users/sunda/AppData/Local/Temp/platform-lifecycle-ef4de455-RjIHy1/receipt.json verifies all15checks: setup healthy, original6masterpayload retained, derived2master+all8tenanttables exact, checked journal/source digest, no legacy master identities, credentials/permissions exact, sessions/business0, repeatsetup refusal, same16update/repeat no-op preserving container and no backup. Approved29operator/source13/candidate16 image identities recorded; successful fixture engine/volume/runtime/context cleaned. Host inventory changed concurrently, so no global conservation claim.

Exact migration CLI acceptance with restored actual backups passed at the production readonly mount path. Receipt platform-retirement-repro-20261120/receipt-platform-retire-repro-bf17f148.json: wrong tenant and invalid metadata refused, only3historical proof records inserted, official authorization/up/history/audit passed, all current tenant identity/credential/role/grant/session/auth-event fingerprints preserved, follow-up generic16migration exit0. No archive/proof file or restore-database credential mounted into the migration image. CLI SHAe03140c24c0314b0980350c1c67c0c208efba1f605bed67c53dcc727695ee28d; helper SHA608016e43e5df91cca8fc4b8657a8d3b731f3d1df6192c5da7b53de087d3fb60. Earlier private negative-fixture construction failed on immutable tenant-code guards; corrected the isolated fixture only, then passed; all those owned fixtures cleaned. No production source fix inferred from those fixture failures.

Ready to publish31 after172tests/typecheck/version checks and these actual tests. Platform13 remains available on Hostinger; forward16deployment and all subsequent apps remain pending tagged CI.

Publication coordination: prepared31 release was refused because another authorized chat had already published CodeShip1.0.31/6cac8e42dd28002b20bdff7b79bd79cb743c26d5 (tab-isolated launcher), a direct child of30. Existing tag untouched. Preserved the audited script work in a named Git stash, fast-forwarded the isolated release branch to approved31 and restored the script work; resolved only version/changelog/release-note overlap while retaining approved31 history/source. Preparing next1.0.32. The owning chat acknowledged no competingCodeShiptag during32. Approved UI7beafa2c103e0f712b1c764b7cc494db784d0f44 andSDKccff028cc970174ed9283beca07834e5290b2bfd pins retained; corresponding clean release-workspace dependency checkouts aligned. UI build andSDK22tests passed; final integrated CodeShip tests/typecheck/frontendbuild running. No canonical dirty product folder, local production or VPS changed by this integration.

Integrated32 baseline verification complete:173/173CodeShip tests passed (39266ms); typecheck and production frontend build passed with existing Vite extension warning. UI20build andSDK12all22tests passed at their exact approved31dependency commits. Critical Platform setup/migration scripts remain the tested code; approved31frontend/business-metrics changes preserved rather than replaced. Platform17 compatibility audit found unchanged19migrationhashes and existing tab/login protocol;17 adds the launcher GETlanding route missingin16. Actual16/17 pure entryHTTP checks verified16denial,17success and unchanged unsafe-method/query/crossappdenials; full17post-retirement runtime proof running separately before its VPS selection.32publication contains script-only new changes on top of approved31.
