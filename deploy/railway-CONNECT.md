# Fix Railway “Not Found” (train has not arrived)

You see that page when the **domain exists** but **no app is running** behind it.

Right now: **MySQL is running**; **api / storefront / admin have never deployed** (`source: null` on Railway).

---

## Do this in Railway (required)

Open: https://railway.com/project/01b74028-e5bd-45d7-a584-084bb80368af

For **each** of `api`, `storefront`, and `admin`:

### Step A — Connect GitHub

1. Click the service (e.g. **api**).
2. **Settings** → **Source**.
3. **Connect GitHub** → pick **`Raj-9182/Avyona-Site`**.
4. Branch: **`main`**.

### Step B — Build settings (critical)

If **storefront** shows the same JSON as the API, all services are building the API image. Fix each service separately:

**Option 1 — Root directory (easiest)**

| Service | Root directory | Config file |
|---------|----------------|-------------|
| **api** | *(empty)* | `railway.toml` (repo root) |
| **storefront** | `Frontend` | `Frontend/railway.toml` (auto) |
| **admin** | `Dashboard` | `Dashboard/railway.toml` (auto) |

**Option 2 — Docker from repo root**

| Service | Root directory | Config file path |
|---------|----------------|------------------|
| **api** | empty | `railway.toml` |
| **storefront** | empty | `deploy/railway-storefront.toml` |
| **admin** | empty | `deploy/railway-admin.toml` |

In **Settings → Build**, set **Config file path** if Railway shows that field.

Redeploy **storefront** and **admin** after changing — wait for **Success**.

### Step C — Deploy

Click **Deploy** (or push to `main` after saving).

Wait until **Deployments** shows **Success** (green), not “Not Found”.

### Step D — Env vars (if not already set)

**api** — Variables:

```env
NODE_ENV=production
REQUIRE_MYSQL=true
ALLOW_LOCAL_DEV_ADMIN=false
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
JWT_SECRET=<your-secret>
FRONTEND_ORIGIN=https://storefront-production-1842.up.railway.app
SITE_URL=https://storefront-production-1842.up.railway.app
DASHBOARD_ORIGIN=https://admin-production-9513.up.railway.app
```

**storefront** (rebuild after setting):

```env
VITE_API_BASE_URL=https://api-production-fd51.up.railway.app/api/v1
VITE_SITE_URL=https://storefront-production-1842.up.railway.app
```

**admin**:

```env
VITE_API_BASE_URL=https://api-production-fd51.up.railway.app/api/v1
VITE_STOREFRONT_URL=https://storefront-production-1842.up.railway.app
```

### Step E — Database

**MySQL** → import `Backend/sql/schema.sql` (Data tab / connect).

### Step F — Uploads volume

**api** → **Volumes** → mount path: `/app/Backend/uploads` → redeploy.

---

## How to know it worked

| URL | Expected |
|-----|----------|
| https://api-production-fd51.up.railway.app/api/v1/health | JSON `"success": true` |
| https://storefront-production-1842.up.railway.app | Avyona shop UI |
| https://admin-production-9513.up.railway.app | Admin login |

---

## GitHub repo

https://github.com/Raj-9182/Avyona-Site

After editing deploy docs locally, push:

```powershell
& "C:\Program Files\Git\cmd\git.exe" add .
& "C:\Program Files\Git\cmd\git.exe" -c user.name="Raj-9182" -c user.email="Raj-9182@users.noreply.github.com" commit -m "Railway Docker deploy docs"
& "C:\Program Files\Git\cmd\git.exe" push
```
