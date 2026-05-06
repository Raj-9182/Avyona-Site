import { Router } from "express";
import { deleteImageAsset, listImageAssets, updateImageAsset, uploadImage, uploadMedia } from "../../controllers/uploadController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { upload, uploadMedia as uploadMediaMiddleware } from "../../middlewares/upload.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/images", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("homepage", "view")), asyncHandler(listImageAssets));
router.patch("/images", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("homepage", "edit")), asyncHandler(updateImageAsset));
router.delete("/images", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("homepage", "delete")), asyncHandler(deleteImageAsset));
router.post("/image", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("homepage", "create")), upload.single("image"), asyncHandler(uploadImage));
router.post("/media", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("homepage", "create")), uploadMediaMiddleware.single("media"), asyncHandler(uploadMedia));

export default router;
