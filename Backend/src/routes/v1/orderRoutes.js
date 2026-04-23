import { Router } from "express";
import { listOrders, updateOrderStatus } from "../../controllers/orderController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(requireAdminAuth), asyncHandler(listOrders));
router.patch("/:id/status", asyncHandler(requireAdminAuth), asyncHandler(updateOrderStatus));

export default router;
