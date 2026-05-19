import fs from "fs";
import path from "path";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

function listFilesRecursive(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFilesRecursive(fullPath);
    return [fullPath];
  });
}

function copyFile(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

/**
 * Copy tracked seed assets into uploads/ when missing (e.g. fresh Railway deploy).
 */
export function ensureUploadAssets({
  uploadsDir = path.resolve(process.cwd(), "uploads"),
  seedDir = path.resolve(process.cwd(), "seed-uploads")
} = {}) {
  if (!fs.existsSync(seedDir)) {
    return { copied: 0, skipped: 0, seedDir };
  }

  fs.mkdirSync(uploadsDir, { recursive: true });

  const seedFiles = listFilesRecursive(seedDir).filter((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.has(ext);
  });

  let copied = 0;
  let skipped = 0;

  for (const sourcePath of seedFiles) {
    const relative = path.relative(seedDir, sourcePath);
    const targetPath = path.join(uploadsDir, relative);
    if (fs.existsSync(targetPath)) {
      skipped += 1;
      continue;
    }
    copyFile(sourcePath, targetPath);
    copied += 1;
  }

  if (copied > 0) {
    console.log(`[uploads] Copied ${copied} seed image(s) into ${uploadsDir}`);
  }

  return { copied, skipped, seedDir, uploadsDir };
}
