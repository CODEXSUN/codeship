# Shared login role promotion — 21 November 2026

Scope: coordinated shared UI role presentation across Platform, CodeShip, Codeitz, UIUX and IILabs. Admin uses a blue shield badge and button; SA uses a green crown badge and button; User retains its person icon and app tone. IILabs removes its Admin/Client switch anchor and unused styling, retaining /login, /admin/login and /sa/login.

Shared UI v-0.1.23: 5c481fbb67511cf7c63e04f15813af846893be59. Owner verification: locked typecheck/build, 122 UI tests, four release-tool tests and fresh browser theme/brand proof. No shared UI hosted workflow exists; this is not a hosted-CI claim.

## Verified local and staging work

Platform 1.0.20, CodeShip 1.0.43, UIUX 0.1.18 and IILabs 0.1.16 passed immutable-image local and Ubuntu staging admission. All four products' three login routes passed role badge, submit icon, actual background color and light/dark checks. IILabs switch links are absent and direct URLs retained. CodeShip original SA login, workspace identity, wrong-selector and foreign-origin rejection, cross-session CSRF, logout and sibling-session preservation passed locally and on staging. UIUX owner verified original login, interactive Main/Agent previews, reload, tab isolation, catalogue and logout locally and on staging. IILabs synthetic staging tenant login, permissions, JSON save/reopen, public pages, foreign-origin rejection and logout passed.

Platform image-only updater was released in CodeShip 1.0.43. It reads the installed effective private environment and Compose overrides instead of stale registry settings and rejects pending migrations. Its actual Platform 1.0.20 local update passed, retaining equivalent peer/origin sets and tenant settings. Production Platform 1.0.20 passed through the released update.sh; all normalized PLATFORM_* fingerprints match the pre-update baseline, including the independent IILabs tenant connection. The update did not recreate sibling application containers.

CodeShip typecheck/build and 210 tests passed, followed by successful tagged CI. All four available migration manifests match their prior release byte-for-byte. No database migration, data import or credential rotation was required. Existing verified recovery backups remain retained; released updates retained previous configuration references.

One UIUX local attempt stopped before admission/replacement because concurrent image preparations raced over the same Windows cache filename. After image preparation completed, its sequential retry succeeded. This was corrected in execution; no VPS patch or application fix was made.

## Final released identities

All three targets run the following exact image/source identities. Ports bind to 127.0.0.1 only; staging browser access uses the existing SSH tunnels.

| Product | Version | Source revision | Image digest | Private host:container port |
| --- | --- | --- | --- | --- |
| platform | 1.0.20 | a506697151be4e7bb37a0cbc0ebfc4151979a56e | sha256:2c9a94fc9ea185ed1665eb930dd07a68abc25eff6c8e24e092629455ffeed126 | 14385:4385 |
| codeship | 1.0.43 | 1fb1c91e22658476ecb413c72e98d5def24b86a7 | sha256:dc9b4f88a11902c010c099518957620a505f89980f98f0d518c7b3b450613116 | 14350:4350 |
| codeitz | 1.0.19 | 899c667c22f1d20e3681198ace591592ed2d9e77 | sha256:b6a7e22a992c7ccc2a7b11972aca0b576a2b5da6793d9a1483003a164d29c85a | 14305:4305 |
| uiux | 0.1.18 | 1c8b1be55797f800233009181e057c800f9c68fe | sha256:2f7fea2fe4ae3b223b6756e2fc7c9c85c861c38b5cf137708c37bee261fe247e | 14315:4315 |
| iilabs | 0.1.16 | aed5f14d4202a4dcefcd62c962217abe1dcec4b8 | sha256:7e80a30f2feccbc95bb505e6a6189eaf853eb8942554682468b4f9dbcff6e9cc | 14435:4435 |

## Completed verification

- Local and staging each passed 30 anonymous login appearance checks: five products × three original routes × light/dark. Admin uses blue/shield; SA uses green/crown; User retains its own tone/person icon. IILabs has no Admin/Client switch links. Its direct URLs and recovery behavior remain available.
- Codeitz 1.0.19 installed local and staging checks passed existing owner login, Admin→SA in one tab, independent tabs/refresh, task/chat streams and reconnect, logout/sibling preservation, and both browser test-session logouts. No chats, grants, tasks or provider calls were created by these installed checks. Shared UI 0.1.23 pins retain SDK 0.1.12 and the release18 streaming fix.
- Codeitz prepublication concurrent local tests initially produced three schema-introspection failures and one timeout under database IO contention; these failures were retained. The affected tests passed a fresh serial run (17/17). Candidate browser checks, typecheck/build and tagged CI succeeded before admission. No unrelated app correction was included.
- UIUX 0.1.18 retains SDK 0.1.14 and passed interactive Main/Agent previews, iframe reload, separate tabs, catalogue access and logout locally and on staging.
- All five production updates completed through released CodeShip 1.0.43 update.sh, one selected service at a time. Every migration manifest matches its prior release, and every migration/import step was skipped. No business-data import, credential rotation or permission change was performed.
- Final Docker audit verified exact image IDs, source/version labels, healthy status, independent namespaces, exact loopback port bindings and absence of operator SSH-key/Docker-socket mounts across all 15 selected target instances. All 17 unrelated production container IDs and images are unchanged. The VPS controller is clean at CodeShip 1.0.43 commit1fb1c91e22658476ecb413c72e98d5def24b86a7.
- All five public HTTPS readiness endpoints and /login, /admin/login, /sa/login return 200; IILabs /, /services, /approach and /studio also return 200. Four apps expose their matching version through public service-info; Platform version is established by the verified Docker image/source labels. Production checks were bounded readiness/identity/route admission, not functional browser or migration tests.
- Metrics were available and less than 45 seconds old on local, staging and production at completion.

## Recovery, ownership and exclusions

The updates retained previous images, private configuration snapshots, databases and workspaces. No new database backup was required because there were no pending migrations. Prior checked/off-host-restored CodeShip SQLite and Platform master recovery references remain recorded in [the earlier five-app deployment audit](five-app-promotion-20261121.md); they were not replaced by an untested backup claim.

All corrections, builds and functional/browser checks ran locally or on staging before production. No VPS source patch, build, uploaded test helper, Cloudflare change, public-port exposure or deployment lock was introduced. Editable native repositories and unrelated unfinished work were excluded. The Windows archive-size display was delayed; an unnecessary interrupted image-transfer retry was confined to local preparation. Its abandoned partial file was removed after the checked archive loaded successfully.

A separate user-authorized mobile Todo follow-up is being prepared by the Codeitz owner as UI 0.1.24 / Codeitz 1.0.20. It is excluded from this login release and remains coordinated for a subsequent app-owned turn.

## Evidence and regular update pattern

Private, ignored audit evidence: .codeship/login-role-audit/{checklist.json,final-parity.json,public-final.json,migration-comparison.json,metrics-final.json}, local/staging appearance receipts/screenshots, and the app owners' private browser/HTTP receipts. These contain no committed credentials. Production configuration comparison hashes confirm all normalized PLATFORM_* settings remained identical through Platform 1.0.20, including the independent IILabs tenant connection.

Use the clean released CodeShip 1.0.43 operator and its selected entry for one app/target at a time. Platform UI-only updates use --image-only; this rejects pending migrations and retains effective installed configuration. Full IILabs updates use --backend on Hostinger/staging and the existing apps/update.sh release-set entry locally. Preserve the local→staging→VPS proof and immutable image identity; return blockers to local correction/release, never patch production.
