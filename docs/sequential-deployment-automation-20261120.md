# Sequential deployment automation checklist — 20 November 2026

User authorized completing script/Dockerfile/Compose automation and verifying setup/update, Platform first, one product at a time; no direct container repairs and no new deployment locks. Fix/test locally; publish approved source, then invoke released setup/update entries on registered targets. Preserve existing data; setup verification uses isolated disposable Docker rather than dropping an installed database. VPS bounded deployment admission only; no functional testing/source repairs there. Coordinate active app owners and shared resources first. Cloudflare and Ubuntu unchanged.

| Order | Product | State | Dependency / current next action |
| --- | --- | --- | --- |
| 1 | Platform | running; forward update pending | Old13 availability recovered through published30 with exact proof/readiness passed. Locally verified historical proof adapter being integrated before16 retry; no dependent deployment |
| 2 | Core App | pending | Platform; fresh PostgreSQL target adapter |
| 3 | Billing | pending | Platform + Core App |
| 4 | CRM | pending | Platform + legacy MariaDB compatibility; fresh target adapter needed |
| 5 | Ecommerce | pending | Platform + PostgreSQL/uploads; no implicit native data import |
| 6 | HRMS | pending | Platform |
| 7 | Automation | pending | Platform + PostgreSQL + target-specific Redis ACL/network |
| 8 | Zetro | pending | Platform + PostgreSQL |
| 9 | Texlinks | pending | Platform + PostgreSQL; replace native-only source assumption |
| 10 | Abconnect | pending | Platform + PostgreSQL |
| 11 | IILabs | pending | Platform + PostgreSQL; current Windows-only adapter and owner release coordination |
| 12 | CodeShip | pending | Platform login; SQLite recovery, existing data/key volumes |
| 13 | Codeitz | pending | Platform login + PostgreSQL/workspace/state |
| 14 | UIUX | pending | Platform login |

CodeShip host tooling is developed first to execute Platform; this is separate from deploying CodeShip's app. Exclude libraries/add-ons/templates/devdocs/copied operator folders and separately scoped client logicx-app. Existing owned canonical app folders are dirty; use approved source and preserve owner edits. Git tags alone do not prove successful release CI/assets.

Local workers handle isolated proofs and script changes only. Deployment remains sequential. Platform rollout attempted and blocked as recorded below; all later products remain pending. Subsequent per-product outcomes/recovery references must be recorded here before advancing.

## Platform actual update outcome

Tooling1.0.29 CI44693750557 succeeded. Hostinger run2026-11-20T07-21-21-112Z verified both scoped backups offhost, then immutable16 migration refused missing historical tenant-copy metadata. Old13 container stopped; successful13 state/image/config unchanged. No migration-success or replacement, no direct repair. Protected master/tenant dumps and recovery references recorded in docs/work-record.md. Actual-backup local repro confirmed missing metadata, preserved current credentials and verified all3historical proof digests. Explicit released-script prior-service recovery and forward populated-identity tests remain running. No later app deployed.

Platform prior-service recovery30 passed: old13 running/verified through released updater only, samecontainer/siblings preserved, bothscopes unchanged, no data restore/schema migration. Forward16 adapter in progress.
