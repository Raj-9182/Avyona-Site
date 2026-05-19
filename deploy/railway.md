# Deploy Avyona on Railway (project: **Avyona Site**)

## Current Railway URLs (production)

| Service | URL |
|---------|-----|
| **api** | https://api-production-fd51.up.railway.app |
| **storefront** | https://storefront-production-1842.up.railway.app |
| **admin** | https://admin-production-9513.up.railway.app |

Open dashboard: `railway open` (or https://railway.com)

## Services

| Service | Source | Deploy command |
|---------|--------|----------------|
| **MySQL** | Railway template | (already added) |
| **api** | Repo root (`Backend/` + `shared/`) | `railway up . --service api` |
| **storefront** | `Frontend/` | `railway up Frontend --path-as-root --service storefront` |
| **admin** | `Dashboard/` | `railway up Dashboard --path-as-root --service admin` |
| **analytics-cron** | Repo root, cron only | Set cron schedule in dashboard |

## 1. API environment variables

In Railway → **api** → Variables (or CLI), set:

```env
NODE_ENV=production
REQUIRE_MYSQL=true
ALLOW_LOCAL_DEV_ADMIN=false

DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

JWT_SECRET=<generate-a-long-random-string>
JWT_EXPIRES_IN=7d
```

After first deploy, generate public URLs:

```env
FRONTEND_ORIGIN=https://<storefront-domain>
SITE_URL=https://<storefront-domain>
DASHBOARD_ORIGIN=https://<admin-domain>
```

Use **Settings → Networking → Generate domain** on each service, then update these and redeploy **api**.

## 2. Volume for uploads (required)

Railway → **api** → **Volumes** → Add volume:

- Mount path: `/app/Backend/uploads`

Redeploy **api** after attaching.

## 3. Storefront variables (build-time)

```env
VITE_API_BASE_URL=https://<api-domain>/api/v1
VITE_SITE_URL=https://<storefront-domain>
```

Deploy: `railway up Frontend --path-as-root --service storefront`

## 4. Admin variables (build-time)

```env
VITE_API_BASE_URL=https://<api-domain>/api/v1
VITE_STOREFRONT_URL=https://<storefront-domain>
```

Deploy: `railway up Dashboard --path-as-root --service admin`

## 5. Import database schema

Option A — Railway MySQL shell:

```bash
railway connect MySQL
```

Then paste / source `Backend/sql/schema.sql` (or use phpMyAdmin if linked).

Option B — From your PC (after `railway run` or with public MySQL URL if enabled):

```bash
mysql -h ... -u ... -p ... avyona_admin < Backend/sql/schema.sql
```

## 6. Analytics cron

**analytics-cron** service:

- **Start command:** `cd Backend && node scripts/aggregate-analytics-events.mjs`
- **Cron schedule:** `*/5 * * * *` (UTC)
- Same `DB_*` variables as **api** (reference `${{MySQL.*}}`)
- No public domain needed

## 7. Custom domains

Attach `avyona.com` / `www` → **storefront**, `admin.` → **admin**, `api.` → **api** in each service’s **Networking** tab, then update CORS and `VITE_*` URLs.

## CLI quick reference

```powershell
cd "C:\Users\raj\OneDrive\Desktop\react_avyona_new_backup_react"
& "$env:APPDATA\npm\railway.cmd" status
& "$env:APPDATA\npm\railway.cmd" up . --service api --detach
& "$env:APPDATA\npm\railway.cmd" logs --service api
& "$env:APPDATA\npm\railway.cmd" open
```

Use `npm.cmd` or **cmd** if PowerShell blocks `npm`.
