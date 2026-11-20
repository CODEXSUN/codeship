#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"
NODE=node
if [ "$(uname -s)" = Linux ] && [ -x /home/codebiz/.deployment/bin/node ]; then NODE=/home/codebiz/.deployment/bin/node; fi
exec "$NODE" .container/hostinger/latest-update.mjs "$@"
