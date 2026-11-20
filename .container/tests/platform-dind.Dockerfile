# Local disposable test engine only; never an application or VPS runtime.
FROM node:26.13.1-alpine@sha256:a90bda2938f2b57112d94ee2e3722c5346efca76e4a034042b5223197567a16c AS node
FROM docker:29-dind@sha256:4eea5f48923988bc80515bf582ffec1eece35f5c13bceae1b2074dc80ead1e3d
RUN apk add --no-cache libstdc++ postgresql18-client
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/lib/libatomic.so* /usr/lib/
WORKDIR /home/codebiz/devkit/codeship
