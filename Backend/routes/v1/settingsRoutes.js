import { Router } from "express";
import {
  getAdminBrowseCategoriesSettings,
  getAdminHomepageSectionSettings,
  getAdminSettings,
  getPublicAppSettings,
  getPublicBrowseCategoriesSettings,
  getPublicHomepageSectionSettings,
  updateAdminHomepageSectionSettings,
  updateAdminBrowseCategoriesSettings,
  updateAdminSettings
} from "../../controllers/settingsController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/public", asyncHandler(getPublicAppSettings));
router.get("/public/homepage/browse-categories", asyncHandler(getPublicBrowseCategoriesSettings));
router.get("/public/homepage/sections/:sectionKey", asyncHandler(getPublicHomepageSectionSettings));
router.get("/homepage/sections/:sectionKey", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("settings", "view")), asyncHandler(getAdminHomepageSectionSettings));
router.put("/homepage/sections/:sectionKey", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("settings", "edit")), asyncHandler(updateAdminHomepageSectionSettings));
router.get("/homepage/browse-categories", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("settings", "view")), asyncHandler(getAdminBrowseCategoriesSettings));
router.put("/homepage/browse-categories", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("settings", "edit")), asyncHandler(updateAdminBrowseCategoriesSettings));
router.get("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("settings", "view")), asyncHandler(getAdminSettings));
router.put("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("settings", "edit")), asyncHandler(updateAdminSettings));

export default router;
