#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
exec sh "$ROOT/devkit/codeship/.container/devkits/codeship/update.sh" "$@"
