import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "public", "images");
const OUTPUT_DIR = path.join(SOURCE_DIR, "optimized");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

function toOptimizedAssetName(filePath) {
  return path.basename(filePath, path.extname(filePath))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTargetWidth(fileName, metadata) {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.startsWith("banner ")) return 1400;
  if (lowerFileName.includes("blog")) return 900;
  if (lowerFileName.includes("logo")) return 420;
  if (lowerFileName.includes("payment")) return 160;
  if (lowerFileName === "store video.mp4") return null;
  return Math.min(metadata.width || 1200, 1200);
}

function getTargetQuality(fileName) {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.startsWith("banner ")) return 80;
  if (lowerFileName.includes("logo")) return 84;
  if (lowerFileName.includes("payment")) return 82;
  return 78;
}

function getRasterFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "optimized") return [];
      return getRasterFiles(fullPath);
    }
    return IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : [];
  });
}

async function optimizeImage(filePath) {
  const fileName = path.basename(filePath);
  const image = sharp(filePath).rotate();
  const metadata = await image.metadata();
  const targetWidth = getTargetWidth(fileName, metadata);
  const targetQuality = getTargetQuality(fileName);
  const outputName = `${toOptimizedAssetName(filePath)}.webp`;
  const outputPath = path.join(OUTPUT_DIR, outputName);

  await image
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ quality: targetQuality })
    .toFile(outputPath);

  const outputSize = fs.statSync(outputPath).size;
  console.log(`${outputName} ${outputSize}`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const files = getRasterFiles(SOURCE_DIR);

  for (const filePath of files) {
    await optimizeImage(filePath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
