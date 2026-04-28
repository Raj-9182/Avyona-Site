import fs from "fs/promises";
import path from "path";
import { query } from "../config/db.js";

const imageMetadataPath = path.resolve(process.cwd(), "data", "website-image-assets.json");
const projectRoot = path.resolve(process.cwd(), "..");
const staticImagesRoot = path.resolve(projectRoot, "frontend", "public", "images");
const uploadsRoot = path.resolve(process.cwd(), "uploads");
const sourceRoots = [
  path.resolve(projectRoot, "frontend", "src"),
  path.resolve(projectRoot, "dashboard", "src"),
  path.resolve(projectRoot, "shared")
];

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);
const sourceExtensions = new Set([".js", ".jsx", ".css", ".json"]);

function isDatabaseUnavailable(error) {
  return ["ECONNREFUSED", "ER_NO_SUCH_TABLE", "ER_BAD_DB_ERROR", "ER_BAD_FIELD_ERROR", "PROTOCOL_CONNECTION_LOST"].includes(error?.code);
}

function normalizeAssetUrl(value) {
  return String(value || "").replace(/\\/g, "/");
}

function createAssetId(url) {
  return encodeURIComponent(normalizeAssetUrl(url)).replace(/%/g, "_");
}

function getAssetNameFromUrl(url) {
  return normalizeAssetUrl(url).split("/").pop() || "website-image";
}

