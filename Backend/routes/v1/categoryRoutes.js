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
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.post("/", asyncHandler(requireAdminAuth), asyncHandler(createCategory));
router.get("/", asyncHandler(listCategories));
router.get("/tree", asyncHandler(getCategoryTree));
router.get("/:id", asyncHandler(getCategoryById));
router.put("/:id", asyncHandler(requireAdminAuth), asyncHandler(updateCategory));
router.delete("/:id", asyncHandler(requireAdminAuth), asyncHandler(deleteCategory));

export default router;
