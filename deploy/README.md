# Deployment

Push to `main` and GitHub Actions deploys both apps to the VPS (`72.60.221.29`).

```
git push origin main
  build job   npm ci, typecheck, vite build (frontend); npm ci + load app.js (backend)
  deploy job  rsync to /var/www/.deploy/thetrendsnap/incoming
              ssh -> deploy/remote-deploy.sh <sha>
                backup  -> /var/www/.deploy/thetrendsnap/backups/<time>-<sha>
                backend -> /var/www/admin.thetrendsnap.com, npm ci if lockfile changed, pm2 reload, health check
                frontend-> /var/www/thetrendsnap.com/dist swapped in
                any error -> backup restored automatically
  check       https://thetrendsnap.com and https://admin.thetrendsnap.com/api/health return 200
```

Pull requests run only the build job.

## What stays on the server only

- `/var/www/admin.thetrendsnap.com/.env` (backend secrets)
- `/var/www/thetrendsnap.com/.env` (not used by CI; the build takes `VITE_*` from the workflow)
- `node_modules` in both folders

Deploys never overwrite or delete these.

## GitHub secrets

Repository -> Settings -> Secrets and variables -> Actions -> New repository secret:

| Name | Value |
| --- | --- |
| `SERVER_HOST` | `72.60.221.29` |
| `SERVER_USER` | `root` |
| `SSH_PRIVATE_KEY` | private key of the deploy key pair, including the BEGIN/END lines |
| `SERVER_PORT` | optional, only if SSH is not on 22 |
| `SSH_KNOWN_HOSTS` | optional, output of `ssh-keyscan 72.60.221.29` |

Optional variables (same page, Variables tab): `VITE_API_URL`, `VITE_SITE_URL`.

## Rollback

```bash
ssh root@72.60.221.29
ls -1t /var/www/.deploy/thetrendsnap/backups/          # newest first
B=/var/www/.deploy/thetrendsnap/backups/<folder>
tar -xzf $B/api.tgz -C /var/www/admin.thetrendsnap.com && pm2 reload admin.thetrendsnap.com
rm -rf /var/www/thetrendsnap.com/dist && cp -a $B/dist /var/www/thetrendsnap.com/dist
```

Or revert the commit on GitHub and push; the pipeline deploys the reverted code.

## Useful commands

```bash
pm2 logs admin.thetrendsnap.com --lines 100
curl -s localhost:9000/api/health
cat /var/www/.deploy/thetrendsnap/current-version
```