async function readImageMetadata() {
  try {
    const raw = await fs.readFile(imageMetadataPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writeImageMetadata(metadata) {
  await fs.mkdir(path.dirname(imageMetadataPath), { recursive: true });
  await fs.writeFile(imageMetadataPath, JSON.stringify(metadata, null, 2));
}

async function listFilesRecursive(rootDirectory) {
  try {
    const entries = await fs.readdir(rootDirectory, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(rootDirectory, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(fullPath);
      return [fullPath];
    }));
    return files.flat();
  } catch {
    return [];
  }
}

async function getImageReferences() {
  const references = new Map();
  const sourceFiles = (await Promise.all(sourceRoots.map(listFilesRecursive))).flat()
    .filter((filePath) => sourceExtensions.has(path.extname(filePath).toLowerCase()));

  await Promise.all(sourceFiles.map(async (filePath) => {
    let content = "";
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      return;
    }

    const matches = content.matchAll(/["'`](\/(?:images|uploads)\/[^"'`)]+\.(?:png|jpe?g|webp|gif|avif|svg))["'`]/gi);
    for (const match of matches) {
      const url = normalizeAssetUrl(match[1]);
      const relativeSource = normalizeAssetUrl(path.relative(projectRoot, filePath));
      const current = references.get(url) || new Set();
      current.add(relativeSource);
      references.set(url, current);
    }
  }));

  return references;
}

async function getStaticImageAssets(references, metadata) {
  const imageFiles = (await listFilesRecursive(staticImagesRoot))
    .filter((filePath) => imageExtensions.has(path.extname(filePath).toLowerCase()));

  return imageFiles.map((filePath) => {
    const relativePath = normalizeAssetUrl(path.relative(staticImagesRoot, filePath));
    const url = `/images/${relativePath}`;
    const saved = metadata[url] || {};
    const linkedPaths = [...(references.get(url) || references.get(url.replace("/images/", "/images/optimized/")) || [])];

    return {
      id: createAssetId(url),
      source: "frontend",
      assetType: "image",
      url,
      filename: getAssetNameFromUrl(url),
      originalName: getAssetNameFromUrl(url),
      mimeType: `image/${path.extname(filePath).slice(1).replace("jpg", "jpeg")}`,
      sizeBytes: 0,
      altText: saved.altText || "",
      sectionPath: saved.sectionPath || linkedPaths.join(", ") || "frontend/public/images",
      linkedPaths,
      status: saved.status || "active",
      isDeleted: Boolean(saved.isDeleted),
      createdAt: saved.createdAt || null,
      updatedAt: saved.updatedAt || null,
      protectedFile: true
    };
  }).filter((asset) => !asset.isDeleted);
}

async function getUploadedImageAssets(references, metadata) {
  let databaseRows = [];

  try {
    databaseRows = await query(
      `SELECT
        id,
        original_name AS originalName,
        filename,
        mime_type AS mimeType,
        asset_type AS assetType,
        url,
        alt_text AS altText,
        section_path AS sectionPath,
        status,
        is_deleted AS isDeleted,
        size_bytes AS sizeBytes,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM uploaded_assets
       WHERE asset_type = 'image' AND is_deleted = 0
       ORDER BY created_at DESC`
    );
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
  }

  if (databaseRows.length) {
    return databaseRows.map((row) => {
      const url = normalizeAssetUrl(row.url);
      const saved = metadata[url] || {};
      const linkedPaths = [...(references.get(url) || [])];

      return {
        ...row,
        id: String(row.id),
        source: "uploaded",
        url,
        altText: saved.altText ?? row.altText ?? "",
        sectionPath: saved.sectionPath ?? row.sectionPath ?? linkedPaths.join(", ") ?? "Uploaded asset",
        linkedPaths,
        status: saved.status ?? row.status ?? "active",
        isDeleted: Boolean(saved.isDeleted ?? row.isDeleted),
        protectedFile: false
      };
    }).filter((asset) => !asset.isDeleted);
  }

  const uploadedFiles = (await listFilesRecursive(uploadsRoot))
    .filter((filePath) => imageExtensions.has(path.extname(filePath).toLowerCase()));

  return uploadedFiles.map((filePath) => {
    const filename = path.basename(filePath);
    const url = `/uploads/${filename}`;
    const saved = metadata[url] || {};
    const linkedPaths = [...(references.get(url) || [])];

    return {
      id: createAssetId(url),
      source: "uploaded",
      assetType: "image",
      url,
      filename,
      originalName: filename,
      mimeType: `image/${path.extname(filePath).slice(1).replace("jpg", "jpeg")}`,
      sizeBytes: 0,
      altText: saved.altText || "",
      sectionPath: saved.sectionPath || linkedPaths.join(", ") || "Uploaded asset",
      linkedPaths,
      status: saved.status || "active",
      isDeleted: Boolean(saved.isDeleted),
      createdAt: saved.createdAt || null,
      updatedAt: saved.updatedAt || null,
      protectedFile: false
    };
  }).filter((asset) => !asset.isDeleted);
}

async function trackUploadedAsset(request, assetType) {
  try {
    await query(
      `INSERT INTO uploaded_assets
        (original_name, filename, mime_type, asset_type, url, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        request.file.originalname,
        request.file.filename,
        request.file.mimetype,
        assetType,
        `/uploads/${request.file.filename}`,
        request.file.size,
        request.admin?.id || null
      ]
    );
  } catch {
    // Uploads should still succeed when asset logging is unavailable.
  }
}

export async function listImageAssets(_request, response) {
  const metadata = await readImageMetadata();
  const references = await getImageReferences();
  const [uploadedAssets, staticAssets] = await Promise.all([
    getUploadedImageAssets(references, metadata),
    getStaticImageAssets(references, metadata)
  ]);
  const assetsByUrl = new Map();

  [...uploadedAssets, ...staticAssets].forEach((asset) => {
    assetsByUrl.set(asset.url, asset);
  });

  response.json({
    success: true,
    count: assetsByUrl.size,
    data: [...assetsByUrl.values()].sort((left, right) => {
      if (left.source !== right.source) return left.source === "uploaded" ? -1 : 1;
      return String(left.url).localeCompare(String(right.url));
    })
  });
}

export async function updateImageAsset(request, response) {
  const url = normalizeAssetUrl(request.body?.url);
  if (!url) {
    response.status(400).json({
      success: false,
      message: "Image URL is required"
    });
    return;
  }

  const metadata = await readImageMetadata();
  metadata[url] = {
    ...(metadata[url] || {}),
    altText: String(request.body?.altText || ""),
    sectionPath: String(request.body?.sectionPath || ""),
    status: request.body?.status === "inactive" ? "inactive" : "active",
    isDeleted: false,
    updatedAt: new Date().toISOString()
  };

  await writeImageMetadata(metadata);

  try {
    await query(
      `UPDATE uploaded_assets
       SET alt_text = ?, section_path = ?, status = ?, is_deleted = 0
       WHERE url = ?`,
      [metadata[url].altText, metadata[url].sectionPath, metadata[url].status, url]
    );
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
  }

  response.json({
    success: true,
    data: {
      url,
      ...metadata[url]
    }
  });
}

export async function deleteImageAsset(request, response) {
  const url = normalizeAssetUrl(request.body?.url);
  if (!url) {
    response.status(400).json({
      success: false,
      message: "Image URL is required"
    });
    return;
  }

  const metadata = await readImageMetadata();
  metadata[url] = {
    ...(metadata[url] || {}),
    status: "inactive",
    isDeleted: true,
    updatedAt: new Date().toISOString()
  };

  await writeImageMetadata(metadata);

  try {
    await query("UPDATE uploaded_assets SET status = 'inactive', is_deleted = 1 WHERE url = ?", [url]);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
  }

  if (url.startsWith("/uploads/")) {
    const uploadPath = path.resolve(uploadsRoot, path.basename(url));
    if (uploadPath.startsWith(uploadsRoot)) {
      await fs.rm(uploadPath, { force: true }).catch(() => {});
    }
  }

  response.json({
    success: true,
    message: "Image removed from website image manager"
  });
}

export async function uploadImage(request, response) {
  if (!request.file) {
    response.status(400).json({
      success: false,
      message: "Image file is required"
    });
    return;
  }

  await trackUploadedAsset(request, "image");

  response.status(201).json({
    success: true,
    data: {
      filename: request.file.filename,
      originalName: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size,
      url: `/uploads/${request.file.filename}`
    }
  });
}

export async function uploadMedia(request, response) {
  if (!request.file) {
    response.status(400).json({
      success: false,
      message: "Media file is required"
    });
    return;
  }

  const assetType = request.file.mimetype.startsWith("video/") ? "video" : "image";
  await trackUploadedAsset(request, assetType);

  response.status(201).json({
    success: true,
    data: {
      filename: request.file.filename,
      originalName: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size,
      mediaType: assetType,
      url: `/uploads/${request.file.filename}`
    }
  });
}
