import { Router } from "express";
import { getDashboardSummary } from "../../controllers/dashboardController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/summary", asyncHandler(requireAdminAuth), asyncHandler(getDashboardSummary));

export default router;
