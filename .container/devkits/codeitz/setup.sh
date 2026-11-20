#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)"
if [ "${1:-}" = --target ] && [ "${2:-}" = hostinger ]; then
  shift 2
  exec sh .container/hostinger/setup.sh codeitz "$@"
fi
if [ "${1:-}" = --target ] && [ "${2:-}" = local ]; then
  shift 2
  exec node .container/local-operation.mjs setup codeitz "$@"
fi
export CODESHIP_DEVKIT_SCRIPT_ENTRY=1
exec node .container/devkits/lifecycle.ts setup codeitz "$@"
