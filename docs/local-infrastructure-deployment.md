# Local Docker infrastructure deployment

Verified 2026-11-17. Native SQLite remains the installation inventory and encrypted credential owner.

| Service | Project | Host port | Container port | Binding | Verification |
| --- | --- | ---: | ---: | --- | --- |
| PostgreSQL | postgres-local | 5433 | 5432 | Public IPv4 | Healthy; authenticated SQL query |
| MariaDB legacy | mariadb-legacy-local | 3307 | 3307 | Public IPv4 | Healthy; authenticated SQL query |
| Redis | redis-local | 6379 | 6379 | Loopback | Authenticated PING; unauthenticated PING rejected |
| File Manager | files-local | 7090 | 8080 | Loopback | Healthy; saved admin login; Codeitz volume accessible |

PostgreSQL image is postgres:17.12-alpine. Other registered images were retained: mariadb:11.8, redis:7.4-alpine and filebrowser/filebrowser:v2.63.5. Verified immutable image IDs, record revisions, Compose paths and named data mounts are stored in private `.codeship/infrastructure-runtime/release.json` and per-record JSON files. Stage history is `.codeship/infrastructure-runtime/stages.jsonl`.

Native PostgreSQL at 5432 and native MariaDB at 3306 were left running. These Docker instances contain fresh databases; existing native data and app connection files were not migrated or redirected. Public SQL bindings reflect the operator's saved choice. No whitelist firewall rules were created. Redis and File Manager remain loopback-only.

Missing Redis and File Manager passwords were generated cryptographically and encrypted into SQLite; they were never printed. Redis uses the default ACL user; File Manager uses admin. Existing SQL credentials were preserved. The File Manager Codeitz workspace volume did not exist and was created empty under its declared name. This does not import existing source files or claim other apps' volumes are connected.

Initial File Manager setup exposed two issues, fixed before verification: access to image-owned configuration required DAC_OVERRIDE with other capabilities dropped; Compose dollar escaping had altered the bootstrap bcrypt hash. A named configuration volume and explicit internal-port healthcheck were added. Only the new bootstrap account was repaired using the saved credential, retaining its database and file volumes. A regression test validates bcrypt escaping.

The successful generation manifest is `.codeship/infrastructure-generated/2026-11-17T14-38-10-232Z-de9c5e/manifest.json`. Generated files and credentials remain private/ignored. The initial installer command is `npm run infra:deploy -- <generated-manifest.json>`. It locks deployment, checks current revisions, ports and retained data ownership, records stages, builds versioned images and verifies authentication/bindings. Changed retained revisions require an explicit update review; it does not silently rotate accounts or migrate existing databases.

No schema migrations were pending, so migration backups were skipped. Final typecheck and all 29 tests passed. SQLite integrity check returned ok and CodeShip readiness returned HTTP 200.

## Docker Desktop group

At the user's direction, all four containers now share Compose project `codebiz-infra`: filemanager, mariadb, postgres and redis. Docker Compose lists one group with four running services. Ports, immutable images, credentials and every existing volume mount (including File Manager's inherited root volume) were preserved. Old replaced containers were removed without removing volumes. This changed container grouping only; no database migration or backup was needed.

Current Compose file: `.codeship/infrastructure-runtime/codebiz-infra/compose.json`. `group.json` records the shared project and its service identities; per-record release files now carry dockerProject and service separately from the original logical deployment name. The old independent installer rejects grouped records to prevent duplicate deployments. `infra:group` prepares this layout and `--apply` performs the explicit regroup; it refuses an already existing target group. Post-regroup SQL queries, File Manager login and Redis authenticated PING pass.
