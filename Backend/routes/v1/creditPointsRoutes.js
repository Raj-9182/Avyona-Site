import { Router } from "express";
import {
  getWallet,
  getTransactions,
  applyPoints,
  getReferralCode
} from "../../controllers/creditPointsController.js";
import { requireCustomerAuth } from "../../middlewares/authMiddleware.js";
import { rateLimit } from "../../middlewares/rateLimit.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

// All credit points routes require a logged-in customer
router.use(asyncHandler(requireCustomerAuth));

// GET  /customer/credits/wallet       — wallet summary + cashback value
router.get(
  "/wallet",
  asyncHandler(getWallet)
);

// GET  /customer/credits/transactions — paginated transaction history
//      ?page=1&limit=20&type=redemption&status=active
router.get(
  "/transactions",
  asyncHandler(getTransactions)
);

// POST /customer/credits/apply        — validate & calculate points discount
//      body: { points, orderSubtotal }
router.post(
  "/apply",
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "cp-apply" }),
  asyncHandler(applyPoints)
);

// GET  /customer/credits/referral     — referral code + performance stats
router.get(
  "/referral",
  asyncHandler(getReferralCode)
);

export default router;
