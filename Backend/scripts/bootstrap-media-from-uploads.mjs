/**
 * Point catalog/settings image URLs at files in Backend/uploads so the storefront
 * can load them from the API (/uploads and /images). Safe to re-run.
 *
 * Usage (from Backend/):
 *   Local MySQL:  set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env then npm run media:bootstrap
 *   Railway MySQL: powershell -ExecutionPolicy Bypass -File scripts/bootstrap-railway-media.ps1
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const uploadsRoot = path.resolve(process.cwd(), "uploads");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

function listImages(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listImages(fullPath);
    const ext = path.extname(entry.name).toLowerCase();
    return imageExtensions.has(ext) ? [fullPath] : [];
  });
}

function toUploadUrl(filePath) {
  const relative = path.relative(uploadsRoot, filePath).split(path.sep).join("/");
  return `/uploads/${relative}`;
}

function isLegacyStaticPath(value) {
  return String(value || "").startsWith("/images/");
}

async function main() {
  const imageFiles = listImages(uploadsRoot).filter((filePath) => {
    const relative = path.relative(uploadsRoot, filePath);
    return !relative.startsWith("inventory");
  });

  if (!imageFiles.length) {
    console.error("No images found in Backend/uploads. Add JPG/PNG/WebP files first.");
    process.exitCode = 1;
    return;
  }

  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = Number(process.env.DB_PORT || 3306);
  const dbName = process.env.DB_NAME || "avyona_admin";
  const dbUser = process.env.DB_USER || "root";

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: process.env.DB_PASSWORD || "",
      database: dbName
    });
  } catch (error) {
    if (error?.code === "ECONNREFUSED" || error?.name === "AggregateError") {
      console.error("\nCould not connect to MySQL.");
      console.error(`  Tried: ${dbUser}@${dbHost}:${dbPort} / database "${dbName}"`);
      console.error("\nYou do not have MySQL running on this PC. Use one of these:\n");
      console.error("  Railway (production DB):");
      console.error("    powershell -ExecutionPolicy Bypass -File scripts/bootstrap-railway-media.ps1\n");
      console.error("  Local MySQL:");
      console.error("    npm run mysql:start");
      console.error("    Copy .env.example to .env, set DB_* values, then npm run media:bootstrap\n");
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  let index = 0;
  const nextUrl = () => {
    const filePath = imageFiles[index % imageFiles.length];
    index += 1;
    return toUploadUrl(filePath);
  };

  const updates = [];

  const [categories] = await connection.query(
    "SELECT id, image_url, banner_image_url FROM categories WHERE image_url LIKE '/images/%' OR banner_image_url LIKE '/images/%'"
  );
  for (const row of categories) {
    const imageUrl = isLegacyStaticPath(row.image_url) ? nextUrl() : row.image_url;
    const bannerImageUrl = isLegacyStaticPath(row.banner_image_url) ? nextUrl() : row.banner_image_url;
    updates.push(["categories", row.id, imageUrl, bannerImageUrl]);
    await connection.query(
      "UPDATE categories SET image_url = ?, banner_image_url = ? WHERE id = ?",
      [imageUrl, bannerImageUrl, row.id]
    );
  }

  const [brands] = await connection.query(
    "SELECT id, logo_url FROM brands WHERE logo_url LIKE '/images/%'"
  );
  for (const row of brands) {
    const logoUrl = nextUrl();
    await connection.query("UPDATE brands SET logo_url = ? WHERE id = ?", [logoUrl, row.id]);
    updates.push(["brands", row.id, logoUrl]);
  }

  const [products] = await connection.query(
    "SELECT id, image_url FROM products WHERE image_url LIKE '/images/%'"
  );
  for (const row of products) {
    const imageUrl = nextUrl();
    await connection.query("UPDATE products SET image_url = ? WHERE id = ?", [imageUrl, row.id]);
    await connection.query("DELETE FROM product_media WHERE product_id = ? AND media_type = 'image'", [row.id]);
    await connection.query(
      "INSERT INTO product_media (product_id, media_type, url, alt_text, sort_order, is_primary) VALUES (?, 'image', ?, '', 0, 1)",
      [row.id, imageUrl]
    );
    updates.push(["products", row.id, imageUrl]);
  }

  const [settingsRows] = await connection.query(
    "SELECT setting_key, setting_value FROM app_settings WHERE setting_value LIKE '/images/%'"
  );
  for (const row of settingsRows) {
    const settingValue = nextUrl();
    await connection.query(
      "UPDATE app_settings SET setting_value = ? WHERE setting_key = ?",
      [settingValue, row.setting_key]
    );
    updates.push(["app_settings", row.setting_key, settingValue]);
  }

  await connection.end();

  console.log(`Linked ${imageFiles.length} upload file(s) to ${updates.length} catalog/settings field(s).`);
  console.log("Redeploy or sync Backend/uploads to Railway, then open the admin panel to replace images per product/category.");
}

main().catch((error) => {
  if (error?.code === "ECONNREFUSED" || error?.name === "AggregateError") {
    console.error("\nDatabase connection failed (ECONNREFUSED). See instructions above or use bootstrap-railway-media.ps1");
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
