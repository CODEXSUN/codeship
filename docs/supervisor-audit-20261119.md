# CodeShip scoped startup release audit — 2026-11-19

Status: release-ready (source checks complete; immutable workflow pending)

Baseline6c31dea CodeShip1.0.15. Isolated1.0.16 adds authenticated read-only PostgreSQL dependency waiting before child launch through framework0.2.0. Only transient recovery/transport errors retry; credentials/schema errors fail closed. Startup deadline180s, max50attempts, delay500ms up to5s, cancellation supported. Tailwind app scanning bounded to src/web; shared styles retained. Existing released private ingress network test corrected to supply its assigned address.

Pins: framework51daaa2a7bee32d0a8eca806a2b0e8a765a3e1ac, UIe88945f101313051ded3557e14b0363a0a6ca906.68/68tests pass23.69s; typecheck passes; build1.67s; whitespace check passes. Real disposable PostgreSQL test validates shared-helper loading and SELECT1 before snapshot verification. Prior primary full suite72/73passed with unavailable fixture; isolated retry is fullygreen.

No migrations, backups, credentials, data or live container changes. Primary app-owner adapter changes preserved outside this scoped release. No coldboot or responsive-browser verification is claimed here. Existing port contract14350:4350 recorded; full port rollout remains app-owned. Tag/commit/workflow/image manifest recorded after publication.


## Follow-up release verification

1.0.17 reviewed adapter release1ec1348ee8b907a34473b82676eb42d5a19e29cd hostedworkflow44435768376success; frozen tagged hostoperator provides selected independent ports and Docker-only Billing/Core browser origins, plus metrics process identity validation.1.0.18 candidate aligns300s dependency/360s health grace/480s operation deadlines and passes75/75tests32.76s,typecheck,build1.63s. Virtual timers cover readiness immediately before total expiry. No new migration files. Live CodeShip remains verified1.0.16; Platform1.0.8 verified and sibling identities preserved; Core0.1.4 update is in progress through frozen17operator. Do not infer all candidate features are live yet. Primary report holds evolving queue/history.
