import { Router } from "express";
import { bootstrapAdmin, getCurrentAdmin, loginAdmin } from "../../controllers/adminAuthController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.post("/bootstrap", asyncHandler(bootstrapAdmin));
router.post("/login", asyncHandler(loginAdmin));
router.get("/me", asyncHandler(requireAdminAuth), asyncHandler(getCurrentAdmin));

export default router;
