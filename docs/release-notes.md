# CodeShip 1.0.24

Preserve selected update/login wiring from1.0.23 and resolve the existing ingress connector on every network shared with that service. Codeitz has both Devkits and infrastructure attachments; either connector source IP must be explicitly allowed. Other devkits retain their narrower peer list. No Cloudflare configuration, dependency, UI or database migration change.

Regression verifies both connector addresses, excludes unrelated endpoints, and fails closed on missing peers. TaggedCI and matching deployment pending.
