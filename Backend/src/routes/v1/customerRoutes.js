import { Router } from "express";
import { getCustomerDetails, listCustomers } from "../../controllers/customerController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(requireAdminAuth), asyncHandler(listCustomers));
router.get("/:id", asyncHandler(requireAdminAuth), asyncHandler(getCustomerDetails));

export default router;
