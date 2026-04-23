import { Router } from "express";
import { uploadImage } from "../../controllers/uploadController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { upload } from "../../middlewares/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.post("/image", asyncHandler(requireAdminAuth), upload.single("image"), asyncHandler(uploadImage));

export default router;
