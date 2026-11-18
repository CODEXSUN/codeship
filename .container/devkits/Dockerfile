# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:26.13.1-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /opt/codebiz
COPY foundation/framework ./foundation/framework
RUN cd foundation/framework && npm ci --ignore-scripts --no-audit && npm run build
COPY packages/ui ./packages/ui
RUN cd packages/ui && npm ci --ignore-scripts --no-audit && npm run build
ARG DEVKIT
COPY devkit/${DEVKIT} ./devkit/${DEVKIT}
COPY mcp-governance/docs ./mcp-governance/docs
RUN cd devkit/${DEVKIT} && npm ci --ignore-scripts --no-audit && npm run typecheck && NODE_OPTIONS=--max-old-space-size=4096 npm run build
FROM ${NODE_IMAGE} AS runtime
ARG DEVKIT
ARG APP_VERSION
ARG SOURCE_DIGEST
LABEL org.opencontainers.image.title=$DEVKIT org.opencontainers.image.version=$APP_VERSION org.opencontainers.image.revision=$SOURCE_DIGEST
COPY --from=build --chown=node:node /opt/codebiz /opt/codebiz
USER node
WORKDIR /opt/codebiz/devkit/${DEVKIT}
ENV NODE_ENV=production
CMD ["npm","start"]
