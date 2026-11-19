# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:26.13.1-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1
FROM ${NODE_IMAGE} AS build
WORKDIR /opt/codebiz
COPY foundation/framework ./foundation/framework
RUN cd foundation/framework && npm ci --install-links=false --ignore-scripts --no-audit && npm run build
COPY packages/ui ./packages/ui
RUN cd packages/ui && npm ci --install-links=false --ignore-scripts --no-audit && npm run build
COPY packages/sdk ./packages/sdk
COPY devkit/codeship ./devkit/codeship
RUN cd devkit/codeship && npm ci --install-links=false --ignore-scripts --no-audit && npm run typecheck && npm run build

FROM ${NODE_IMAGE} AS runtime
ARG APP_VERSION
ARG SOURCE_DIGEST
LABEL org.opencontainers.image.title="Codeship" org.opencontainers.image.version=$APP_VERSION org.opencontainers.image.revision=$SOURCE_DIGEST
COPY --from=build --chown=node:node /opt/codebiz /opt/codebiz
USER node
WORKDIR /opt/codebiz/devkit/codeship
ENV NODE_ENV=production CODESHIP_HOST=127.0.0.1 CODESHIP_PORT=4350
CMD ["node", "scripts/start-container.ts"]
