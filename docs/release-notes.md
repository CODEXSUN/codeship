# CodeShip1.0.30 — checked prior-service recovery

Adds an explicit Platform recovery action through the released Hostinger updater. It may start only the exact stopped prior approved container after current and retained configuration, old migration history, scoped backup checksums, and schema/data/identity fingerprints match. It never restores a database, migrates, chooses a downgrade or changes the successful release pointer. A fresh proof recheck precedes the selected start; sibling identity and bounded readiness checks follow.

Usage from the clean published operator: sh .container/apps/update.sh platform --target hostinger --tag v-1.0.13 --recover-prior /private/path/verified-proof.json. This is an explicit recovery action for an interrupted update, not a general rollback. The proof must come from verified protected offhost archives, with exact archive schema SQL and restored data fingerprints; no credentials belong in it.

A new read-only preflight refuses populated master identity retirement before stopping the writer until the separately verified preservation adapter is available. Immutable Platform migrations and tenant credentials remain unchanged. No new deployment lock, public exposure, Cloudflare/local production deployment or VPS source fix. Verification and actual rollout outcomes are recorded in docs/work-record.md.
