import { Router } from "express";
import {
  createVariantGroup,
  listVariantGroups
} from "../../controllers/variantGroupController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(requireAdminAuth), asyncHandler(listVariantGroups));
router.post("/", asyncHandler(requireAdminAuth), asyncHandler(createVariantGroup));

export default router;
