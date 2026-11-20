#!/bin/sh
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
name=${1:?Select one app}
shift
exec sh "$DIR/update.sh" "$name" --setup "$@"
