# Monitoring and production direction

Codeship exclusively owns local Docker and live VPS deployments. See [Docker lifecycle](docker-lifecycle.md) for the implemented version 1.0.2 SQLite registry, encrypted installation credentials, stage logs and conditional backup procedure. The Docker container operates in registry/history mode without host execution authority; the host Codeship operator performs deployments. Native and Docker SQLite files are independent environments.

## Working locally (host operator)

- Poll registered targets every 60 seconds while Codeship is running; manual Check health is also available.
- Observe `/api/health` status and round-trip latency, Compose container readiness, aggregate Docker CPU percentage and memory bytes. Missing measurements are unavailable, never invented zeroes. CPU is Docker's aggregate process percentage and can exceed 100% on multiple cores.
- Save observations, health incidents, target identities and deployment runs in Codeship SQLite. Repeat failures keep one open incident; successful health resolves it. Planned deploy/update maintenance skips observation for that target until the next cycle, avoiding expected-restart incidents.
- Browser polling shows saved output during runs. It does not invent phase percentages or claim streamed request traces.
- One SQLite expiring singleton lease owns scheduling/recovery. No shell endpoint, public binding, arbitrary host probe, Docker socket in the browser, Git commit/push or automatic deployment.
- All operations use the local single-operator scope. No tenant identities or production login are fabricated. The operator owns only Codeship's SQLite file and separately stored vault key.

History views show the latest 100 runs/incidents and 120 samples per target. All older records remain stored; automatic retention/deletion is not enabled. Master List's search/sort/column filters/pagination operate locally on this supplied window; their state is not URL-controlled. App navigation and selected run/target paths survive refresh and Back/Forward. A shared URL-state list contract is a future shared-UI task, not an app-local replacement.

## What “Nightwatch-like” means here

This first version is deployment and infrastructure health monitoring. Application request tracing, exception grouping, slow database queries, queue wait times, scheduled-job instrumentation and distributed trace correlation are not yet implemented. Do not confuse health-probe latency with application response percentiles, or Docker stats with request metrics.

Next, add a reusable opt-in telemetry capability under `foundation/`, with sanitized route-level latency/error/queue metrics. Codeship should consume its public observation contract rather than read another app's business tables. Define retention, sampling, consent and capacity before high-volume collection. Then add resource thresholds, acknowledgements, delivery channels and release comparisons as separate approved steps.

## Cloud preparation

Keep native local environments for development. Use separate cloud deployment profiles, databases, secrets, volumes and release records for production. The current adapter is local Docker only; no VPS credentials or SSH execution were added.

Before connecting a VPS: choose an authenticated remote runtime/SSH adapter with verified host identity, scoped operator permissions, server-side secret storage, TLS, production backup/restore and deployment approvals. Keep each target database private and independently backed up. Codeship itself uses SQLite with a separate encryption key. Choose a production host and deployment topology explicitly; never expose the current loopback operator service publicly or mount an unrestricted Docker socket in a public container.

Codeship can later dispatch the same versioned app deployment contract through that remote adapter. This is a prepared boundary and documented requirement, not an implemented cloud connection or automatic cluster orchestrator.
