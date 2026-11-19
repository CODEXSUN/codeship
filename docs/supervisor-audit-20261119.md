# CodeShip supervised audit — 2026-11-19

Status: working

## Verified findings

- Primary CodeShip checkout contains concurrent app-owner adapter and UI changes. Current version1.0.15; no blanket staging/publication performed.
- .container/apps/network-topology.mjs imported platformTarget twice; node --check failed with duplicate declaration. Removed only the second import. Syntax check now passes.
- Nine focused application-network, business-targets and platform-runtime tests passed (170.7ms test-run duration). Network isolation, byte-preserving relays and released Platform protections remain covered.
- All13 app/devkit containers currently report healthy; PostgreSQL, MariaDB and File Manager healthy; Redis running without Docker health status. No container restarted by this audit.

## Next work / release queue

- Review bounded dependency readiness before app process launch. Startup must not migrate, seed or reset databases.
- Await owner reports and pinned shared dependency releases before admitting immutable app updates.
- No controlled stack boot rehearsal until release queue and other testing are clear.
- Existing current port contracts and app-owner runtime edits must be reconciled before shipping the complete adapter release.

## Release and preservation

No new tag, workflow or image is claimed. No migration, database write, credential rewrite or deployment performed in this audit stage. Existing data/volumes and native processes remain untouched. Frontend responsive audit and outage/recovery rehearsal are unfinished.

## Startup fix under verification

- runtime-network.mjs now probes configured PostgreSQL database URLs with authenticated read-only SELECT1 before launching the app child. Exponential delay500ms to5s; retry window180s; SIGTERM/SIGINT cancels startup. No migration/seeding commands. PostgreSQL outage therefore waits inside the supervised wrapper rather than immediately starting a failing application.
- Three deterministic tests cover recovery at7.5s, failure at1.6s configured test budget, and cancelled startup without app work. Seven combined startup/network tests passed in150.6ms; typecheck passed. Full suite still running. This is source verification, not a real Docker outage rehearsal.
- All inspected consumer reports remain working/dependency-pending; none admitted for rollout. Devdocs explicitly blocked as scaffold-only.

## Latest verification and release gates

- Replaced the initial local retry implementation with shared framework waitForReadiness; pinned published framework0.2.0 SHA51daaa2a7bee32d0a8eca806a2b0e8a765a3e1ac. Runtime loads the package public import export from the app dependency location because its mounted wrapper is outside node_modules resolution. Shared hosted CI pass supplied by framework owner; CodeShip image has not been built/released.
- Retry classifier permits only57P03, ECONNREFUSED, ECONNRESET, ETIMEDOUT and08006. Credentials/schema/privilege errors fail immediately. Five current startup/network tests pass in133.8ms. Earlier three generic retry tests were removed because framework owns that mechanism.
- Bounded Tailwind source discovery to src/web; shared UI styles remain imported. Production build passes in1.79s; known dependency use-client warnings remain. Typecheck passed after the current startup/style edits.
- Full suite before final framework integration:73tests,72pass,1fail in147973ms. Failure: tests/postgres-snapshot.test.ts could not obtain a ready disposable PostgreSQL fixture (130695ms), matching supervisor Docker run/rm contention observations. Do not report full-suite success. No managed lifecycle process/lock owner was found by the contemporaneous read-only inspection; do not infer Docker daemon health from that.
- No release publication or Docker rollout while shared UI pin and PostgreSQL fixture verification remain pending. No controlled boot rehearsal yet. Current report is working, with release gates; not release-ready.


## Scoped release published

CodeShip1.0.16 annotatedv-1.0.16 source25287089c112c4068133762678e42bfd0713fa72 published through GitHub helper from isolated codex/codeship-startup-1016, merged to remote main. Primary dirty owner checkout preserved; no pull/reset performed. Final isolated68/68tests pass23.69s, typecheck pass, build1.67s. Exact final framework/UI pins published. Hosted image workflow44432510823 in_progress; no deployment admission or image manifest yet. Original fixture failure recovered on bounded standalone retry; no database/daemon restart performed.

