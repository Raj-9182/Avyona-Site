import { Router } from "express";
import { getDashboardAnalytics, getDashboardSummary } from "../../controllers/dashboardController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/summary", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("dashboard", "view")), asyncHandler(getDashboardSummary));
router.get("/analytics", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("dashboard", "view")), asyncHandler(getDashboardAnalytics));

export default router;
