import { Router } from "express";
import {
  getCurrentCustomer,
  deleteCustomerAddress,
  getCustomerAddresses,
  getCustomerCart,
  getCustomerOrders,
  getCustomerWishlist,
  loginCustomer,
  requestCustomerPasswordReset,
  saveCustomerAddress,
  signupCustomer,
  syncCustomerCart,
  syncCustomerWishlist,
  updateCurrentCustomer
} from "../../controllers/customerAccountController.js";
import { getMyReviews, submitCustomerReview, uploadCustomerReviewMedia } from "../../controllers/reviewController.js";
import { requireCustomerAuth } from "../../middlewares/authMiddleware.js";
import { rateLimit } from "../../middlewares/rateLimit.js";
import { uploadMedia } from "../../middlewares/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
const customerAuthRateLimit = rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "customer-auth" });
const passwordResetRateLimit = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "customer-password-reset" });

router.post("/auth/signup", customerAuthRateLimit, asyncHandler(signupCustomer));
router.post("/auth/login", customerAuthRateLimit, asyncHandler(loginCustomer));
router.post("/auth/forgot-password", passwordResetRateLimit, asyncHandler(requestCustomerPasswordReset));
router.get("/auth/me", asyncHandler(requireCustomerAuth), asyncHandler(getCurrentCustomer));
router.patch("/profile", asyncHandler(requireCustomerAuth), asyncHandler(updateCurrentCustomer));
router.get("/addresses", asyncHandler(requireCustomerAuth), asyncHandler(getCustomerAddresses));
router.post("/addresses", asyncHandler(requireCustomerAuth), asyncHandler(saveCustomerAddress));
router.put("/addresses/:addressId", asyncHandler(requireCustomerAuth), asyncHandler(saveCustomerAddress));
router.delete("/addresses/:addressId", asyncHandler(requireCustomerAuth), asyncHandler(deleteCustomerAddress));
router.get("/cart", asyncHandler(requireCustomerAuth), asyncHandler(getCustomerCart));
router.put("/cart", asyncHandler(requireCustomerAuth), asyncHandler(syncCustomerCart));
router.get("/wishlist", asyncHandler(requireCustomerAuth), asyncHandler(getCustomerWishlist));
router.put("/wishlist", asyncHandler(requireCustomerAuth), asyncHandler(syncCustomerWishlist));
router.get("/orders", asyncHandler(requireCustomerAuth), asyncHandler(getCustomerOrders));
router.get("/reviews", asyncHandler(requireCustomerAuth), asyncHandler(getMyReviews));
router.post("/reviews", asyncHandler(requireCustomerAuth), asyncHandler(submitCustomerReview));
router.post("/reviews/media", asyncHandler(requireCustomerAuth), uploadMedia.single("media"), asyncHandler(uploadCustomerReviewMedia));

export default router;
