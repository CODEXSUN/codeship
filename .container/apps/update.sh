#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
name=${1:?Select one application}
shift
if [ "${1:-}" = --target ] && [ "${2:-}" = staging ]; then
  shift 2
  exec node .container/staging/run.mjs update "$name" "$@"
fi
if [ "${1:-}" = --target ] && [ "${2:-}" = hostinger ]; then
  shift 2
  exec sh .container/hostinger/update.sh "$name" "$@"
fi
if [ "${1:-}" = --target ] && [ "${2:-}" = local ]; then
  shift 2
  exec node .container/local-operation.mjs update "$name" "$@"
fi
export CODESHIP_APP_SCRIPT_ENTRY=1
exec node .container/apps/lifecycle.ts update "$name" "$@"
