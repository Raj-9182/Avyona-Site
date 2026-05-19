# Fresh Railway setup (clean project)

Use **one** Railway project tied to **one** GitHub repo. Ignore the old **Avyona Site** project to avoid confusion.

| Item | Value |
|------|--------|
| **GitHub** | https://github.com/Raj-9182/Avyona-Site |
| **New Railway project** | **Avyona Production** |
| **Project URL** | https://railway.com/project/13087c76-8f9c-4c39-84cc-50f28adb5e6b |

---

## Architecture (4 services)

```
GitHub: Raj-9182/Avyona-Site (branch: main)
        │
        ├── MySQL          (Railway plugin, no Git)
        ├── api            (repo root → deploy/docker/api.Dockerfile)
        ├── storefront     (repo root + deploy/docker/frontend.Dockerfile)
        └── admin          (repo root + deploy/docker/admin.Dockerfile)
```

---

## Step 1 — Finish in Railway dashboard

Open: https://railway.com/project/13087c76-8f9c-4c39-84cc-50f28adb5e6b

**MySQL** is already added. Add three services from GitHub:

### Service: `api`

1. **+ New** → **GitHub Repo** → `Raj-9182/Avyona-Site`
2. **Settings → General → Service name:** `api`
3. **Settings → Source:** branch `main`, **Root directory:** *(empty)*
4. **Settings → Build:** uses repo root `railway.toml` → API Dockerfile
5. **Settings → Networking → Generate domain**

### Service: `storefront`

1. **+ New** → **GitHub Repo** → same repo
2. **Service name:** `storefront`
3. **Root directory:** *(empty — repo root)*
4. **Dockerfile path:** `deploy/docker/frontend.Dockerfile`
5. **Generate domain**

### Service: `admin`

1. **+ New** → **GitHub Repo** → same repo
2. **Service name:** `admin`
3. **Root directory:** *(empty — repo root)*
4. **Dockerfile path:** `deploy/docker/admin.Dockerfile`
5. **Generate domain**

Delete duplicate/extra services if Railway created empty ones.

---

## Step 2 — Environment variables

### `api`

```env
NODE_ENV=production
REQUIRE_MYSQL=true
ALLOW_LOCAL_DEV_ADMIN=false

DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=7d
```

After domains exist, add (use your real `*.up.railway.app` URLs):

```env
FRONTEND_ORIGIN=https://<storefront-domain>
SITE_URL=https://<storefront-domain>
DASHBOARD_ORIGIN=https://<admin-domain>
```

### `storefront` (redeploy after setting)

```env
VITE_API_BASE_URL=https://<api-domain>/api/v1
VITE_SITE_URL=https://<storefront-domain>
```

### `admin` (redeploy after setting)

```env
VITE_API_BASE_URL=https://<api-domain>/api/v1
VITE_STOREFRONT_URL=https://<storefront-domain>
```

### `api` volume

**Volumes** → mount path: `/app/Backend/uploads`

---

## Step 3 — Database (once)

From your PC (Git + Railway CLI logged in):

```powershell
cd C:\Users\raj\OneDrive\Desktop\react_avyona_new_backup_react\Backend
# Pulls MYSQL_PUBLIC_URL from linked project MySQL service
.\scripts\import-railway-db.ps1
```

Or run manually:

```powershell
& "$env:APPDATA\npm\railway.cmd" link  # choose Avyona Production
cd Backend
# set DB_* from Railway MySQL variables, then:
& "C:\Program Files\nodejs\node.exe" scripts/setup-database.mjs
```

---

## Step 4 — Deploy

Each service: **Deployments → Deploy** (or push to `main`).

---

## How to verify

| URL | Expected |
|-----|----------|
| `<api>/api/v1/health` | JSON, `"database":"connected"` |
| `<api>/api/v1/products` | JSON product list |
| `<storefront>/` | **HTML shop** (not API JSON) |
| `<admin>/` | **Admin login** (not API JSON) |

---

## CLI (optional)

```powershell
& "$env:APPDATA\npm\railway.cmd" login
cd C:\Users\raj\OneDrive\Desktop\react_avyona_new_backup_react
& "$env:APPDATA\npm\railway.cmd" link   # pick Avyona Production
& "$env:APPDATA\npm\railway.cmd" open
```

---

## Old project

You can **delete** or ignore **Avyona Site** (`01b74028-e5bd-45d7-a584-084bb80368af`) after the new project works.
