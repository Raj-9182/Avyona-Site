# Fix: `Table 'railway.products' doesn't exist`

The API uses Railway’s MySQL database named **`railway`**. Tables must be created there once.

## Option A — Railway dashboard (easiest)

1. Open **Avyona Site** → **MySQL** service.
2. Open **Data** / **Query** / **Connect** (Railway MySQL plugin UI).
3. Run this one-liner, then import the rest via the UI file upload if available:

```sql
-- Or use "Connect" and run the setup from the api service (Option B)
```

## Option B — SSH into API (recommended)

1. Push latest code (includes `setup-database.mjs` fix for `DB_NAME`).
2. In PowerShell:

```powershell
cd "C:\Users\raj\OneDrive\Desktop\react_avyona_new_backup_react"
& "$env:APPDATA\npm\railway.cmd" ssh --service api
```

3. Inside the container:

```bash
cd Backend && node scripts/setup-database.mjs
exit
```

Uses env vars already set on **api** (`DB_NAME=railway`, `DB_HOST=mysql.railway.internal`, etc.).

## Option C — Public MySQL URL (from your PC)

1. Railway → **MySQL** → **Variables** → copy **`MYSQL_PUBLIC_URL`** (or enable public networking).
2. Install MySQL client locally, then:

```bash
# Example — use your real URL from Railway
mysql "mysql://root:PASSWORD@ballast.proxy.rlwy.net:PORT/railway" < Backend/sql/schema.sql
```

Edit `schema.sql` first line to use `railway` instead of `avyona_admin`, **or** use the updated setup script with `DB_NAME=railway`.

## Confirm

Open:

https://api-production-fd51.up.railway.app/api/v1/health

```json
"database": "connected"
```

https://api-production-fd51.up.railway.app/api/v1/products

Should return `{"success":true,"data":[...]}` not a table error.

## API env check

**api** service variables must include:

```env
DB_NAME=${{MySQL.MYSQLDATABASE}}
```

That value is usually `railway` on Railway — tables must live in that database.
