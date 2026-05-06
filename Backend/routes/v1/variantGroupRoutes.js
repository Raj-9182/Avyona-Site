import { Router } from "express";
import {
  createVariantGroup,
  deleteVariantGroup,
  updateVariantGroup,
  listVariantGroups
} from "../../controllers/variantGroupController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("variations", "view")), asyncHandler(listVariantGroups));
router.post("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("variations", "create")), asyncHandler(createVariantGroup));
router.patch("/:groupId", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("variations", "edit")), asyncHandler(updateVariantGroup));
router.put("/:groupId", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("variations", "edit")), asyncHandler(updateVariantGroup));
router.delete("/:groupId", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("variations", "delete")), asyncHandler(deleteVariantGroup));

export default router;
