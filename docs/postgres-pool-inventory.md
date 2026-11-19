# PostgreSQL configured pool inventory — 2026-11-19

Current verified resident container envelope at2026-11-19T13:28UTC:83, after actual Codeitz1.0.12 single-pool release.97ordinary PostgreSQL slots leave14nominal slots before native/external/migration/maintenance demand. Earlier99/103sections below are historical and superseded by the final live reconciliation.

Read-only inventory. Docker became unavailable during this audit; the previous supervisor observation (max_connections100,19 sessions/1 active) is historical, not current health or capacity certification. No server tuning, restart, migration or app pool changes were performed.

| Owner | Last recorded release | Maximum per normal server process |
| --- | --- | ---: |
| Billing | 1.0.9 | 5 |
| Core App | 0.1.7 | 5 |
| Zetro | 1.0.4 | 8 |
| ABConnect | 0.1.5 | 8 |
| Texlinks | 0.1.5 | 5 |
| Automation | 1.0.9 | 8 total: API4 + worker4 |
| Ecommerce | 1.0.12 | 5 |
| Codeitz | 1.0.12 (live13:28UTC) | 5: one shared bounded runtime pool |
| Platform | 1.0.10 | 2 master +2 per cached tenant pool; default16 tenant pools =>34 |
| CodeShip / UIUX / HRMS | source inventory | No direct PostgreSQL runtime pool found |
| CRM | source inventory | MariaDB compatibility pool3; excluded from PostgreSQL total |

Seven business-app values were read with git show at exact commits in retained deployment state. Codeitz source was inspected at v-1.0.11: scripts/start.ts calls createServer without database injection; projects, work-task, task-runner, agent-chat and todos each open their own max5 pool. Platform's exact recorded commit a3c2eb3606bc5261023ffd4992cd4c6efef0eb77 was checked through authenticated GitHub contents: master max2, tenant max2 and default tenant limit16. Saved platform runtime.env contains no explicit PLATFORM_TENANT_POOL_LIMIT override. The runtime environment has not been rechecked inside the stopped engine.

Nominal one-server-process total:40 business apps +25 Codeitz +34 Platform =99. This is configured potential, not observed concurrent usage. PostgreSQL's maintenance/reserved slots and every additional API/worker/native process or migration connection must be budgeted too. With even3 reserved slots,99 exceeds97 ordinary slots by2; maintenance/migration headroom worsens that conflict. Codeitz pool consolidation or a lower owner-approved aggregate budget are candidates for owner review, not changes authorized by this audit. Platform has a separate max2 tenant-migrator pool when explicitly invoked; other migration/import scripts can open additional pools. Do not assume idle pools or the19-session snapshot prove safety under load.

Pending live evidence: actual post-recovery PostgreSQL reserved_connections/superuser_reserved_connections, runtime process counts and replication across all app/native/worker processes, effective per-image configuration, maximum simultaneously retained/active tenant pools, external consumers, and exclusive migration/maintenance reserve. The complete aggregate budget remains unverified until those are reconciled. No100-user capacity claim is made.

## Post-recovery live reconciliation

Docker returned without action from this chat. Read-only PostgreSQL query confirms max_connections100, superuser_reserved_connections3, reserved_connections0,19sessions/1active at probe. No exhaustion observed; earlier105burst denials remain gateway admission, not database exhaustion. Actual Node entry inventory confirms one API process for each listed business app and Platform, plus bridge launchers; Codeitz uses scripts/codeship-start.ts with no database injection, confirming five resident max5 pools. Automation runs scripts/runtime.ts plus src/api/server.ts and scripts/worker.ts: the latter two each call connectDatabase(max4). This corrects the earlier one-process subtotal: business apps44 + Codeitz25 + Platform34 =103 configured resident capacity, versus97 ordinary slots (6 above), before maintenance/migrations/external/native consumers. The bridge/startup launchers use temporary Client probes closed before API startup, not resident pools. Platform effective container environment has no tenant-limit override (default16). No additional API replicas were observed in these containers. Native/external consumers and live tenant retention remain outside this census.

Concrete owner review: Codeitz can consolidate its five independent pools through its existing injected database parameters; Automation must budget API and worker separately; Platform must explicitly budget retained tenant pools against the aggregate. These are review directions, not changes made or approval to reduce pools blindly. A target aggregate needs maintenance/migration reserve below97, so merely trimming6 does not establish a safe budget. All current values were preserved.

Live target-key check: each counted PG owner resolves configured PostgreSQL URLs (or Codeitz PGHOST/PGPORT) to postgres:5432. CRM resolves mysql: to mariadb:3307 and its max3 pool is excluded from both99preliminary and103corrected PG envelopes. Zetro's separate migration URL is present but not counted as a resident runtime pool. Only driver/hostname/port were emitted; no credentials or full URLs. Codeitz consolidation is owner-pending; projected83 must not be described as effective until compatible-role consolidation is tested, released and running.

## Codeitz1.0.12 effective live pool reconciliation —13:28UTC

Read-only Docker inspection confirms running image sha256:d3513fd5355c312a90c5acc00f46bcd53b5d413edbdce5258298b09842f1c0f3, version1.0.12, source da1a24359e26c9969193225033ae90a53e9344ac, healthy/restart0. Actual scripts/codeship-start.ts calls createServer with scheduling options only. Its loaded server source now creates sharedDb=database??databaseFactory(), default factory=openRuntimeDatabase(), which calls openDatabase with bounded server timeouts and max5. Projects/work-task/task-runner/agent-chat/todos receive that shared pool; explicit injected pools remain optional, unused by actual startup. One resident Codeitz Node startup process observed, excluding diagnostic probe. Shutdown hook destroys the owned shared pool. Target remains postgres:5432. This verifies default-pool wiring; no new load/shutdown tests performed by this audit.

Current container source recheck retains business maxima Billing5/Core5/Zetro8/ABConnect8/Texlinks5/Ecommerce5/Automation4perprocess. Automation API+worker count remains8; business subtotal44. Platform retains master2+default16tenantpools*2=34, no effective tenant-limit override. Codeitz now5, so44+34+5=83. Read-only PostgreSQL sample100max/3superuserreserved/0additionalreserved/18sessions/1active.97ordinaryslots minus83resident configured maximum gives14nominal slots; this is not a guarantee against native/external consumers, migrations, startup probes, future replicas or workload latency. No PostgreSQL tuning, migrations or data changes performed. CRM remains MariaDB/excluded. Source-only IILabs is not a registered running consumer and is not counted. Future registration needs a separate target/process budget.

After CRM8/Zetro6/Codeitz12 owner updates, all17logfeeds were fresh/available/bounded/no-store at13:28:22UTC; Apps10/Devkits3/Infra4 metrics fresh. Existing frozen21collectorPID22876 retained, no replacement or lock action needed.
