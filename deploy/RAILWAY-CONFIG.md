# Railway config per service (fix “can’t edit build” / API JSON on storefront)

The root `railway.toml` was forcing **every** service to use the **API** Dockerfile.

It is removed. Each service uses its own file below.

## After you push to GitHub

In Railway → **Avyona Production**, for **each** service:

**Settings** → scroll to **Config-as-code** (or **Build** → “Config file”)

Set **Railway config file** to:

| Service | Config file path |
|---------|------------------|
| **api** | `deploy/railway-api.toml` |
| **storefront** | `deploy/railway-storefront.toml` |
| **admin** | `deploy/railway-admin.toml` |

Save → **Redeploy** each service.

Build settings should unlock and show the correct Dockerfile per service.

## Storefront variables (redeploy after)

```env
VITE_API_BASE_URL=https://api-production-c9f5f.up.railway.app/api/v1
VITE_SITE_URL=https://storefront-production-3c4d.up.railway.app
```

## Verify

- https://storefront-production-3c4d.up.railway.app → **HTML shop**
- https://api-production-c9f5f.up.railway.app → API JSON
