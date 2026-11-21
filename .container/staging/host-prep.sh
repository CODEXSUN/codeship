#!/bin/sh
# LAN staging only. Does not change the system Node or existing application data.
set -eu
umask 077
[ "$(hostname -s)" = cxserver ] && [ "$(id -un)" = cx ]
[ "$(uname -m)" = x86_64 ]
root=/srv/codebiz-staging
runtime=/opt/codebiz-staging-node-26.13.1
if [ ! -e "$runtime" ]; then
  work=$(mktemp -d)
  cleanup() { rm -f -- "$work/SHASUMS256.txt" "$work/node-v26.13.1-linux-x64.tar.xz" "$work/selected.sha256"; rmdir "$work"; }
  trap cleanup EXIT
  curl -fsS --proto '=https' --tlsv1.2 https://nodejs.org/dist/v26.13.1/SHASUMS256.txt -o "$work/SHASUMS256.txt"
  curl -fsS --proto '=https' --tlsv1.2 https://nodejs.org/dist/v26.13.1/node-v26.13.1-linux-x64.tar.xz -o "$work/node-v26.13.1-linux-x64.tar.xz"
  awk '$2 == "node-v26.13.1-linux-x64.tar.xz"' "$work/SHASUMS256.txt" > "$work/selected.sha256"
  [ "$(wc -l < "$work/selected.sha256")" -eq 1 ]
  (cd "$work" && sha256sum -c selected.sha256)
  sudo -n install -d -m 755 "$runtime"
  sudo -n tar -xJf "$work/node-v26.13.1-linux-x64.tar.xz" --strip-components=1 -C "$runtime"
  sudo -n chown -R root:root "$runtime"
  sudo -n chmod -R a+rX "$runtime"
fi
[ "$("$runtime/bin/node" --version)" = v26.13.1 ]
if [ ! -e "$root" ]; then sudo -n install -d -m 700 -o cx -g cx "$root"; fi
[ "$(stat -c %U "$root")" = cx ]
mkdir -p "$root/state" "$root/private" "$root/recovery" "$root/releases" "$root/operators" "$root/bin"
chmod 700 "$root" "$root/state" "$root/private" "$root/recovery"
if [ ! -e "$root/bin/node" ]; then ln -s "$runtime/bin/node" "$root/bin/node"; fi
[ "$(readlink -f "$root/bin/node")" = "$runtime/bin/node" ]
docker version --format '{{.Server.Version}}'
docker compose version
"$root/bin/node" --version
printf '%s\n' 'Staging host prerequisites verified; no application installed.'
