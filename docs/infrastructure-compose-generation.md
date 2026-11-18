# Database-driven infrastructure generation

Implemented on 2026-11-17. Use `npm run infra:generate` in CodeShip. Dockerfiles are grouped by fixed service type under `.container/infrastructure/`; the generator reads local SQLite and decrypts installation settings privately. It produces independent Compose JSON, secret files, network policies and revision manifests in ignored local output. See [template documentation](../.container/infrastructure/README.md).

Verified: typecheck and seven Infrastructure tests pass. Compose configuration validates test definitions for all four services. Tests cover credential separation, custom ports, root bootstrap settings, PostgreSQL 18 data layout and local-only whitelist plans.

Actual local generation validated MariaDB. PostgreSQL needs an image; Redis needs a saved password; File Manager needs its administrator login. Those incomplete records are reported as blocked. No images were built or services started. No database migration or backup was needed because generation only reads inventory.

## Installation completed

The later user-authorized installation filled missing settings and deployed all four services successfully. The earlier blocked generation status above is historical. See [verified local deployment](local-infrastructure-deployment.md) for current ports, credentials handling, verification and retained native services.
