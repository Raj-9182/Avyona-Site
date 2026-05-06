import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  getCategoryTree,
  listCategories,
  updateCategory
} from "../../controllers/categoryController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.post("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("categories", "create")), asyncHandler(createCategory));
router.get("/", asyncHandler(listCategories));
router.get("/tree", asyncHandler(getCategoryTree));
router.get("/:id", asyncHandler(getCategoryById));
router.put("/:id", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("categories", "edit")), asyncHandler(updateCategory));
router.delete("/:id", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("categories", "delete")), asyncHandler(deleteCategory));

export default router;
