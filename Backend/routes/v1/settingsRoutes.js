import { Router } from "express";
import {
  getAdminSettings,
  getPublicAppSettings,
  updateAdminSettings
} from "../../controllers/settingsController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/public", asyncHandler(getPublicAppSettings));
router.get("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("settings", "view")), asyncHandler(getAdminSettings));
router.put("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("settings", "edit")), asyncHandler(updateAdminSettings));

export default router;
