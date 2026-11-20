# GitHub releases to VPS updates

## Operator workflow

Make corrections, migrations and all functional tests in local development or isolated local Docker. Publish each audited app through its GitHub helper and wait for successful tagged CI plus release-manifest.json. Do not test/debug/build/patch a VPS or upload agent helpers.

Use a clean local CodeShip tooling release checkout with the existing operator GitHub credential and strict SSH profile codexsun-hostinger. The current adapter supports only registered Hostinger srv914719; it does not provision new servers or resume Ubuntu LAN.

    sh .container/devkits/codeitz/update.sh --target hostinger --check
    sh .container/devkits/codeitz/update.sh --target hostinger
    sh .container/devkits/uiux/update.sh --target hostinger

The owning app's .container/update.sh delegates to the same selected entry when the released CodeShip checkout is its workspace sibling. Run one app at a time. --check resolves the latest approved GitHub release locally; installed-version comparison happens when updating.

The local entry resolves the highest stable published tagged release, rejects a missing/failed tagged workflow or invalid manifest, and verifies the current clean tooling tag. Private UIUX access stays on the local operator: the server receives only an approved manifest and a temporary release-assets download URL, never the GitHub token. Ticket lifetime is30minutes. Source commands are clean GitHub fetch/checkout then tracked update.sh; no merges or forced resets, server npm installs/builds or frozen-source patches.

VPS source controller: /home/codebiz/devkit/codeship, checked out at the exact successful CodeShip tooling tag. Ignored .codeship/node_modules links reuse the existing registered private state and matching installed dependency runtime; no data/credential copy. Strict host identity, target mapping, dependency versions remain required; the automatic deployment locks have been removed in local source. Existing active legacy metrics/mount dependencies are retained, not modified or falsely claimed removed. Unsupported/missing prerequisites stop the update and return the blocker to local correction.

## Release and migration safety

Current version/image identity means no replacement/migration; a downgrade or unexpected running image fails closed. New images use immutable registry digest or checksum-checked streamed release archives and exact image/version/revision checks. Compressed host archives are discarded after successful loading; approved manifests, installed images, deployment history and required recovery remain outside Git. Only the selected service is replaced with no-deps/no-build. Private ports, data volumes and unselected services are preserved.

Migration history/checksums are compared before schema effects. No pending migration means skip backup/migration; unselected CodeShip is not migrated. Existing pending PostgreSQL/SQLite migration quiesces its writer, creates/checks scoped recovery, and requests off-host approval. The same released updater exports that snapshot over strict SSH to a restricted local ~/.codeship/recovery/<id> folder. The local operator verifies SHA256 and restores PostgreSQL into an isolated, network-disabled Docker container, or opens/checks SQLite using network-disabled Node Docker. Real data remains local/private and is not copied into existing development databases. Temporary recovery containers have no host ports, SSH keys or Docker socket and are removed after checking.

Only matching successful off-host proof permits migration. Missing approval, backup/restore failure or operator disconnect stops the operation; data/recovery and prior images remain, and no automatic database downgrade/restart is attempted. Recovery export records are temporary updater-managed metadata, not uploaded scripts. New live functionality is tested locally only. VPS admission is bounded readiness, release identity, installed storage/port checks and required Platform installation admission; it does not sign in test users or run browser/regression suites.

## Local verification for1.0.28

-21Linux Docker checks: latest stable CI/manifest selection, image drift/downgrade/no-op, clean Git/private links, POSIX quoting, migration ordering, backup failure and off-host IPC approval/rejection/disconnect.
- Actual PostgreSQL18.7 disposable writer/database: no-op preserves writer; checked backup before migration; separate isolated Docker restore approved; original rows/schema restored; dump/corruption failures prevent migration and restart. Receipt C:/Users/sunda/AppData/Local/Temp/codeship-updater-test-e6k1Yj/receipt.json.
- Actual SQLite backup opened with integrity/foreign-key checks in isolated Node26Docker. Receipt C:/Users/sunda/AppData/Local/Temp/codeship-sqlite-recovery-test-d3Rneg/receipt.json.
- CodeShip full suite initially105passed,1Windows fixture permission failure and1Docker-I/O timeout; corrected the Windows fixture and targeted Git/snapshot rerun passed3/3. Typecheck passed. UIUX19app+4tool and Codeitz109disposable-PostgreSQL tests passed for their prepared SA fixes.

No VPS app changes were made to obtain these test results. Publication/tagged CI and selected deployments remain subsequent recorded stages.


Deployment coordination (user, 20 November 2026): deployment locks are not the scheduling authority. Follow the user's explicit current instruction for which app, target and time; coding, testing, release publication and a previous deployment do not authorize another deployment. Before deploying, coordinate with the user and any running deployment owner. Identify shared Compose files, operator checkouts/state, networks, ports, databases/migrations and infrastructure; touch shared resources only when needed for the approved deployment and after coordination. Parallel independent work is allowed; do not claim conflicting shared deployments are safe. Preserve other operations and do not clear existing lock files or stop a running deployment. No automatic rollout. Existing installed releases retain their behavior until an explicitly authorized release/update.

## Selected Platform/Devkit entry additions prepared for1.0.29

From a clean published CodeShip tooling tag, select one product and target:

```sh
sh .container/apps/setup.sh platform --target hostinger --check
sh .container/apps/update.sh platform --target hostinger --tag v-1.0.13
sh .container/apps/update.sh platform --target local --tag v-1.0.13
sh .container/devkits/codeitz/update.sh --target hostinger
```

These are prepared source interfaces, not claimed deployed until1.0.29 tagged CI and rollout are recorded. Omit --tag to resolve latest stable successful GitHub release; an explicit tested tag still requires successful CI/manifest and never permits downgrade. Host setup requires registered operator state/dependencies/private configuration; it does not provision a blank VPS. Setup refuses an installed service without resetting it. Same release invokes bounded readiness verification and skips replacement, backups and migrations. Per-product root setup/update entries delegate into this shared logic. Group entries now require a product name; no default all-app rollout.

Platform update fails if installation ownership/settings are missing, rather than entering import/initialization. Every pending current master/tenant migration requires a scoped checked backup and, on Hostinger updates, offhost restore approval before any schema changes. All functional tests remain local. User/running-owner coordination is required before shared effects; no deployment lock files/flock introduced. Database integrity, operator lease and collector singleton protections are separate and retained.

## Reviewed Platform legacy identity boundary

The historical-preservation switch is a one-time reviewed adapter for immutable Platform1.0.16. From clean published tooling use: sh .container/apps/update.sh platform --target hostinger --tag v-1.0.16 --preserve-identity /private/path/native-legacy-import-proofs.json. The input is existing historical metadata only; never construct replacement proofs from present passwords. The updater requires all scoped backup/offhost restore approvals, an official restored-master identity digest, and unchanged archive SHA before applying the original retirement migration. Current tenant credentials/roles remain authoritative. Subsequent image-only updates use ordinary update.sh without this switch.

If an update fails before any schema/data change, explicit prior-service recovery is available only with the exact approved old tag and restore-checked scoped baseline. It is not a database rollback. No direct docker repair or VPS source testing is part of either action.
