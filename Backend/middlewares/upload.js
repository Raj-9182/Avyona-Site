import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadDirectory),
  filename: (_request, file, callback) => {
    const safeName = `${Date.now()}-${String(file.originalname || "image")
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")}`;
    callback(null, safeName);
  }
});

function fileFilter(_request, file, callback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Only image uploads are allowed"));
    return;
  }
  callback(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
