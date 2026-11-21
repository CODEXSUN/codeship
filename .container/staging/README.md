# Private Ubuntu staging

This is a separate synthetic-data target, not a production fallback. Host identity, SSH host key, operator account, root, networks and loopback bindings are checked. Existing databases are never reset or imported. A failed first setup retains ownership and requires inspection; it must not be repeated blindly.

On Windows, prepare the host once with `node .container/staging/initialize.mjs`, then prepare approved tooling with `node .container/staging/prepare.mjs codeship`. This resolves a successful tagged GitHub release, verifies its immutable image, transfers that image and extracts its operator workspace. Candidate overlays are for local/staging development only; never upload them to production.

Install Platform first, then one selected devkit or business app using its existing shell entry and `--target staging`. Examples:

```sh
sh .container/apps/setup.sh platform --target staging
sh .container/devkits/codeship/setup.sh --target staging
sh .container/devkits/codeitz/setup.sh --target staging
sh .container/devkits/uiux/setup.sh --target staging
sh .container/apps/setup.sh iilabs --target staging --backend
```

Use the corresponding update.sh thereafter. Each command selects one service, checks its approved release, preserves storage and verifies admission. Changed migration maps are blocked until a reviewed backup adapter exists; image-only updates skip migrations. IILabs first setup additionally takes a master backup, transfers it off-host and restores it into disposable local PostgreSQL before admitting tenant creation. Its staging owner password is generated synthetic data; the real production owner file is never consumed here.

Application ports are private: Platform14385, CodeShip14350, Codeitz14305, UIUX14315, IILabs14435. Use strict SSH tunnels to Windows localhost24385/24350/24305/24315/24435 respectively. Browser origins include these exact loopback addresses. Never widen the origins to a LAN/public HTTP hostname to avoid a login guard.

State, private configurations, database ownership, approved manifests and recovery references remain under /srv/codebiz-staging. Setup and update mirror supported inventory and verify fresh Docker metrics. The collector runs on the operator host; applications receive only read-only snapshots, never an operator key or Docker socket. Existing collector process coordination is reused; it is not a deployment scheduling lock.
