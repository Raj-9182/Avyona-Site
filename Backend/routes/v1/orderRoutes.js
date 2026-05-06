import { Router } from "express";
import { createOrder, listOrders, updateOrderStatus } from "../../controllers/orderController.js";
import { optionalCustomerAuth, requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("orders", "view")), asyncHandler(listOrders));
router.post("/", asyncHandler(optionalCustomerAuth), asyncHandler(createOrder));
router.patch("/:id/status", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("orders", "edit")), asyncHandler(updateOrderStatus));

export default router;
