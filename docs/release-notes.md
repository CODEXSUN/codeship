# CodeShip 1.0.33 login recovery

Workspace access denial stays on a usable login form with a message. User, administrator and SA portal URLs and aliases still require Platform authentication and current CodeShip grants. UI0.1.21 and SDK0.1.13 prepare only the selected tab and ignore stale sign-in responses.

Preserves the complete published1.0.32 operator and recovery changes. This patch changes only published authentication dependency pins, version and verification records; it introduces no database migration or deployment effect. Running14350 needs a separately authorized update.
