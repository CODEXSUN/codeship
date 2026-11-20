#!/bin/sh
set -eu
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
name=${1:?Select codeship, codeitz or uiux; deployments run one product at a time}
shift
case "$name" in codeship|codeitz|uiux) ;; *) exit 2;; esac
exec sh "$DIR/$name/setup.sh" "$@"
