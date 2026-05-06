import { Router } from "express";
import {
  getCurrentCustomer,
  getCustomerCart,
  getCustomerOrders,
  getCustomerWishlist,
  loginCustomer,
  signupCustomer,
  syncCustomerCart,
  syncCustomerWishlist
} from "../../controllers/customerAccountController.js";
import { requireCustomerAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.post("/auth/signup", asyncHandler(signupCustomer));
router.post("/auth/login", asyncHandler(loginCustomer));
router.get("/auth/me", asyncHandler(requireCustomerAuth), asyncHandler(getCurrentCustomer));
router.get("/cart", asyncHandler(requireCustomerAuth), asyncHandler(getCustomerCart));
router.put("/cart", asyncHandler(requireCustomerAuth), asyncHandler(syncCustomerCart));
router.get("/wishlist", asyncHandler(requireCustomerAuth), asyncHandler(getCustomerWishlist));
router.put("/wishlist", asyncHandler(requireCustomerAuth), asyncHandler(syncCustomerWishlist));
router.get("/orders", asyncHandler(requireCustomerAuth), asyncHandler(getCustomerOrders));

export default router;
