import { Router } from "express";
import {
  createCoupon,
  deleteCoupon,
  getCouponById,
  listCoupons,
  updateCoupon,
  updateCouponStatus
} from "../../controllers/couponController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(listCoupons));
router.get("/:id", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("coupons", "view")), asyncHandler(getCouponById));
router.post("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("coupons", "create")), asyncHandler(createCoupon));
router.put("/:id", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("coupons", "edit")), asyncHandler(updateCoupon));
router.patch("/:id/status", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("coupons", "edit")), asyncHandler(updateCouponStatus));
router.delete("/:id", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("coupons", "delete")), asyncHandler(deleteCoupon));

export default router;
