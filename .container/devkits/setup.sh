#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
export CODESHIP_DEVKIT_SCRIPT_ENTRY=1
exec node .container/devkits/lifecycle.ts setup all "$@"
