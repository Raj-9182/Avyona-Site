import { Router } from "express";
import { queueAnalyticsEvent, trackAnalyticsEvent } from "../../controllers/analyticsController.js";
import { optionalCustomerAuth } from "../../middlewares/authMiddleware.js";
import { rateLimit } from "../../middlewares/rateLimit.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
const analyticsRateLimit = rateLimit({ windowMs: 60_000, max: 180, keyPrefix: "analytics" });

router.post("/event", analyticsRateLimit, asyncHandler(optionalCustomerAuth), asyncHandler(trackAnalyticsEvent));
router.post("/events", analyticsRateLimit, asyncHandler(optionalCustomerAuth), asyncHandler(queueAnalyticsEvent));

export default router;
