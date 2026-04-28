import { Router } from "express";
import { createOrder, listOrders, updateOrderStatus } from "../../controllers/orderController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(requireAdminAuth), asyncHandler(listOrders));
router.post("/", asyncHandler(createOrder));
router.patch("/:id/status", asyncHandler(requireAdminAuth), asyncHandler(updateOrderStatus));

export default router;
