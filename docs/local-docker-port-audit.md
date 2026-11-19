# Local Docker port audit — 2026-11-18

| Repository | Host | Container |
| --- | ---: | ---: |
| devkit/codeitz | 14305 | 4305 |
| devkit/uiux | 14315 | 4315 |
| devkit/codeship | 14350 | 4350 |
| apps/billing | 14335 | 4335 |
| apps/core-app | 14345 | 4345 |
| apps/crm | 14355 | 4355 |
| apps/ecommerce | 14365 | 4365 |
| apps/hrms | 14375 | 4375 |
| apps/platform | 14385 | 4385 |
| apps/automation | 14395 | 4395 |
| apps/zetro | 14405 | 4405 |
| apps/texlinks | 14415 | 4415 |
| apps/abconnect | 14420 | 4420 |

All13 repository Compose contracts validated with docker compose config using a dummy immutable image reference; no containers were started by this audit. Host allocations are unique. Ten existing app chats received their assignment and runtime rollout requirements. Core App and HRMS have no matching current workspace app chat in the50-chat inventory; their contracts are updated and rollout remains pending. CodeShip is already14350:4350.

Legacy running bindings observed before rollout: Core4454:14345, CRM4456:14355, HRMS4458:14375, Automation4459:14395, Zetro4460:14405, Texlinks4461:14415. These need actual API listener publication as well as host changes. Do not modify private relay/grant authority semantics. Native ports remain unchanged. Infrastructure and the unrelated PostgreSQL fixture remain unchanged.
