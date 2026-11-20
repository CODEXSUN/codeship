#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
name=${1:?Select one application}
shift
if [ "${1:-}" = --target ] && [ "${2:-}" = hostinger ]; then
  shift 2
  exec sh .container/hostinger/setup.sh "$name" "$@"
fi
if [ "${1:-}" = --target ] && [ "${2:-}" = local ]; then
  shift 2
  exec node .container/local-operation.mjs setup "$name" "$@"
fi
export CODESHIP_APP_SCRIPT_ENTRY=1
exec node .container/apps/lifecycle.ts setup "$name" "$@"
