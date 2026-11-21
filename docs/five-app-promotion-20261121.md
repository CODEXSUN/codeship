# Five-product promotion — 21 November 2026

Pipeline: local development and Docker proof, isolated Ubuntu staging, then the same immutable image on production. Production remains clean GitHub source plus released setup/update only. No Cloudflare changes. No deployment lock introduced.

| Product | Windows baseline | Staging verified | Production at start |
|---|---|---|---|
| Platform | 1.0.19 | 1.0.19, fresh synthetic tenant plus independent IILabs tenant | 1.0.19 |
| CodeShip | 1.0.31 | 1.0.38; 39 tooling under review | 1.0.27 |
| Codeitz | 1.0.17 | 1.0.18, exact release image; auth/CSRF/tab checks pass | 1.0.16 |
| UIUX | 0.1.16 | 0.1.17, SDK14; real authenticated Main/Agent preview, reload, two-tab and logout acceptance pass | 0.1.15 |
| IILabs | 0.1.15 full backend | 0.1.15 full backend, independent tenant and restricted roles; JSON client save/reopen passes | 0.1.15 public pages only |

Staging: cx@192.168.1.34/cxserver; isolated root /srv/codebiz-staging; PG18.7 pinned image, no published DB port; internal backend plus separate app ingress; host application ports bind127.0.0.1 only. Explicit backend DNS entries avoid ingress-peer ambiguity. No local or production data, identities or passwords copied to staging. Synthetic credentials remain private. Original Stage Codexsun owner access survives multi-tenant activation.

Before staging master mutation: private custom-format backup transferred to Windows, checksum checked, restored into disposable PostgreSQL successfully. Receipt retained under .codeship/staging/recovery/<sha>/verification.json; server backup-proof.json. No reset or implicit retry of partial ownership.

IILabs full Docker proof uses original15+Platform19, all10 app migrations, runtime SQL privilege checks, independent owner login/agency grants, client create/list, existing owner/domain preservation and forced-failure availability. Additional pinned15 public-to-full failure proof restores only the verified original stateless frontend, retains journal/database marker and still reports failure. Evidence in the app-owned .local/vps-adapter receipts. No production functional tests.

CodeShip source checks: typecheck passed; 195 tests passed before three new private-ticket tests (those pass separately). Build and final release verification recorded in subsequent work entries. No claim of production promotion until successful published release and selected admission receipts.

Pending: finalize39 audit/publication; admit39 on staging and verify metrics; selected Windows updates preserving volumes/records; ordered production updates and IILabs fresh backend activation using released scripts only; final parity matrix. Unfinished native source folders are preserved.
