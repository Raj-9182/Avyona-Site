import { Router } from "express";
import {
  getAdminSettings,
  getPublicAppSettings,
  updateAdminSettings
} from "../../controllers/settingsController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/public", asyncHandler(getPublicAppSettings));
router.get("/", asyncHandler(requireAdminAuth), asyncHandler(getAdminSettings));
router.put("/", asyncHandler(requireAdminAuth), asyncHandler(updateAdminSettings));

export default router;
