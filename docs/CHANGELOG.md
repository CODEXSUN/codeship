# codeship Changelog

## Version State

Current version: 1.0.1

Release tag: v-1.0.1

Changelog label: v 1.0.1

The release-tag field is a naming convention; publishing does not create a Git tag.

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
