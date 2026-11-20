#!/bin/sh
set -eu
umask 077
[ "$(hostname)" = srv914719 ]
[ "$(id -u)" = 0 ]
mode=${1:-}
service=${2:-}
case "$mode" in setup|update|verify) ;; *) exit 2;; esac
case "$service" in platform|codeship|codeitz|uiux) ;; *) exit 2;; esac
shift 2
root=/home/codebiz/.deployment
operator="$root/operators/v-1.0.21/devkit/codeship"
export PATH="$root/bin:$PATH"
export CODESHIP_METRICS_READER_UID=1000
cd "$operator"
if [ "$service" = platform ]; then
  exec sh "$root/operators/v-1.0.21/apps/platform/.container/$mode.sh" "$@"
fi
if [ "$mode" = verify ]; then
  exec sh ".container/devkits/$service/verify.sh" "$@"
fi
exec sh ".container/devkits/$service/$mode.sh" "$@"
