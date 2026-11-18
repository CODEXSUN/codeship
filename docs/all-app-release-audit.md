# Coordinated app release audit — 2026-11-18

The user authorized auditing and including current application work, publishing
new GitHub tags through the helper, standardizing `.container` contracts and
verifying local Docker deployment. This extends the earlier four-product release
scope to all nine business apps and three implemented devkits. A source check,
pushed tag, successful image build and verified installation are distinct stages.

## Source and contract checks

- All twelve product contracts validate. Every external file dependency must be
  pinned, including Billing's public Core App client. Build contexts exclude
  environment files, runtime databases and private keys. The source scan found no
  private runtime paths or known credential signatures in publishable files;
  this is not a full security certification.
- Automation, Billing, Core App, CRM, HRMS, Platform, Texlinks, Zetro and the
  implemented devkits passed source type/build/app-tool checks. Codeitz's
  workspace governance check initially found missing UIUX structure; UIUX now
  has a real app contract/presentation module and that audit passes.
- Billing's additional database suite passed 17 tests; Core App's passed 45;
  Zetro's disposable PostgreSQL suite passed nine. Platform's five original
  PostgreSQL suites passed and its extended gateway suite also verifies container
  admission, repeatability, version rejection and preserved user grants.
- CodeShip passed 56 tests, including migration policies, immutable releases,
  literal environment values, target allocation and a real PostgreSQL exported
  snapshot that remains stable while another connection writes.
- Shared UI 0.1.9 passed 60 UI and four tool tests. SDK 0.1.4 passed 11 boundary
  tests. Consumer pins identify exact published commits; later unfinished shared
  UI work is published only after its owning checks pass.

## Failures and corrections

- Automation's first isolated Docker build exposed a missing governance copy;
  corrected in 1.0.4. Billing's first isolated CI build exposed an undeclared Core
  client dependency; corrected in 1.0.5 with an exact source pin and read-only CI
  key. Failed tags are retained and never treated as deployable releases.
- CRM/HRMS local histories were independent of their GitHub starter histories.
  Both histories were merged and published with the helper. Recovery stashes are
  retained; no force push or tag replacement occurred.
- Ecommerce received ongoing checkout/payment/invoice changes during this audit.
  Its initial hold was resolved after the current schema fixtures were completed:
  all 45 source tests passed without skips, and 1.0.7 was tagged with the published
  UI/SDK dependencies. Actual payment-provider sandbox execution remains deferred.
- UIUX 0.1.7's isolated build rejected a newly added gallery example's older UI
  pin. UIUX 0.1.8 pins published UI 0.1.9 and passed tagged CI; the failed tag is
  retained. Production service preflight also caught unpinned native database-free
  manifests; CodeShip 1.0.9 now applies its explicit reviewed Codexsun profile.
- Core App's first copy passed, but registration correctly rejected its copied
  native token against Platform's unique credential constraint. CodeShip 1.0.10
  generates an independent production credential and preserves saved independent
  credentials. The verified import is retained for recovery; no reset is required.

## Deployment contract

The [application adapter](../.container/apps/README.md) records port allocation,
prerequisite order, network namespace, data copy, backup and admission details.
Native databases remain independent. Per-database snapshots bind copied counts
and public identities to the exact dump view; this is not a distributed snapshot
across separate databases. Existing targets without an import record stop setup.
Ecommerce uploads are content-address verified and retained in their own volume.

No pending migration means no database backup or migration. Pending migration
stops the affected writer and retains a checked recovery dump before applying the
owning migrator. Archive listing is not a full restore rehearsal. Native data,
unchanged images, previous configuration and recovery files are retained.

Production service preparation disables the gateway. Platform admits only the
verified image/version/schema and protected workspace, checking prerequisites and
preserving disabled tenant access. Installation creates no users or permission
grants. Local Docker verification does not certify public/VPS deployment.

Actual tags, image identities, partial failures and installation outcomes are
recorded in `.codeship/*/stages.jsonl` and the work record. This source audit alone
does not claim that every container has been installed.
