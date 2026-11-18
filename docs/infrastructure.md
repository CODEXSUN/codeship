# Infrastructure installation and maintenance

Codeship Infrastructure (`/infrastructure`) registers PostgreSQL, Redis, standalone File Manager and legacy MariaDB. It uses its own module-owned SQLite table, public IDs, revision checks and the existing encrypted vault. Saving inventory does not claim that a service is installed, healthy or connected to a VPS. Existing applications keep their own schemas and business data.

## Forms and credentials

Select a service to edit three tabs: Service, Credentials, and Maintenance & storage. Header Save persists configuration. Enter an explicit version/image, deployment name, environment, host/port, service username and optional database. Store service/root passwords, environment settings, SSH key and token in the credential tab. Blank credential fields preserve saved values; clearing is explicit. APIs return credential-presence flags only, not passwords, ciphertext, SSH keys or tokens. Service type is immutable after registration. Revision conflicts require a reload.

Prepare install .env and Prepare maintenance .env create files privately alongside the selected operator SQLite database, under `infrastructure/<public-id>/`. These actions do not execute Docker, provision a host, rotate an existing password, restore data or restart a service. Supply credentials first; empty credential preparations are refused. The UI returns an artifact reference only. Files are written atomically with mode 0600 on Linux; protect the containing account/ACL on Windows. Artifact versions record the saved registry revision used.

| Service | Environment contract |
| --- | --- |
| PostgreSQL | POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB |
| Redis | REDIS_USERNAME when supplied, REDIS_PASSWORD |
| MariaDB (legacy) | MARIADB_USER, MARIADB_PASSWORD, MARIADB_DATABASE, MARIADB_ROOT_PASSWORD |
| File Manager / File Browser | MEDIA_ADMIN_USER, MEDIA_ADMIN_PASSWORD, MEDIA_APP_VOLUMES |

MariaDB installation requires its root password as well as the selected app credentials. Keep old-service MariaDB data separate from PostgreSQL; no database conversion, automatic upgrade, shared root account or silent password reset is implemented. Redis install adapters must apply the saved ACL/password explicitly; an environment file alone does not configure Redis authentication. SSH/API secrets remain encrypted inventory and are not injected into an unrelated database process.

## Codexsun reference and initial records

The File Manager recipe was inspected read-only from `D:/workspace/codexsun/.container/media/docker-compose.yml` and its deployment environment sample. It uses `filebrowser/filebrowser:v2.63.5`, a standalone service with `/srv` storage and a separate File Browser database. Redis `7.4-alpine` and legacy MariaDB `11.8` are source-reference versions, not a claim that they are deployed here. PostgreSQL has no selected image until an operator chooses it.

`node scripts/seed-infrastructure.ts` explicitly registers the four requested inventory records and preserves existing records. It runs as a recorded Codeship deployment stage after migrations. The optional `--stdin` mode accepts a private environment mapping for first-registration credential import and filters obvious sample placeholders; input is never printed. It does not overwrite existing records or credentials. The user chose to enter the File Manager login in Infrastructure; none was generated or imported from an unrelated app account.

## Shared standalone File Manager

The File Manager runs independently from every business app. In Maintenance & storage, enter one binding per line:

```text
devkit/codeitz=codeitz-docker-local_workspace
apps/crm=actual_crm_files_volume
```

These are explicit existing Docker named volumes, not host paths. File Browser sees them at `/srv/devkit/codeitz`, `/srv/apps/crm`, etc. Each app retains its existing volume; adding a binding never moves, copies or renames its data. Other apps can use the same pattern when their own storage volume exists. Duplicate owners/volumes, traversal and database/key/internal-state volume bindings are rejected. Database files and vault keys are not application file-storage mounts.

Only Codeitz currently has a verified existing Docker file-storage volume in this workspace. Its workspace binding is prefilled. Other app registries are native-development inventory and do not yet provide Docker file volumes; they have not been falsely marked connected or automatically redeployed. Add their real file-storage volume names when each app owns one. Do not create placeholder volumes and claim the app is using them.

Save the File Manager administrator username and a password of at least 12 characters, pinned image, port (initially 7090), and bindings. Prepare install .env also writes `install.compose.json`. The recipe publishes loopback only, disables the command runner, mounts declared file volumes, retains a separate `files-local_database` volume and hashes the bootstrap password with bcrypt before placing it in Compose. No plaintext password is placed in command arguments or Docker configuration. File Browser only applies bootstrap credentials to a new database; editing the registry does not rotate a running account.

On the host Codeship operator:

