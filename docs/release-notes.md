# CodeShip1.0.28 deployment tooling

Clean GitHub/latest tagged release update entry for the existing registered Hostinger target. Run selected update.sh from the clean local tooling tag; it verifies GitHub CI/manifests, uses strict SSH and canonical locking, pulls the published tooling tag on VPS, and runs only released update code. GitHub credentials remain local. Existing private state and installed runtime dependencies stay outside clean source. No server builds, uploaded helper files or source patches.

No-op and downgrade/image drift guards; image-only updates skip backup/migration. Pending existing-database migrations stop writers, validate a scoped backup, export through the released updater and require an actual off-host restore check in isolated local Docker before migration. No automatic database downgrade. PostgreSQL/SQLite local recovery, IPC failure controls and Linux Git/shell checks passed.

This publishes tooling only; existing CodeShip service is not selected for deployment. Existing Windows app deployments and Cloudflare remain unchanged. See docs/github-latest-vps-updates.md.
