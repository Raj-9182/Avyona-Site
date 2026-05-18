import { Router } from "express";
import {
  getCreditSummary,
  listRewardRules,
  createRewardRule,
  updateRewardRule,
  toggleRuleStatus,
  deleteRewardRule,
  getConversionSettings,
  updateConversionSettings,
  listCustomerWallets,
  getCustomerWalletDetails,
  adjustCustomerPoints,
  setWalletBlockedStatus,
  resetCustomerWallet,
  listAdminTransactions,
  listFraudLogs,
  markFraudLogReviewed,
  triggerExpiryJob,
  listUpcomingExpirations
} from "../../controllers/adminCreditPointsController.js";
import { requireAdminAuth } from "../../middlewares/authMiddleware.js";
import { requireAdminPermission } from "../../utils/accessControl.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

// All admin credit routes require admin JWT
router.use(asyncHandler(requireAdminAuth));

/* ── Summary ─────────────────────────────────────────────────────────────── */

// GET /admin/credits/summary
router.get(
  "/summary",
  asyncHandler(requireAdminPermission("credit_points", "view")),
  asyncHandler(getCreditSummary)
);

/* ── Reward Rules ────────────────────────────────────────────────────────── */

// GET  /admin/credits/rules               — list all rules
// POST /admin/credits/rules               — create new rule
router
  .route("/rules")
  .get(
    asyncHandler(requireAdminPermission("credit_points", "view")),
    asyncHandler(listRewardRules)
  )
  .post(
    asyncHandler(requireAdminPermission("credit_points", "create")),
    asyncHandler(createRewardRule)
  );

// PUT    /admin/credits/rules/:id         — full update
// DELETE /admin/credits/rules/:id         — delete (non-default only)
router
  .route("/rules/:id")
  .put(
    asyncHandler(requireAdminPermission("credit_points", "edit")),
    asyncHandler(updateRewardRule)
  )
  .delete(
    asyncHandler(requireAdminPermission("credit_points", "delete")),
    asyncHandler(deleteRewardRule)
  );

// PATCH /admin/credits/rules/:id/status   — enable / disable
router.patch(
  "/rules/:id/status",
  asyncHandler(requireAdminPermission("credit_points", "edit")),
  asyncHandler(toggleRuleStatus)
);

/* ── Conversion Settings ─────────────────────────────────────────────────── */

// GET /admin/credits/settings
// PUT /admin/credits/settings
router
  .route("/settings")
  .get(
    asyncHandler(requireAdminPermission("credit_points", "view")),
    asyncHandler(getConversionSettings)
  )
  .put(
    asyncHandler(requireAdminPermission("credit_points", "edit")),
    asyncHandler(updateConversionSettings)
  );

/* ── Customer Wallets ────────────────────────────────────────────────────── */

// GET  /admin/credits/wallets                        — all wallets (paginated)
//      ?search=&page=&limit=&blocked=true|false
router.get(
  "/wallets",
  asyncHandler(requireAdminPermission("credit_points", "view")),
  asyncHandler(listCustomerWallets)
);

router.get(
  "/wallets/:customerId",
  asyncHandler(requireAdminPermission("credit_points", "view")),
  asyncHandler(getCustomerWalletDetails)
);

// POST /admin/credits/wallets/:customerId/adjust     — manual point adjustment
//      body: { points, reason, expiryDays? }
router.post(
  "/wallets/:customerId/adjust",
  asyncHandler(requireAdminPermission("credit_points", "edit")),
  asyncHandler(adjustCustomerPoints)
);

router.patch(
  "/wallets/:customerId/block",
  asyncHandler(requireAdminPermission("credit_points", "edit")),
  asyncHandler(setWalletBlockedStatus)
);

router.post(
  "/wallets/:customerId/reset",
  asyncHandler(requireAdminPermission("credit_points", "edit")),
  asyncHandler(resetCustomerWallet)
);

/* ── Transactions (all customers) ────────────────────────────────────────── */

// GET /admin/credits/transactions
//     ?search=&type=&status=&customerId=&dateFrom=&dateTo=&page=&limit=
router.get(
  "/transactions",
  asyncHandler(requireAdminPermission("credit_points", "view")),
  asyncHandler(listAdminTransactions)
);

/* ── Expiry Job ──────────────────────────────────────────────────────────── */

// POST /admin/credits/expiry/run      — manually trigger expiry processing
router.post(
  "/expiry/run",
  asyncHandler(requireAdminPermission("credit_points", "edit")),
  asyncHandler(triggerExpiryJob)
);

// GET /admin/credits/expiry/upcoming  — preview upcoming expirations
//     ?days=30  (default 30, max 365)
router.get(
  "/expiry/upcoming",
  asyncHandler(requireAdminPermission("credit_points", "view")),
  asyncHandler(listUpcomingExpirations)
);

/* ── Fraud Logs ──────────────────────────────────────────────────────────── */

// GET   /admin/credits/fraud-logs
//       ?search=&violationType=&reviewed=true|false&customerId=&dateFrom=&dateTo=&page=&limit=
router.get(
  "/fraud-logs",
  asyncHandler(requireAdminPermission("credit_points", "view")),
  asyncHandler(listFraudLogs)
);

// PATCH /admin/credits/fraud-logs/:id/review  — mark a violation as reviewed
router.patch(
  "/fraud-logs/:id/review",
  asyncHandler(requireAdminPermission("credit_points", "edit")),
  asyncHandler(markFraudLogReviewed)
);

export default router;
