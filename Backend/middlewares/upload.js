import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.resolve(process.cwd(), "uploads");
const inventoryUploadDirectory = path.resolve(uploadDirectory, "inventory");
const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

if (!fs.existsSync(inventoryUploadDirectory)) {
  fs.mkdirSync(inventoryUploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDirectory),
  filename: (_request, file, callback) => {
    const safeName = `${Date.now()}-${String(file.originalname || "media")
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")}`;
    callback(null, safeName);
  }
});

const inventoryStorage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, inventoryUploadDirectory),
  filename: (_request, file, callback) => {
    const safeName = `${Date.now()}-${String(file.originalname || "inventory.xlsx")
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")}`;
    callback(null, safeName.endsWith(".xlsx") ? safeName : `${safeName}.xlsx`);
  }
});

function fileFilter(_request, file, callback) {
  if (!allowedImageMimeTypes.has(file.mimetype)) {
    callback(new Error("Only JPG, PNG, and WebP image uploads are allowed"));
    return;
  }
  callback(null, true);
}

function mediaFileFilter(_request, file, callback) {
  if (file.mimetype.startsWith("image/") && !allowedImageMimeTypes.has(file.mimetype)) {
    callback(new Error("Only JPG, PNG, and WebP image uploads are allowed"));
    return;
  }

  if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/")) {
    callback(new Error("Only image and video uploads are allowed"));
    return;
  }
  callback(null, true);
}

function inventoryFileFilter(_request, file, callback) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (extension !== ".xlsx" || file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    callback(new Error("Only .xlsx inventory files are allowed"));
    return;
  }

  callback(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

export const uploadMedia = multer({
  storage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024
  }
});

export const uploadInventory = multer({
  storage: inventoryStorage,
  fileFilter: inventoryFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});
