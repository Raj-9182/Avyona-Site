import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct
} from "../../controllers/productController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listProducts));
router.get("/:id", asyncHandler(getProductById));
router.post("/", asyncHandler(requireAdminAuth), asyncHandler(createProduct));
router.patch("/:id", asyncHandler(requireAdminAuth), asyncHandler(updateProduct));
router.delete("/:id", asyncHandler(requireAdminAuth), asyncHandler(deleteProduct));

export default router;
