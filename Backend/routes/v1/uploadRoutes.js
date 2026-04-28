import { Router } from "express";
import { deleteImageAsset, listImageAssets, updateImageAsset, uploadImage, uploadMedia } from "../../controllers/uploadController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { upload, uploadMedia as uploadMediaMiddleware } from "../../middlewares/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/images", asyncHandler(requireAdminAuth), asyncHandler(listImageAssets));
router.patch("/images", asyncHandler(requireAdminAuth), asyncHandler(updateImageAsset));
router.delete("/images", asyncHandler(requireAdminAuth), asyncHandler(deleteImageAsset));
router.post("/image", asyncHandler(requireAdminAuth), upload.single("image"), asyncHandler(uploadImage));
router.post("/media", asyncHandler(requireAdminAuth), uploadMediaMiddleware.single("media"), asyncHandler(uploadMedia));

export default router;
