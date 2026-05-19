import fs from "fs/promises";
import path from "path";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

async function listImageFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listImageFiles(fullPath);
      const ext = path.extname(entry.name).toLowerCase();
      return imageExtensions.has(ext) ? [fullPath] : [];
    }));
    return files.flat();
  } catch {
    return [];
  }
}

function scoreLegacyMatch(requestedStem, filePath) {
  const fileName = path.basename(filePath);
  const fileStem = normalizeToken(fileName);
  const wanted = normalizeToken(requestedStem);
  if (!wanted || !fileStem) return 0;
  if (fileStem === wanted) return 100;
  if (fileStem.includes(wanted) || wanted.includes(fileStem)) return 80;
  const wantedParts = wanted.match(/[a-z0-9]+/g) || [];
  const hits = wantedParts.filter((part) => part.length > 2 && fileStem.includes(part)).length;
  return hits * 10;
}

/**
 * Serves GET /images/* from Backend/uploads when seed/static paths are used.
 * Lets existing /images/optimized/*.webp URLs work once uploads exist on the API host.
 */
export function createLegacyImageStatic(uploadDirectory) {
  let cachedFiles = null;
  let cachedAt = 0;
  const cacheMs = 30_000;

  async function getUploadImageFiles() {
    const now = Date.now();
    if (cachedFiles && now - cachedAt < cacheMs) return cachedFiles;
    cachedFiles = await listImageFiles(uploadDirectory);
    cachedAt = now;
    return cachedFiles;
  }

  return async function legacyImageStatic(request, response, next) {
    if (request.method !== "GET") return next();
    const requestPath = request.path || "";
    if (!requestPath.startsWith("/images/")) return next();

    const relativePath = requestPath.replace(/^\/images\//, "");
    const directPath = path.resolve(uploadDirectory, relativePath);
    const uploadRoot = path.resolve(uploadDirectory);

    if (directPath.startsWith(uploadRoot)) {
      try {
        const stat = await fs.stat(directPath);
        if (stat.isFile()) {
          return response.sendFile(directPath);
        }
      } catch {
        // fall through to fuzzy match
      }
    }

    const requestedName = path.basename(relativePath);
    const files = await getUploadImageFiles();
    let bestPath = "";
    let bestScore = 0;

    for (const filePath of files) {
      const score = scoreLegacyMatch(requestedName, filePath);
      if (score > bestScore) {
        bestScore = score;
        bestPath = filePath;
      }
    }

    if (bestPath && bestScore >= 20) {
      return response.sendFile(bestPath);
    }

    return next();
  };
}
