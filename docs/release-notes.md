# CodeShip1.0.32 — checked Platform identity migration

Adds the explicit one-time --preserve-identity path for the tested immutable Platform1.0.16 retirement boundary. The local operator supplies existing historical import metadata; it cannot contain passwords or arbitrary columns. The Hostinger case accepts only the independently verified record hash. The updater stops the writer only after bounded validation, creates both scoped backups, independently restores both locally, and obtains the official legacy snapshot from the approved image. It rechecks the master archive hash before migration.

The released adapter inserts only missing historical proof metadata, refuses conflicts or changed identity mappings, and invokes the original authorization and immutable migration through the normal provider/history. It never overwrites tenant passwords, profiles, permissions or sessions. Both original account records and current tenant credentials remain protected by checked recovery. A failed gate retains recovery/state and stops dependent rollout; it does not bypass the migration or automatically downgrade.

Fresh setup also prepares the latest two-table master registration payload from the retained older input without mutating it. Tenant identities/permissions remain exact; sessions and business data are excluded. Existing installations still refuse setup/reset. Actual local setup/update, preservation and recovery outcomes are recorded in work-record.md. No application UI, migration source, dependency upgrade, deployment lock, Cloudflare or local production change.

## Approved baseline retained

# CodeShip 1.0.31 — app launcher and tab sessions

Adds the authenticated Platform launcher and independent tab sessions to CodeShip. Management sign-in retains administrator routes. Selected business updates verify fresh private host metrics against the exact container; selected devkit updates allow a bounded wait for the collector. Existing v1.0.30 deployment and recovery changes are retained.

# CodeShip1.0.30 — checked prior-service recovery

Adds an explicit Platform recovery action through the released Hostinger updater. It may start only the exact stopped prior approved container after current and retained configuration, old migration history, scoped backup checksums, and schema/data/identity fingerprints match. It never restores a database, migrates, chooses a downgrade or changes the successful release pointer. A fresh proof recheck precedes the selected start; sibling identity and bounded readiness checks follow.

Usage from the clean published operator: sh .container/apps/update.sh platform --target hostinger --tag v-1.0.13 --recover-prior /private/path/verified-proof.json. This is an explicit recovery action for an interrupted update, not a general rollback. The proof must come from verified protected offhost archives, with exact archive schema SQL and restored data fingerprints; no credentials belong in it.

A new read-only preflight refuses populated master identity retirement before stopping the writer until the separately verified preservation adapter is available. Immutable Platform migrations and tenant credentials remain unchanged. No new deployment lock, public exposure, Cloudflare/local production deployment or VPS source fix. Verification and actual rollout outcomes are recorded in docs/work-record.md.
