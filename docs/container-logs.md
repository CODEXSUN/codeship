# Container log panel

Each metric container show page displays its own recent Docker stdout/stderr in a288px-high shared slim ScrollArea, with11px text. Pause/resume, refresh, copy and jump-to-latest are available. Scrolling up suspends automatic following; it does not stop the host sampler.

The host metrics process samples logs separately every5seconds after the prior sample completes; the UI polls every3seconds. Only registered, category-matched container IDs are exposed. At most100recent Docker entries/24,000characters per container and100containers are cached; this is a rolling tail, not historical retention.

The host reads registry and immutable container environment credentials in memory. Known secret values/encoded forms and common credential/key/token patterns are masked before atomic persistence to the existing read-only metrics directory. Applications must still exclude sensitive payloads from logs; this is conservative redaction, not a universal data-loss-prevention guarantee. Missing vault/configuration, failed Docker reads or stale/malformed cache return unavailable data, never a raw fallback.

GET /api/v1/docker-metrics/{category}/{container}/logs retains CodeShip local-peer/Host/Origin restrictions and Cache-Control:no-store. It does not accept names, paths or shell commands. CodeShip's container receives neither a Docker socket nor host execution rights. The existing host collector must run the release-matched scripts to produce logs.json; an old running collector must be replaced only after its process identity is verified. No app database migration is needed.
