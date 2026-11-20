#!/bin/sh
# Selected infrastructure only. Never installs an app or changes another site.
set -eu
base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(git -C "$base" rev-parse --show-toplevel)
[ "$(id -u)" = 0 ] || { echo 'Run as the authorized root operator.' >&2; exit 1; }
[ "$(hostname -s)" = srv914719 ] || { echo 'Unexpected VPS.' >&2; exit 1; }
git -C "$root" describe --exact-match --match 'v-*' HEAD >/dev/null
[ -z "$(git -C "$root" status --porcelain)" ] || { echo 'Clean released checkout required.' >&2; exit 1; }
for tool in nginx certbot systemctl curl; do command -v "$tool" >/dev/null; done
nginx -t
dest=/etc/nginx/conf.d/codeship-iilabs.in.conf
if [ -e "$dest" ]; then
    grep -qx '# Managed by CodeShip: iilabs.in ingress' "$dest" || { echo 'Unowned configuration; refusing replacement.' >&2; exit 1; }
fi
# Refuse a second owner of this hostname, even if its configuration is elsewhere.
if nginx -T 2>/dev/null | awk -v owned="$dest" '
 /^# configuration file / { file=$4; sub(/:$/, "", file) }
 /^[[:space:]]*server_name[[:space:]]/ && /(^|[[:space:]])iilabs[.]in([[:space:];]|$)/ && file != owned { found=1 }
 END { exit !found }'; then
    echo 'Another Nginx configuration owns iilabs.in.' >&2; exit 1
fi
recovery=/home/codebiz/.deployment/recovery/iilabs-ingress/$(date -u +%Y%m%dT%H%M%SZ)-$$
umask 077
mkdir -p "$recovery"
had_previous=no
if [ -e "$dest" ]; then cp -p "$dest" "$recovery/previous.conf"; had_previous=yes; fi
rollback() {
    status=$?
    trap - EXIT HUP INT TERM
    if [ "$status" -ne 0 ]; then
        if [ "$had_previous" = yes ]; then cp -p "$recovery/previous.conf" "$dest"; else rm -f -- "$dest"; fi
        nginx -t && systemctl reload nginx
        echo "Ingress failed; prior configuration restored. Recovery: $recovery" >&2
    fi
    exit "$status"
}
trap rollback EXIT
trap 'exit 1' HUP INT TERM
install -d -m 755 /var/lib/letsencrypt/.well-known/acme-challenge
if [ ! -f /etc/letsencrypt/live/iilabs.in/fullchain.pem ]; then
    install -m 644 "$base/http.conf" "$dest"
    nginx -t
    systemctl reload nginx
    # Existing account only: no new account or implicit terms acceptance.
    accounts=$(find /etc/letsencrypt/accounts/acme-v02.api.letsencrypt.org/directory -mindepth 1 -maxdepth 1 -type d | wc -l)
    [ "$accounts" -eq 1 ] || { echo 'Exactly one existing ACME account required.' >&2; exit 1; }
    certbot certonly --non-interactive --webroot -w /var/lib/letsencrypt --cert-name iilabs.in -d iilabs.in --deploy-hook 'nginx -t && systemctl reload nginx'
fi
install -m 644 "$base/https.conf" "$dest"
nginx -t
systemctl reload nginx
code=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --resolve iilabs.in:443:127.0.0.1 https://iilabs.in/)
case "$code" in 2??|3??|401|403|503) ;; *) echo "Unexpected ingress status: $code" >&2; exit 1;; esac
printf 'release=%s\nhttp_status=%s\nrecovery=%s\n' "$(git -C "$root" describe --exact-match HEAD)" "$code" "$recovery" > "$recovery/result.txt"
echo "IILabs HTTPS ingress installed; HTTP $code; recovery $recovery"
if [ "$code" = 503 ]; then echo 'Application is unavailable; ingress readiness is not application deployment success.'; fi