```sh
node scripts/file-manager.mjs setup <infrastructure-public-id>
node scripts/file-manager.mjs verify <infrastructure-public-id>
```

Setup retrieves the prepared recipe from the local Codeship container, checks all external volumes, refuses retained installations, keeps an exclusive lock and appends stage records under ignored `.codeship/infrastructure/<id>/`. It does not mount a host Docker socket in the UI. Verification checks the loopback HTTP service. Login verification and actual installation remain pending until the operator supplies credentials. No unrestricted shell, browser Docker endpoint or automatic credential rotation is enabled.

For later File Browser version/data upgrades, review the pinned release, stop writes, take a File Browser database backup using its documented format, retain existing app volumes and verify authentication/file access before declaring success. This task provides guarded setup and verification; an unattended maintenance updater or database rollback is not implemented. PostgreSQL, Redis and MariaDB live install/update adapters likewise require explicitly reviewed service-specific recipes; this task does not start those services merely because they appear in inventory.

## Backup and stage evidence

The new Infrastructure table is a real pending Codeship SQLite migration. The normal update flow backs up and integrity-checks SQLite, exports a host backup/checksum, applies the migration, explicitly registers inventory and verifies the Infrastructure page/API. Image-only later updates retain the existing migration-only backup rule. Data, encrypted credentials and vault key volumes are preserved.

Upstream File Browser startup flags, `FB_` environment settings and hashed bootstrap password contract were checked against its [v2.63.5 source](https://github.com/filebrowser/filebrowser/blob/v2.63.5/cmd/root.go). Source reference reuse does not imply a connected Codexsun VPS or permission to modify that repository.

## Standard module layout

Infrastructure and Registry lists use the shared Master List directly, without a duplicate page heading or introductory description. Their New action is in the persistent app header and stays available while the list loads or errors. New/Edit routes use app-header breadcrumbs, Cancel then Save. Infrastructure Edit exposes its two implemented preparation actions in the header Actions menu before Cancel/Save. Those record actions are scoped to the current route and are cleared when navigating to another module. List-to-edit routing remains the existing supported operation; this layout adjustment does not add a Show workflow or change credential/deployment APIs.

## Service-specific editor

Existing service type is fixed. Display name is derived from that type. Connection consolidates host, port, username and masked password in one table. PostgreSQL and MariaDB additionally show an optional database (a server connection need not select an application database). Redis shows an optional ACL username and no SQL database. File Manager shows administrator login and application file-volume bindings, with no SQL database field.

Deployment & maintenance holds image/version, deployment name, environment and notes. MariaDB also exposes a separate root bootstrap password there for a new installation with a non-root application account. Generic environment, token and SSH replacement fields are omitted from this editor. Existing encrypted data and hidden metadata remain saved; this UI simplification does not delete them or migrate SQLite.

Blank password replacement preserves the saved value. Save remains in the app header. MariaDB preparation can reuse the connection password when username is root; a non-root installation still needs its distinct root bootstrap credential. This helper change was tested but requires API restart: automatic approval review blocked the attempted native restart. The frontend itself was verified live on 4320.

## Docker port and database binding policy

Host port is the published connection port. Docker port is the listener inside the container. Both are shown separately, including a Docker port list column. Migration 20261117000600 adds docker_port, binding_mode and allowed_ips; existing rows default to local binding and conventional internal ports (5432/3306/6379/8080).

Only PostgreSQL and MariaDB offer Allow connections from other computers and Restrict to IP whitelist. Public requests IPv4 all-interface binding; whitelist requires explicit IP addresses or CIDR ranges. Empty, malformed and unrestricted /0 ranges are rejected. Redis/File Manager external policies are rejected server-side. Saving an inventory policy does not alter Docker or firewall rules.

Prepare generates a private `<purpose>.network.json` alongside the environment artifact. It records host/container ports, requested mode and allowed sources. Local uses 127.0.0.1; public requests 0.0.0.0. Whitelist stays on 127.0.0.1 with requiresFirewall=true until a verified installer applies Docker-aware source restrictions. PostgreSQL/MariaDB installation/firewall adapters are not implemented yet, so these settings are saved deployment intent, not active public access. Do not apply an unrestricted public mapping for a whitelist policy. Docker Desktop and Linux Docker use different firewall enforcement paths: https://docs.docker.com/engine/network/port-publishing/ and https://docs.docker.com/desktop/features/networking/.

File Manager remains loopback-only; its generated definition sets the internal FB_PORT to the configured Docker port and maps the host port accordingly.
