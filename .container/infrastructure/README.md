# Infrastructure Docker templates

Run `npm run infra:generate` from the CodeShip repository. This reads native SQLite and its separate vault key, then generates per-service Compose JSON, private secret files, network policies and a revision manifest under ignored `.codeship/infrastructure-generated/<run>/<record-id>/`.

Each fixed service type has a Dockerfile here. Its BASE_IMAGE argument is a validated versioned image from SQLite. Credentials never enter the build context or image. Compose JSON is supported by Docker Compose. Generation validates each complete record using Compose's config check; incomplete records are reported individually. Regenerate after saving settings to use new values. Existing runs are preserved.

PostgreSQL and MariaDB use mounted password files and official `_FILE` settings. Redis uses a SHA-256 ACL password rule; a named user disables the default user. Initial Redis permissions cover all commands, keys and channels. File Manager uses a bootstrap password hash. Private output contains credentials or hashes and must not be shared or committed.

PostgreSQL requires a versioned image, username and password. Redis needs its saved password; its username defaults to `default`. File Manager needs an administrator username, password of at least 12 characters, pinned image and explicit app file volumes. MariaDB root initialization uses the root connection password or a separate saved root credential. A non-root installation also requires a database for initial grants.

Host and container ports are independent. Local uses loopback; SQL public mode requests all-interface IPv4 binding. Whitelist mode stays on loopback and records that firewall enforcement is pending. No source-IP enforcement exists yet. Redis and File Manager stay local. Data volumes use deployment names; File Manager references declared external app volumes. PostgreSQL 18+ uses its version-appropriate parent data mount.

Generation does not start services, pull/build images, modify firewalls, migrate databases or rotate existing users. Before installation, verify host ports, retained volumes, exact image compatibility and current snapshot revisions. Major database upgrades require their own migration and backup procedure. Changing a bootstrap password does not change accounts in an existing data volume.

References: [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/), [port publishing](https://docs.docker.com/engine/network/port-publishing/), [PostgreSQL image](https://hub.docker.com/_/postgres), [MariaDB image settings](https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/mariadb-server-docker-official-image-environment-variables).

## Local installation

After generation and review, `npm run infra:deploy -- <generated-manifest.json>` installs the manifest's records using their registered project names. It checks record revisions, binding policies, occupied host ports, retained containers/volumes and deployment coordination. Incomplete or whitelist-pending manifests stop before installation. New declared application file volumes are created empty when absent; no host files are imported. Existing retained service data is reused only with a matching CodeShip operation record/revision; changed revisions require explicit update review.

Each service records preflight, build, install and verification stages in `.codeship/infrastructure-runtime/stages.jsonl`. Verified release records contain immutable image IDs and Compose paths. Passwords stay outside build layers and logs. Failures retain data. This initial-install command does not perform schema migrations, reset existing SQL accounts, or implement upgrades; backup is skipped when no migration is involved.

Verification checks SQL queries, Redis authenticated PING, File Manager login and actual Docker port bindings. File Manager uses named configuration/database volumes and the single DAC_OVERRIDE capability to access the declared file volumes and image-owned configuration; other capabilities stay dropped and its command runner stays disabled. Compose dollar escaping is verified against the generated bcrypt hash.


Deployment coordination (user, 20 November 2026): deployment locks are not the scheduling authority. Follow the user's explicit current instruction for which app, target and time; coding, testing, release publication and a previous deployment do not authorize another deployment. Before deploying, coordinate with the user and any running deployment owner. Identify shared Compose files, operator checkouts/state, networks, ports, databases/migrations and infrastructure; touch shared resources only when needed for the approved deployment and after coordination. Parallel independent work is allowed; do not claim conflicting shared deployments are safe. Preserve other operations and do not clear existing lock files or stop a running deployment. No automatic rollout. Existing installed releases retain their behavior until an explicitly authorized release/update.
