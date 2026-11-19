# Container log panel

Each metric container show page displays its own recent Docker stdout/stderr in a288px-high shared slim ScrollArea, with11px text. Pause/resume, refresh, copy and jump-to-latest are available. Scrolling up suspends automatic following; it does not stop the host sampler.

The host metrics process samples logs separately every5seconds after the prior sample completes; the UI polls every3seconds. Only registered, category-matched container IDs are exposed. At most100recent Docker entries/24,000characters per container and100containers are cached; this is a rolling tail, not historical retention.

The host reads registry and immutable container environment credentials in memory. Known secret values/encoded forms and common credential/key/token patterns are masked before atomic persistence to the existing read-only metrics directory. Applications must still exclude sensitive payloads from logs; this is conservative redaction, not a universal data-loss-prevention guarantee. Missing vault/configuration, failed Docker reads or stale/malformed cache return unavailable data, never a raw fallback.

GET /api/v1/docker-metrics/{category}/{container}/logs retains CodeShip local-peer/Host/Origin restrictions and Cache-Control:no-store. It does not accept names, paths or shell commands. CodeShip's container receives neither a Docker socket nor host execution rights. The existing host collector must run the release-matched scripts to produce logs.json; an old running collector must be replaced only after its process identity is verified. No app database migration is needed.

## Approved host operator after engine recovery

Use the verified immutable CodeShip operator root `.codeship/operators/v-1.0.21` for current app/devkit lifecycle operations. The supported entries remain `.container/apps/update.sh <app> --release-set <approved-set>` and `.container/devkits/<devkit>/update.sh --release-set <approved-set>`. Do not use an older primary checkout as the operational helper merely because the app container is current.

The helper's `ensureMetricsCollector` starts `scripts/collect-docker-metrics.ts` relative to that helper's appRoot when no identified collector is running. It retains an existing identified collector. There is currently no persisted approved-operator routing pointer or automatic source-version upgrade check. An older helper can therefore reintroduce its older collector after a collector stop; changing the app image alone does not update host source. The Nov19 recovery traced this to the old primary Texlinks verifier's parent PID, then restored the frozen21 collector under the canonical operation lock. Verify live metrics AND registered container log freshness after later app operations. Never stop a PID without positively checking its owned Node command; never remove another operation's lock.
