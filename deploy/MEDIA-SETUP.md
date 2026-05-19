# Media setup (admin-editable images)

Product, category, brand, logo, and homepage images are stored as **paths in MySQL** (usually `/uploads/...`). The **API serves** those files; the storefront loads them from the API URL (`VITE_API_BASE_URL`).

## 1. Deploy images with the API (required)

The database stores `/uploads/filename.jpg`, but the **API must have those files on disk**. If you see broken images, test:

`https://api-production-c9f5f.up.railway.app/uploads/<filename>.jpg`

If that returns 404, the API has no files yet.

**Option A — Git deploy (recommended):**

```bash
cd Backend
npm run seed-uploads:prepare   # once: copies uploads → seed-uploads
git add Backend/seed-uploads Backend/lib Backend/server.js deploy/docker/api.Dockerfile
git commit -m "Include seed uploads for production media"
git push
```

Redeploy the **api** service on Railway. On startup, the API copies `seed-uploads/` → `uploads/` (works even with an empty volume).

**Option B — Copy to a running API (SSH):**

```powershell
cd Backend
powershell -ExecutionPolicy Bypass -File scripts/upload-railway-uploads.ps1
```

Requires Railway SSH keys (`ssh-keygen -t ed25519`, add public key in Railway account settings).

## 2. Link seed images to your uploads (one-time)

From `Backend/`:

**Railway (recommended if you deploy there):**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-railway-media.ps1
```

Requires `railway link` to Avyona Production. Uses `MYSQL_PUBLIC_URL` from the MySQL service.

**Local MySQL:** start MySQL, set `DB_*` in `.env`, then:

```bash
npm run media:bootstrap
```

This updates categories, products, brands, and settings that still use `/images/optimized/...` to real files in `Backend/uploads`.

You can re-run anytime. Then fine-tune images in the admin panel.

## 3. Redeploy

- **API** — serves `/uploads` and `/images/*` (legacy paths map to uploads).
- **Storefront** — needs `VITE_API_BASE_URL=https://your-api.up.railway.app/api/v1`.
- **Admin** — same `VITE_API_BASE_URL` for previews and uploads.

## Editing images later (admin)

| Area | Where in admin |
|------|----------------|
| Store logo / favicon | Settings → General |
| Homepage hero / banners | Homepage Configure → Hero Banner |
| Categories | Categories → edit → image / banner |
| Products | Products → add/edit → gallery upload |
| All uploaded files | Website Images |

Saved paths stay as `/uploads/...` in the database so they work on any domain after deploy.
