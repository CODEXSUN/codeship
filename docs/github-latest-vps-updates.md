# GitHub releases to VPS updates

## Operator workflow

Make corrections, migrations and all functional tests in local development or isolated local Docker. Publish each audited app through its GitHub helper and wait for successful tagged CI plus release-manifest.json. Do not test/debug/build/patch a VPS or upload agent helpers.

Use a clean local CodeShip tooling release checkout with the existing operator GitHub credential and strict SSH profile codexsun-hostinger. The current adapter supports only registered Hostinger srv914719; it does not provision new servers or resume Ubuntu LAN.

    sh .container/devkits/codeitz/update.sh --target hostinger --check
    sh .container/devkits/codeitz/update.sh --target hostinger
    sh .container/devkits/uiux/update.sh --target hostinger

The owning app's .container/update.sh delegates to the same selected entry when the released CodeShip checkout is its workspace sibling. Run one app at a time. --check resolves the latest approved GitHub release locally; installed-version comparison happens under the deployment lock when updating.

The local entry resolves the highest stable published tagged release, rejects a missing/failed tagged workflow or invalid manifest, and verifies the current clean tooling tag. Private UIUX access stays on the local operator: the server receives only an approved manifest and a temporary release-assets download URL, never the GitHub token. Ticket lifetime is30minutes. Source commands are clean GitHub fetch/checkout then tracked update.sh; no merges or forced resets, server npm installs/builds or frozen-source patches.

VPS source controller: /home/codebiz/devkit/codeship, checked out at the exact successful CodeShip tooling tag. Ignored .codeship/node_modules links reuse the existing registered private state and matching installed dependency runtime; no data/credential copy. Strict host identity, target mapping, dependency versions and canonical /tmp/cxapp-update.lock plus shared operation.lock remain required. Existing active legacy metrics/mount dependencies are retained, not modified or falsely claimed removed. Unsupported/missing prerequisites stop the update and return the blocker to local correction.

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
