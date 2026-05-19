/**
 * Copy storefront images from Backend/uploads → Backend/seed-uploads (for Docker deploy).
 * Run from Backend/:  node scripts/prepare-seed-uploads.mjs
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const uploadsDir = path.join(root, "uploads");
const seedDir = path.join(root, "seed-uploads");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "inventory-exports" || entry.name === "inventory-test") return [];
      return listFiles(fullPath);
    }
    const ext = path.extname(entry.name).toLowerCase();
    return imageExtensions.has(ext) ? [fullPath] : [];
  });
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

const sources = listFiles(uploadsDir);
if (!sources.length) {
  console.error("No images in Backend/uploads. Add files first.");
  process.exitCode = 1;
  process.exit();
}

let copied = 0;
for (const sourcePath of sources) {
  const relative = path.relative(uploadsDir, sourcePath);
  const targetPath = path.join(seedDir, relative);
  copyFile(sourcePath, targetPath);
  copied += 1;
}

console.log(`Prepared ${copied} file(s) in Backend/seed-uploads/`);
console.log("Commit seed-uploads/ and redeploy the API so production can serve /uploads/.");
