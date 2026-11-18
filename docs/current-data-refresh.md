# Current configuration snapshots

The user-authorized refresh reads current manifests and native `.env` files from `devkit/codeitz`, `apps/platform` and `devkit/codeship`, plus approved existing Docker profiles and the corresponding running app configuration. It updates the live Codeship Docker SQLite database used by port 4450. Native development SQLite is a different environment and is not silently synchronized.

```sh
node scripts/refresh-current-data.mjs --dry-run
node scripts/refresh-current-data.mjs --apply
# Refresh only the two existing Docker entries after a deployment:
node scripts/refresh-current-data.mjs --apply --docker-only
```

Dry-run is the default. Output contains counts/source references only, never values or credentials. Apply transfers the payload over the local container's stdin, uses one SQLite transaction, validates current record revisions and verifies every imported source variable after encrypting/decrypting it. Concurrent record edits abort rather than being silently overwritten. Missing source values retain saved credentials/metadata. Existing custom environment keys are preserved; values explicitly present in the current source take precedence. Re-running is a deliberate source refresh, not a background sync, so normally edit the registry and use Save after this initial import.

For native entries, name/version/host/port/database-account metadata and installation account fields come from the current owner configuration. Platform defines SA/admin/user installation settings with SUPER_ADMIN, TENANT_ADMIN and TENANT_USER prefixes. Codeitz and Codeship do not define these identities, and the refresh does not copy Platform credentials across application boundaries. Stored environment passwords are installation source settings, not recovered current login passwords; no actual user/password reset, seeding, privilege grant or deployment of another app is performed.

For Docker entries, records remain separate from native development. The existing Codeitz target is registered in application inventory if absent; CodeShip Local is refreshed in place. Actual target host port, runtime image version and database-account settings are read from the approved profile/running app. Complete original source variables are retained in the encrypted `sourceEnv` vault snapshot. The managed runtime `.env` is merged separately with protected transport/Compose/Node controls excluded. This preserves the original source without allowing imported values to change Codeship's binding, peer policy, vault path or execution authority.

The current PostgreSQL infrastructure connection is refreshed from Platform's native master URL. A local read-only connection is used to inspect the PostgreSQL server version when available. Its notes identify this as a native connection snapshot, not a running shared Docker PostgreSQL installation. No source `.env` or source database is written.

The completed import covers **five records and 89 source variables**: Codeitz development (12), Platform development (33), Codeship development (12), Codeitz Docker (19) and Codeship Docker (13). Application inventory now contains 11 records. Platform's three installation users and available PostgreSQL connection credentials were filled. Redis, File Manager and MariaDB credentials were not present in these three owners' configuration; existing entries were preserved rather than populated with invented credentials. CodeShip SQLite has no database login username/password to invent.

Registry → Edit → Environment now shows imported and managed variables as individual key/value fields. Secret values remain masked until the operator explicitly selects Show for one row; untouched rows retain their values on Save. See [Environment editor](environment-editor.md) for the user-authorized local reveal exception, encrypted persistence and revision checks. Other credential fields remain write-only. The complete source snapshot stays encrypted; source refresh is still an explicit action rather than an automatic overwrite of later registry edits.

## Native SQLite refresh (4320 / 4325)

`node scripts/refresh-native-data.ts --dry-run` previews the native registry refresh; `--apply` explicitly updates native SQLite in one transaction. It reads the nine apps in the central port registry and their current manifests and `.env` files. Imported source values are encrypted, merged with existing custom keys, and verified after decryption. Keys changed relative to the previous source snapshot are preserved. Saved credentials and account metadata take precedence over missing source values. Concurrent SQLite writes are serialized by the transaction. No schema migration, deployment, account reset or source-file changes occur.

2026-11-17 applied result: nine application records, 109 environment variables, current manifest versions and native API ports, Platform SA/admin/user account metadata and available installation passwords. Infrastructure now contains Platform PostgreSQL connection settings, Codexsun Redis URL settings, and Codexsun legacy MariaDB connection settings/password. Existing nonblank Infrastructure metadata is retained. These are installation inventory snapshots, not proof that a service is installed or that an existing live identity uses the source password. Redis and File Manager login credentials were absent; no credentials were invented or copied across unrelated applications. Service versions without a verified source remain unset.

Verified native SQLite integrity (`ok`), encrypted environment roundtrip, nine registry/four infrastructure records through the 4320 API proxy, and ready HTTP 200. No schema changes were needed, so no additional migration backup was made. Refresh the browser before auditing to load new revisions; later edits use the app-header Save.
