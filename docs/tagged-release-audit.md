# Tagged release audit — 2026-11-18

Scope: CodeShip, currently running Codeitz/UIUX, Platform's first isolated local Docker deployment, their shared framework/UI/SDK dependencies and central governance. The user explicitly included all current changes in these repositories after audit. Other business applications and infrastructure engine versions are outside this release set.

## Implemented controls

- Annotated version tags are pushed atomically with the reviewed staged branch through the GitHub helper. Release mode does not stage files, rebase or move tags. Default preview remains read-only.
- GitHub tag workflows validate product identity, pin sibling sources to commits and Node to a digest, run build/type/unit checks, and publish a GHCR image plus a release manifest. Per-consumer read-only deploy keys provide private source access. No host deployment key or application credential is supplied to CI.
- Private images also have a release-attached compressed image archive with SHA-256 and image ID. This permits authenticated GitHub asset delivery when the local registry has no packages credential. CodeShip checks archive content hash, loaded image ID and source/version labels; the registry digest remains recorded.
- Setup/update require explicit release sets from successful workflows. Working-folder image builds and the former resume path are removed from the supported deployment path. Unchanged images remain eligible for Compose reuse.
- Existing Devkit volume names and editable workspaces are preserved. Every release checks migration names/checksums, backs up only for pending migrations, and records actual stages. Native development databases are independent and are not migrated as a side effect of a Docker update.
- Platform's adapter copies master and registered tenant scopes once into separate infrastructure databases, compares counts/public IDs, validates tenant binding, and fails on unexplained existing targets. It disables development reset/seed/auto-login and the copied gateway. Later updates inspect every registered master/tenant history. Local publishing is loopback-only with exact Docker peer, Host and Origin checks.
- New-app generator version 23 includes `.container` contracts, workflow, helper and release notes. Dependency pins start explicitly unconfigured; a scaffold is not a live deployment. The discoverable release skill routes future daily work to the maintained governance standard.

## Checks before publication

- Framework: typecheck/build and 42 runtime tests passed; one existing Windows symlink privilege skip. Four release-tool tests passed.
- Shared UI: typecheck/build and 60 tests passed; four release-tool tests passed.
- SDK: syntax check and six service/tenant boundary tests passed; initial private source repository/tag published.
- CodeShip: typecheck/build and 43 tests passed, including release identity rejection and a real temporary Git remote test for atomic annotated tags and preservation of unreviewed files.
- UIUX: typecheck/build and 16 tests passed. Corrected the drift between its shared-host login example and the generated integration example.
- Platform: typecheck/build and 24 original unit/tool tests passed; added Docker transport behavior test passed. Five disposable PostgreSQL suites passed, covering fresh/migration integrity, tenant-local identity, runtime and gateway isolation. No application database was reset by these tests.
- Governance: all 29 generator/route/release-tool tests passed. Skill validator passed. Whitespace checks passed for all seven existing release repositories.
- Codeitz: typecheck/build and all 83 PostgreSQL-enabled tests passed, with no skips. Tests use isolated schemas and removed their fixtures; they did not reset application databases.

Tagged CI builds, image publication, local migrations and replacement verification are subsequent execution stages, not certified by this source audit. Exact release tags/digests and final runtime outcomes belong in the deployment stage records and work record.

## Limits

Local adapter verification does not certify public/VPS deployment. Backup archive listing verifies readability, not a restore rehearsal; production requires an off-host restore-tested backup. Multiple-container updates have staged partial failure handling, not cross-service atomic rollback. Infrastructure database engines are not upgraded by application releases. The collector is host-supervised, not installed as an OS startup service. Codeitz's copied schedulers remain paused and Codex authentication is not copied from the host.
