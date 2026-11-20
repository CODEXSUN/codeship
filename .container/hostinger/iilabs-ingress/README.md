# IILabs public ingress

Selected infrastructure only: iilabs.in on srv914719/69.62.81.166. Does not deploy IILabs or change Cloudflare. DNS must already point at the VPS. Existing Nginx/Certbot and exactly one existing production ACME account are prerequisites; new account/terms acceptance is not automated.

From the approved clean tagged CodeShip checkout, run:

```sh
sh .container/hostinger/iilabs-ingress/setup.sh
# Subsequent ingress-only updates:
sh .container/hostinger/iilabs-ingress/update.sh
```

Public HTTPS terminates at host Nginx, then proxies to http://127.0.0.1:14435 (IILabs internal4435). The listener stays private. No www hostname is configured. Original Host and Origin are preserved; forwarded scheme/address are derived at this proxy. No login/grant changes. HTTP redirects to HTTPS except ACME challenges. An absent upstream returns503, not a working application claim.

The selected configuration is /etc/nginx/conf.d/codeship-iilabs.in.conf, ownership marked. Prior selected configuration and result receipt remain in /home/codebiz/.deployment/recovery/iilabs-ingress/. Existing sites are untouched. On failure the script restores the prior selected file and validates/reloads. Certificates are retained outside source by Certbot; renewal uses its existing scheduler and saved reload hook. No database backup is needed for ingress-only changes; this is not an app/data recovery backup.
