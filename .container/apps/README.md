# Managed application releases

Each app-owning chat executes and verifies its own authorized selected operation.
Do not hand deployment execution to CodeShip chat; these are shared CodeShip tools. Product `.container/setup.sh`, `update.sh`
and `verify.sh` delegate here. Publish and prepare an explicit tagged release set
before installation; a dirty workspace build is never a release image.

Install Platform first, then Core App before Billing. Other registered targets can
be installed independently after Platform. Each operation holds the shared
operator lock and writes its own stage log under `.codeship/apps/<name>/`.

| Service | Browser address | Data database |
| --- | --- | --- |
| Platform | 127.0.0.1:4453 | platform_master and registered platform_* tenants |
| Core App | 127.0.0.1:4454 | app_core_app |
| Billing | 127.0.0.1:4455 | app_billing |
| CRM | 127.0.0.1:14355 | app_crm_source (existing MariaDB compatibility store) |
| Ecommerce | 127.0.0.1:4457 | app_ecommerce; ecommerce_data uploads volume |
| HRMS | 127.0.0.1:4458 | none |
| Automation | 127.0.0.1:4459 | app_automation |
| Zetro | 127.0.0.1:4460 | app_zetro |
| Texlinks | 127.0.0.1:4461 | none |

Each application owns its container, filesystem, process/network namespace and
published loopback port. No app uses `network_mode: service:platform` or stores its
port binding on Platform. The external `applications_backend` bridge supplies
separate reserved addresses and Docker DNS names. PostgreSQL attaches as shared
infrastructure with separate app databases and roles; its update entry restores
that attachment after container replacement.

Private connection bridges inside each container preserve the SDK/gateway's
loopback addresses and exact Host/Origin/grant/body bytes while connecting to
other containers by Docker DNS. They make no authentication decision. Platform
can be replaced independently without recreating app containers. Existing app
images, data and credentials remain unchanged when only topology changes. This
local transport is not the separately required VPS/private execution adapter.

First installation copies the explicitly registered native database to an isolated
database owned by a separate non-superuser, non-BYPASSRLS role. Recovery settings
are encrypted in SQLite before provisioning. Checked dump archives, all public
table counts and public identities establish the copy record. An existing target
without that record stops installation. Native sources are not reset or repointed.
Ecommerce uploads are content-address checked and copied into its retained volume.

Every release plans migrations from the candidate image. No pending migrations
means no database backup/migration. Pending migrations stop the existing writer,
retain a checked database dump outside the container, then run the owning migrator.
Archive listing is a readability check, not a restore rehearsal. Retain prior
configuration/image records; failed migrated releases need inspected recovery,
not automatic database downgrade or deletion.

Native credentials are not reused for that production registration: CodeShip
generates an independent token, persists it encrypted before effects, and retains
an independently configured saved token across retries/updates.

Platform first registers the production service with its gateway disabled. After
image identity, readiness, schema, missing-grant rejection, browser-origin checks
and fresh metrics pass, Platform checks prerequisites and enables that tenant's
installed release. Existing disabled tenant access is not silently enabled. No
users or permission grants are created by deployment; copied grants remain authoritative.

Each target is explicit:

```sh
sh .container/apps/setup.sh platform --release-set /absolute/approved-set.json
sh .container/apps/setup.sh core-app --release-set /absolute/approved-set.json
sh .container/apps/setup.sh billing --release-set /absolute/approved-set.json
sh .container/apps/update.sh billing --release-set /absolute/approved-set.json
sh .container/apps/verify.sh billing
```

Do not run a later dependent stage after a failed prerequisite. Keep the partial
state and stage log for recovery. Infrastructure engine updates are separate.

Platform now publishes only loopback 14385:4385. Its update probes a changed port before effects, preserves every unselected service definition/volume/network, replaces only Platform with --no-deps, and verifies sibling container identities. Installed CodeShip metrics binding is resolved from Compose so a separate CodeShip port migration is supported. Platform >=1.0.7 follows the confirmed optional password-change policy; legacy images retain their strict startup flag.
