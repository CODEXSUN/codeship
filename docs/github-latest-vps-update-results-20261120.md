# GitHub latest-release updater — 20 November 2026

CodeShip tooling1.0.28 was published at9f32ff8a560ce577de76c8f7df116c66325a3b03. Tagged CI succeeded: https://github.com/CODEXSUN/codeship/actions/runs/44675657780. Its clean checkout owns the deployment entry; CodeShip service remains1.0.27.

## Verified VPS deployments

| Product | Release | Commit | Tagged CI | Result |
| --- | --- | --- | --- | --- |
| Codeitz |1.0.16 |283f57591ade4ead7b6af10aaf58eb5f68a015f7 |44675287030 | Release, readiness and Platform admission passed |
| UIUX |0.1.15 |47494e613ec6aa59a224b5cdd3882b2dbc773bbb |44675308867 | Release, readiness and Platform admission passed |

Execution was sequential, using only the released selected update.sh and canonical lock. Both used immutable verified release images. No pending schema changes, so no new backup/migration; existing recovery and data retained. Platform1.0.13 and CodeShip1.0.27 were unselected. No local production deployment or Cloudflare change.

## Repeat from the clean CodeShip tooling tag

```sh
sh .container/devkits/codeitz/update.sh --target hostinger --check
sh .container/devkits/codeitz/update.sh --target hostinger
sh .container/devkits/uiux/update.sh --target hostinger
```

The local controller resolves GitHub releases/CI/manifests. VPS does clean fetch/checkout then the tracked updater, never source fixes/builds. The GitHub credential remains local. Private state and installed dependency links remain outside tracked Git. Failure returns to local correction/test/release.

## Verification limits and recovery

Local results:21Linux Docker updater tests; actual PostgreSQL18.7 backup/migration/independent restore/failure gate; SQLite read-only integrity/foreign-key recovery; Codeitz109tests; UIUX19app+4tool tests. CodeShip full suite initially105passed with two environment-sensitive failures; corrected fixture/targeted3test rerun passed. Frontend build, typecheck and version checks passed; tagged CI subsequently passed.

VPS verification was updater readiness/identity/storage/metrics and required Platform admission. No live functional/browser test was run. Original shared login routing and explicit tenant-to-SA switch fixes are present in the verified deployed app releases; cloud browser behavior is not separately claimed tested.

No new live migration means no new live backup/restore proof. Future pending migrations must quiesce writers and pass scoped checked backup plus off-host local-Docker restore approval. Existing recovery is retained, never automatically downgraded. Deployment stage logs and approved manifests are in /home/codebiz/.deployment/state/devkits. Historical cleanup recovery remains offhost, referenced by docs/vps-cleanup-20261120.md. Existing legacy operator dependency/metrics references are intentionally retained; cleanup of active dependencies is outside this update.
