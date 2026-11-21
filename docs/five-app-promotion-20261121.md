# Five-product deployment completed — 21 November 2026

Verified: local Windows Docker → private Ubuntu staging192.168.1.34 → Hostinger production69.62.81.166. Each product has its own container/network namespace. All three targets run the exact same approved immutable app images.

| Product | Release | Production | Private host:container port | Status |
|---|---|---|---|---|
| platform | 1.0.19 | https://cx.codexsun.com | 14385:4385 | Verified on all three targets |
| codeship | 1.0.42 | https://codeship.codexsun.com | 14350:4350 | Verified on all three targets |
| codeitz | 1.0.18 | https://codeitz.codexsun.com | 14305:4305 | Verified on all three targets |
| uiux | 0.1.17 | https://uiux.codexsun.com | 14315:4315 | Verified on all three targets |
| iilabs | 0.1.15 | https://iilabs.in | 14435:4435 | Verified on all three targets |

All five public HTTPS readiness and original login routes returned200. Public service-info matched approved releases and Platform authentication for all four dependent apps. Production checks were bounded deployment admission; authenticated login, permission, tab/SSE/iframe, JSON save/reopen and recovery tests ran only locally or on staging. Cloudflare was not changed.

## Completed checklist

- Verified staging host, strict SSH host key, isolated Node26.13.1, existing Docker/Compose, private networks, PG18.7 and persistent storage. Stage uses generated synthetic identities only.
- Verified Platform19, existing owner access and same-image multi-tenant configuration.
- Verified CodeShip42, registry, fresh app/devkit metrics, live redacted logs, retained SQLite/key volumes and original shared login.
- Verified Codeitz18 original login and task/chat streams, reconnect, tab isolation and logout on local/staging. Local update preserved53tables/4754rows byte-identically; production update skipped migrations/import/workspace copy.
- Verified UIUX17 with SDK14: Main and Agent previews, interaction/reload, two independent tabs, catalogue and selected logout. Original login and UI20 retained.
- Verified IILabs15 full backend with all10 migrations, restricted runtime role, independent vault/service token, fresh tenant iilabs and its explicitly authorized new owner. No local records/identities imported. Production public pages and login route now work; public-only mode is superseded.
- Verified final source/OCI revision and image parity, health and loopback-only bindings. All17 unselected production container IDs/images remained unchanged (22 total containers). Production Git checkout is clean at approved42. No production builds, source patches or test fixtures.

## Fixes and retained recovery

CodeShip39 added staging and the backend installation contract. CodeShip40 repaired the missing local Platform browser-origin configuration without changing users/grants/image. CodeShip41 upgraded the known production host collector from retained21 source and published only redacted snapshots as root:1000/0640 for the read-only non-root app.

The first IILabs backend attempt stopped after fresh schemas and a checked master backup because computed Compose peers were omitted from the saved-file merge. Public15 remained healthy. CodeShip42 was corrected and tested locally and on Ubuntu, published through the GitHub helper and successful CI44874430384, then explicitly resumed checkpoint2026-11-21T06-00-07-791Z. It merged original effective Compose settings, restored same-image Platform access, attested the existing new tenant/sole owner using native password verification, retained all private credentials, skipped reprovisioning/migrations and completed admission. No database reset or VPS source repair occurred.

- iilabs postgresql backup: off-host restore verified; reference 1f78dad1-232a-4ccf-b7e2-b1374a950914; SHA256 01dec370d4d0e76e8653bbd0aad58c8713050c7d80a95594b8a05a6468aa9cc9.
- codeship sqlite backup: off-host restore verified; reference 20444505-e9c7-47c9-8c88-4c44086878ce; SHA256 a5089f5b41660fa1dd7817b5b97f6153964a7f36b3447383334082a50ee71576.

Database backups remain in the private Windows operator recovery directory and production private recovery state. CodeShip key volumes, Platform configuration snapshots, original stateless IILabs recovery and referenced operator runtimes remain retained. These are recovery artifacts, not disposable scratch work; no full-machine backup is claimed. Image-only/no-op updates skip database backups. IILabs regular update was rerun successfully and verified current with no replacement/migration.

## Regular updates

Use a clean approved CodeShip tag; current operator is v-1.0.42. Make fixes and run tests locally/staging, publish through GitHub, then use only the released owning update.sh for production. Never edit/build/test source on the VPS, run a bulk rollout, clear another operation or introduce deployment locks. Coordinate the selected app and shared resources first.

```sh
sh .container/apps/update.sh platform --target hostinger --tag v-1.0.19
sh .container/devkits/codeship/update.sh --target hostinger --tag v-1.0.42
sh .container/devkits/codeitz/update.sh --target hostinger --tag v-1.0.18
sh .container/devkits/uiux/update.sh --target hostinger --tag v-0.1.17
sh .container/apps/update.sh iilabs --target hostinger --backend --tag v-0.1.15
```

Run one command at a time. Setup is first-install only. A partial installation requires its exact reviewed checkpoint; never repeat provisioning or reset data. Existing successful IILabs installation uses update with --backend; the default public-only installer must not replace it.

## Access and target separation

Production uses the URLs above. Devkits keep the original shared Platform SA login and existing Codexsun super-administrator access. IILabs uses separate corporate ID iilabs and owner username codexsun/email iilabs@admin.com; the authorized password stays private. No credentials are included here.

Ubuntu apps bind127.0.0.1 only. The owned strict-SSH tunnel exposes Windows localhost24385 Platform,24350 CodeShip,24305 Codeitz,24315 UIUX,24435 IILabs. The protected SSH key stays on Windows; applications receive neither operator keys nor the Docker socket. Stage credentials and data are synthetic and independent of production.

## Release identity

- platform: source 95807cfd464aa86c702cd306aaf6c5afda342319; image sha256:1f543fdf5d67f764f02aa0a59794893eaeb551d3001e96262dc9b35cd2a6ddcb.
- codeship: source 5a3a766cf2091579f697f92ece4ad4c6252fd489; image sha256:9342958c50a3bb3e4c4607f50f7f1707683e855b7c3aea55a2224aed32f2130f.
- codeitz: source c76dd93f0d2683627cab2ed7817ec00869d66eff; image sha256:2e65a2c9a375eea82a6a8ff8cb977055841801718b0fb262cb3749ea86a18a21.
- uiux: source d8b95cc0875c41b48d37c5a92055571c03810758; image sha256:0cae9dec765f87875c8499bf596c23ca254cfb8beb932502b148f8a6290cde42.
- iilabs: source a497cf5c99db53764bbb096d4ed7103e42b5dc3c; image sha256:7d8995feb05c59cc58004ba31b5060b9e062eec996b3116f64142a241fd2f782.

## Remaining work outside this rollout

No deployment blocker remains for these five products. Unfinished editable source folders were preserved and not published wholesale. The separately authorized Codeitz Projects/Modules record sync is owned by its chat and is not reported as completed here. Its deployment-ready notice has been sent; any record transfer remains draft/manual-approval work.