Serialized queue: CodeShip1.0.16 operator candidate; Platform1.0.8 e4c4b25d9dff717c0533c08a6ada499d16856ff4 workflow44432360123 in_progress; CoreApp0.1.4 aa7ba24f38e86d0bdbababa2c452a7747e72600a workflow44432363908 in_progress; Billing follows Core verified readiness. Other owner releases not yet admitted. New runtime wrapper requires images consuming framework0.2.0 public waitForReadiness; do not apply it blindly to old app images.


## Live CodeShip update and metrics recovery

First approved update run2026-11-19T00-57-57-878Z replaced only CodeShip with1.0.16 imagefb84655acb01491e73a8b1a09b9b7f91e9f57005ac3768a061a13ec65c0e9502, healthy14350:4350. Schema plan had no pending migrations; no backup/migration performed. Finalstage failed01:03:18UTC: Fresh grouped Devkit metrics not available. State pointer intentionally remained1.0.14; failure retained. Strict before/after baseline independently confirms all sibling IDs/images/mounts, unselected registry ciphertexts/runtime files, existing publicIDs/key and SQLite integrity preserved.

Rootcause: metrics collector.lock PID20260 now belongs to chrome.exe created06:13:35 local, not CodeShip collector; snapshot last updated2026-11-18T18:46:20UTC. PID-only liveness admitted the reused PID. Verified process identity, removed only stale lock, left Chrome running, launched collector through frozen tagged1.0.16 ensureMetricsCollector. Approved update retry in progress to complete normal verification/statewrite; no manual success pointer mutation. Permanent process-identity fix is next scoped source task. Platform/Core manifests independently verified, serialized queue waiting this recovery only.


## Verified recovery and queue progress

CodeShip approved retry2026-11-19T01-08-16-903Z succeeded01:10:34.629UTC:1.0.16, schema skipped(no pending migrations), registry/health/origin/fresh grouped metrics passed. Strict unselected container/row/ciphertext/runtime-file/key/volume baseline passed. First failed attempt remains in stages.jsonl; no manual pointer editing.

Platform1.0.8 approved update2026-11-19T01-14-23-733Z succeeded after actual master/tenant migration plan returned no pending migrations. Local entry configuration/private network checks passed; sibling container identities and final verification passed. No backup/migration required.

CodeShip1.0.17 immutabletag1ec1348ee8b907a34473b82676eb42d5a19e29cd workflow44435768376SUCCESS;73/73tests29.22s/typecheck/build1.33s. Frozen tagged operator prepared for complete reviewed port/browser-link/Abconnect/Platform adapter set and permanent metrics process-identity fix. Primary owner edits remain intact; no blanket staging. Core0.1.4/Billing1.0.8/CRM0.1.3/Ecommerce1.0.12/HRMS0.1.2/UIUX0.1.11 release manifest preparation in progress.

Follow-up1.0.18 source aligns dependency300s, child60s, health60s, Docker health grace360s and operation480s; virtual-time near-deadline regression passes. Scope still no database mutation. Not yet published. Core update waits approved17operator and checked image prefetch only. Texlinks newer database-backed image remains unadmitted pending explicit adoption/history review. Automation latest has a pending fairness-index migration: quiesce API/worker + checked recovery backup mandatory before explicit migration; not image-only.


## Live browser and infrastructure policy verification

Own isolated headless Chrome verified actual viewports360/768/1440/1920 across Infrastructure, Applications, Devkits and Registry (16page-width combinations). Every document/body width exactly matched viewport; main canvas360/460/1132/1612 respects sidebar and expands with viewport. Titles match intended pages. Evidence .codeship/browser-audit-20261119.json. This is DOM layout evidence, not authenticated business transaction certification. Browser process used a dedicated CodeShip profile and was stopped; other browsers untouched.

Infrastructure SQLite saved policy is explicitly public for PostgreSQL5433->5432 and MariaDB3307->3307, with empty whitelist; actual Docker HostIp0.0.0.0 matches. Earlier user requested SQL public/whitelist controls. Redis6379 and File Manager7090->8080 policies are local. Public SQL bindings retained rather than silently overriding saved policy or disrupting LAN clients; Internet reachability is not established by this binding evidence. No engine, credentials, exposure policy or infrastructure container changed.

