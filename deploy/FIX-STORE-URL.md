# Still seeing API JSON on the store URL?

That JSON is the **API homepage**. All three services are building from the **root `railway.toml`**, which points at the **API** Dockerfile.

## Fix (copy exactly)

Railway → **Avyona Production** → click **storefront** (not api).

### Settings → Build

1. **Root Directory** — delete everything (must be **empty** / `/`)
2. **Dockerfile Path** — set exactly:
   ```
   Frontend/Dockerfile
   ```
3. Save → **Redeploy** → wait for **Success**

### Settings → Variables (then redeploy again)

```env
VITE_API_BASE_URL=https://api-production-c9f5f.up.railway.app/api/v1
VITE_SITE_URL=https://storefront-production-3c4d.up.railway.app
```

---

## Admin service

**admin** → Build:

- Root: **empty**
- Dockerfile: `Dashboard/Dockerfile`
- Redeploy

Variables:

```env
VITE_API_BASE_URL=https://api-production-c9f5f.up.railway.app/api/v1
VITE_STOREFRONT_URL=https://storefront-production-3c4d.up.railway.app
```

---

## API service (unchanged)

- Root: empty
- Dockerfile: `deploy/docker/api.Dockerfile` or root `railway.toml`

---

## Test

| URL | Correct result |
|-----|----------------|
| https://storefront-production-3c4d.up.railway.app | **Shop website** |
| https://api-production-c9f5f.up.railway.app | API JSON (OK) |

Wrong: opening the **api** URL and expecting the shop.
