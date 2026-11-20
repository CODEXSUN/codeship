FROM node:26.13.1-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /checks
COPY .container ./.container
COPY tests ./tests
COPY .gitignore ./.gitignore
CMD ["node","--test","tests/latest-update.test.ts","tests/migration-operation.test.ts","tests/clean-updater-git.test.ts","tests/hostinger-target.test.mjs","tests/offhost-recovery.test.ts"]