CoreApp0.1.4 update2026-11-19T01-21-13-282Z succeeded01:23:06.485UTC. Actual migration plan skipped(no pending target migrations); imagee544e449e0ed4e8a27e283495c39ef594e6638e310d56ccfad65d746ecb54163,14345:4345, private admission passed; actual container publicOrigin/webOrigin bothhttp://127.0.0.1:14345. Billing1.0.8 update started, not yet verified.

CodeShip1.0.18 tag917aeb2b273c42da21a872bd976c28516edcf394 initial workflow44436349876 failed during dependency-source context preparation before build, generic safe log contains no concrete source error. One permitted unchanged-source failed-job retry launched; tag retained. No failed18image admitted.17success remains deployable adapter.


## Approved final serialized queue

Billing1.0.8 first update succeeded; migration plan had no pending migrations. Core prerequisite is verified14345:4345. CodeShip1.0.18 unchanged-source workflow retry2 succeeded; initial context-preparation failure retained, no tag moved. Final immutable917aeb2b273c42da21a872bd976c28516edcf394 frozen18operator approved.75/75tests/typecheck/build1.63s passed.

Final serialized queue started .codeship/run-supervisor-queue-20261119.mjs: CodeShip1.0.18; Platform1.0.8/Core0.1.4/Billing1.0.8 wrapper refresh to align startup/health/operation deadlines; Ecommerce1.0.12; HRMS0.1.2; UIUX0.1.11; ABConnect0.1.5; Automation1.0.8. Each exact manifest independently revalidated; runtime/ciphertext/data preserved; actual pending migrations decide backup. No CRM/Texlinks rollout: explicit supervisor holds for1MiB response/paging and database adoption respectively. No Codeitz/Zetro rollout until owner-ready immutable releases. Queue stops on first failed stage; lock prevents concurrent deployment. This started01:30UTC, not a completion claim. Boot rehearsal remains a separate stage after release queue/testing clear.


## New catalog hold steering

Supervisor reported realistic5000-item Billing1.0.8 response1,340,346bytes exceeds Platform1MiB; Core bootstrap8–9MB. Billing first update already succeeded before this hold arrived; no downgrade/reset performed. Final Billing certification is held pending Core0.1.5 lean bootstrap/lookup then Billing1.0.9/UI0.1.13. Existing serial runner loaded its list before new hold; intact mixed approved set was temporarily renamed with .catalog-hold suffix so it stops before the next Core/Billing batch after current selected CodeShip/Platform stages. No approved manifest content changed, no active deployment process killed. Other apps resume through revised selected queue after controlled stop. Hold file .codeship/supervisor-holds-20261119.json persists instructions.


## Final queue checkpoint

CodeShip1.0.18 verified01:32:37.324UTC (run01-29-25-591), exactimagea7c15841a7e78b5408c778fb8f5d93f434956273845f544e458a67e48396c44f,14350:4350, restart0; permanent process-identity check also confirms the running host collector. Platform wrapper budget refresh1.0.8 verified01:34:06.685UTC; observed healthy within11,782ms of DockerStartedAt, restart0. CodeShip first-observed healthy9,681ms (upper-bound polling measurement); these are warm selected image/wrapper updates, not coldboot evidence.

Mixed queue stopped intentionally before Core/Billing batch after catalog hold; approved artifact restored intact only after lock cleared. Revised hold-aware queue continues unaffected apps. Ecommerce1.0.12 verified01:35:58.869UTC, HRMS0.1.2 verified01:37:43.498UTC (healthy8,981ms/restart0); actual migration plans had nonepending. UIUX0.1.11 update inprogress. ABConnect0.1.5 and Automation1.0.8 next; Automation requires checked backup/migration if actualplanpending. Zetro1.0.4 owner handoff nowready49afb772c92d86e2114d014835b80ff233a7915d/workflow44436691339success; manifest preparationvalidated and queued after active batch.

Boot rehearsal explicitly remains pending parent clearance for catalog-fix fixtures; do not infer full-stack completion. Framework supervisor user message was directly read/verified: user authorized this supervised all-app audit/fix/publish/local-deploy program and explicitly assigned cross-chat handoffs; no public/VPS authorization.
