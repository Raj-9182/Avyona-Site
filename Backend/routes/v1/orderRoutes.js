import { Router } from "express";
import { createOrder, downloadOrderInvoice, listOrders, previewAdminInvoice, trackOrder, updateOrderStatus } from "../../controllers/orderController.js";
import { optionalAnyAuth, optionalCustomerAuth, requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("orders", "view")), asyncHandler(listOrders));
router.post("/", asyncHandler(optionalCustomerAuth), asyncHandler(createOrder));
router.post("/track", asyncHandler(trackOrder));
router.get("/invoice-preview", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("orders", "view")), asyncHandler(previewAdminInvoice));
router.get("/:orderNumber/invoice", asyncHandler(optionalAnyAuth), asyncHandler(downloadOrderInvoice));
router.patch("/:id/status", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("orders", "edit")), asyncHandler(updateOrderStatus));

export default router;
