#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
export CODESHIP_APP_SCRIPT_ENTRY=1
exec node .container/apps/lifecycle.ts verify "$@"
