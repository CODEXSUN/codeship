# codeship Changelog

## Version State

Current version: 1.0.3

Release tag: v-1.0.3

Changelog label: v 1.0.3

The release-tag field is a naming convention; publishing does not create a Git tag.

## v-1.0.3

### [v 1.0.3] 2026-11-18 - Tagged image releases and managed Docker operations

#### Database Changes

- Database update: Yes (manual).

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.3.
- SQLite registry and encrypted install credentials; typed infrastructure forms, direct Docker deployment, container metrics/cards and Devkit grouping. Added GitHub-tag workflows, immutable release sets, safe helper publishing and Platform local deployment adapter. Typecheck/build and all 43 tests passed. Product runtime publication/deployment remains a separately recorded stage.

## v-1.0.2

### [v 1.0.2] 2026-11-17 - Add portable SQLite registry and governed Docker deployment

#### Database Changes

- Database update: Yes (manual). Add a separate SQLite history for the explicit Codeship storage conversion and encrypted application registry. Published PostgreSQL migrations remain unchanged.

#### App Codebase Changes

- Bumped @workspace/codeship version to 1.0.2.
- Add named local Docker setup/update/verify, candidate migration inspection, conditional verified SQLite backup, immutable image identity and per-stage logs.
- Add application inventory and shared create/edit forms with authenticated encrypted, write-only installation settings.
- Preserve existing PostgreSQL records by explicit read-only import; retain the original source.
- Define Codeship-only local Docker/VPS deployment ownership and the product-specific SQLite exception in central governance.

## v-1.0.1

### [v 1.0.1] 2026-11-17 - Publish Codeship local deployment and monitoring workspace

#### Database Changes

- Database update: No (manual). No schema changes from the audited 0.1.0 implementation.
- Includes the existing module-owned PostgreSQL migrations and explicit deployment-profile seeder.

#### App Codebase Changes

- Publish the local Docker operations workspace with approved deployment execution, saved history, metrics and incidents.
- Set package, lockfile and changelog version to the explicitly requested 1.0.1.
- Connect CODEXSUN/codeship while preserving its initial history and license.
- Verify typecheck, production build, all 13 tests and version consistency; retain documented build warnings and local-only limitations.

## v-0.1.0

### [v 0.1.0] 2026-11-17 - Add local deployment and monitoring workspace

#### Database Changes

- Database update: Yes (manual).
- Add module-owned PostgreSQL migrations for deployment targets, runs, observations and incidents. Explicit profile seeder; no invented runs or measurements.

#### App Codebase Changes

- Create the governed app structure, shared UI/framework references, environment examples, and work records.
- Include app-local GitHub review, version checks, patch bump/preview, and optional SSH-key tools.
- Add approved Docker operations, persisted output/results, target locking, retry protection, health and resource monitoring, incident recovery and shared appearance settings.
- Verify builds, database migrations/seeders, security and operation tests, restart persistence, UI and real Codeitz preflight/update/verification. No publication or cloud connection.

## Ongoing 1.0.2 infrastructure work

- Add module-owned Infrastructure registry migration, encrypted credentials and shared forms for PostgreSQL, Redis, File Browser and legacy MariaDB.
- Add private install/maintenance .env preparation, standalone File Browser named-volume recipe and guarded host setup/verify.
- Verify the real migration with a checked SQLite backup and retain all app records; 22 tests pass. Service installation awaits configured credentials.

- Remove Codeship Nginx; publish loopback port 4450 directly to app:4350 with explicit Docker peer and same-origin protection. Verified the single-container deployment and all 24 tests.

- Align Infrastructure and Registry with standard app-header New, Cancel/Save and scoped Actions; remove duplicate canvas headings/descriptions. Typecheck, Docker build and browser navigation checks passed.
