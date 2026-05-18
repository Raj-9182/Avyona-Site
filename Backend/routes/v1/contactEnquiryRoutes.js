import { Router } from "express";
import {
  createContactEnquiry,
  getContactEnquiry,
  listContactEnquiries,
  updateContactEnquiryStatus
} from "../../controllers/contactEnquiryController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAdminPermission } from "../../utils/accessControl.js";

const router = Router();

router.post("/", asyncHandler(createContactEnquiry));
router.get("/", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("contact_enquiries", "view")), asyncHandler(listContactEnquiries));
router.get("/:id", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("contact_enquiries", "view")), asyncHandler(getContactEnquiry));
router.patch("/:id/status", asyncHandler(requireAdminAuth), asyncHandler(requireAdminPermission("contact_enquiries", "edit")), asyncHandler(updateContactEnquiryStatus));

export default router;
