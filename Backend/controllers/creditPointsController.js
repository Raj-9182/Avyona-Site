import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { assertWalletActive, checkEarningVelocity } from "../services/creditPointsSecurity.js";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function generateReferralCode(customerId) {
  const prefix = "AVY";
  const padded = String(customerId).padStart(5, "0");
  // append a short checksum digit to make codes less guessable
  const check  = (customerId * 7 + 13) % 10;
  return `${prefix}${padded}${check}`;
}

async function getSettings() {
  const rows = await query("SELECT * FROM credit_settings LIMIT 1");
  if (rows[0]) return rows[0];
  // fallback if settings row has not been seeded yet
  return {
    points_per_rupee: 10,
    min_redeem_points: 100,
    max_redeem_percent: 20,
    expiry_days: 365,
    expiry_warning_days: 30,
    referrer_bonus_points: 300,
    referee_bonus_points: 500
  };
}

async function ensureWallet(customerId) {
  await query(
    `INSERT IGNORE INTO customer_credit_wallets (customer_id) VALUES (?)`,
    [customerId]
  );
  const rows = await query(
    `SELECT * FROM customer_credit_wallets WHERE customer_id = ? LIMIT 1`,
    [customerId]
  );
  return rows[0];
}

async function ensureReferralCode(customerId) {
  const existing = await query(
    "SELECT * FROM customer_referral_codes WHERE customer_id = ? LIMIT 1",
    [customerId]
  );
  if (existing[0]) return existing[0];

  const code = generateReferralCode(customerId);
  await query(
    `INSERT INTO customer_referral_codes (customer_id, referral_code) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE referral_code = referral_code`,
    [customerId, code]
  );
  const rows = await query(
    "SELECT * FROM customer_referral_codes WHERE customer_id = ? LIMIT 1",
    [customerId]
  );
  return rows[0];
}

/* ─── GET /customer/credits/wallet ───────────────────────────────────────── */

export async function getWallet(request, response) {
  const customerId = request.customer.id;
  const settings   = await getSettings();
  const wallet     = await ensureWallet(customerId);

  // Find the earliest upcoming expiry from active transactions
  const expiryRows = await query(
    `SELECT MIN(expiry_date) AS next_expiry,
            SUM(CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) AND status = 'active' THEN points ELSE 0 END) AS expiring_soon_points
     FROM credit_transactions
     WHERE customer_id = ? AND status = 'active' AND expiry_date IS NOT NULL AND expiry_date > CURDATE()`,
    [settings.expiry_warning_days, customerId]
  );

  const nextExpiry          = expiryRows[0]?.next_expiry || null;
  const expiringSoonPoints  = Number(expiryRows[0]?.expiring_soon_points || 0);
  const cashbackValue       = Math.floor(wallet.available_points / settings.points_per_rupee);

  response.json({
    success: true,
    data: {
      totalPoints:          wallet.total_points,
      availablePoints:      wallet.available_points,
      usedPoints:           wallet.used_points,
      expiredPoints:        wallet.expired_points,
      cashbackValue,
      isBlocked:            Boolean(wallet.is_blocked),
      nextExpiry,
      expiringSoonPoints,
      conversionRate:       `${settings.points_per_rupee} pts = ₹1`,
      pointsPerRupee:       Number(settings.points_per_rupee),
      minRedeemPoints:      Number(settings.min_redeem_points),
      maxRedeemPercent:     Number(settings.max_redeem_percent),
      expiryDays:           settings.expiry_days,
      expiryWarningDays:    settings.expiry_warning_days
    }
  });
}

/* ─── GET /customer/credits/transactions ─────────────────────────────────── */

export async function getTransactions(request, response) {
  const customerId = request.customer.id;
  const page   = Math.max(1, Number(request.query.page) || 1);
  const limit  = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
  const offset = (page - 1) * limit;
  const type   = request.query.type   || null;
  const status = request.query.status || null;

  const conditions = ["customer_id = ?"];
  const params     = [customerId];

  if (type) {
    const allowed = ["signup_bonus", "referral_bonus", "purchase_cashback", "review_reward", "milestone_reward", "manual_adjustment", "redemption", "expiry"];
    if (!allowed.includes(type)) throw new ApiError(400, "Invalid transaction type filter.");
    conditions.push("transaction_type = ?");
    params.push(type);
  }

  if (status) {
    const allowed = ["active", "used", "expired", "pending"];
    if (!allowed.includes(status)) throw new ApiError(400, "Invalid status filter.");
    conditions.push("status = ?");
    params.push(status);
  }

  const where = conditions.join(" AND ");

  const [countRows, rows] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM credit_transactions WHERE ${where}`, params),
    query(
      `SELECT id, transaction_type AS type, points, cashback_value AS cashbackValue,
              reference_id AS referenceId, reference_type AS referenceType,
              note, status, expiry_date AS expiryDate, created_at AS date
       FROM credit_transactions
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
  ]);

  const total = Number(countRows[0]?.total || 0);

  response.json({
    success: true,
    data: {
      transactions: rows.map((r) => ({
        ...r,
        cashbackValue: Number(r.cashbackValue),
        points:        Number(r.points),
        isDebit:       r.points < 0
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}

/* ─── POST /customer/credits/apply ───────────────────────────────────────── */
// Validates and returns the discount breakdown. The actual deduction
// is committed by the order controller when the order is confirmed.

export async function applyPoints(request, response) {
  const customerId  = request.customer.id;
  const ipAddress   = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() || request.ip || null;
  const { points: requestedPoints, orderSubtotal } = request.body;

  if (!requestedPoints || Number(requestedPoints) <= 0) {
    throw new ApiError(400, "Points to apply must be greater than zero.");
  }
  if (!orderSubtotal || Number(orderSubtotal) <= 0) {
    throw new ApiError(400, "Order subtotal is required.");
  }

  // Security: wallet must be active (not blocked)
  await assertWalletActive(customerId, ipAddress);

  const pts      = Math.floor(Number(requestedPoints));
  const subtotal = Number(orderSubtotal);
  const settings = await getSettings();
  const wallet   = await ensureWallet(customerId);

  if (wallet.available_points < settings.min_redeem_points) {
    throw new ApiError(400, `You need at least ${settings.min_redeem_points} points to redeem. You have ${wallet.available_points}.`);
  }

  if (pts > wallet.available_points) {
    throw new ApiError(400, `You only have ${wallet.available_points} available points.`);
  }

  // Maximum rupee discount = max_redeem_percent % of order subtotal
  const maxDiscountRupees = Math.floor(subtotal * (settings.max_redeem_percent / 100));
  const maxPointsAllowed  = maxDiscountRupees * settings.points_per_rupee;

  // Cap at whichever limit is lower
  const pointsApplied    = Math.min(pts, maxPointsAllowed, wallet.available_points);
  const discountRupees   = Math.floor(pointsApplied / settings.points_per_rupee);
  const remainingPoints  = wallet.available_points - pointsApplied;
  const newTotal         = Math.max(0, subtotal - discountRupees);

  response.json({
    success: true,
    data: {
      pointsApplied,
      discountRupees,
      remainingPoints,
      newTotal,
      maxPointsAllowed,
      maxDiscountRupees,
      conversionRate: settings.points_per_rupee
    }
  });
}

/* ─── GET /customer/credits/referral ─────────────────────────────────────── */

export async function getReferralCode(request, response) {
  const customerId = request.customer.id;
  const settings   = await getSettings();
  const referral   = await ensureReferralCode(customerId);

  // List of customers referred by this customer
  const referred = await query(
    `SELECT c.full_name AS name, c.email, c.created_at AS joinedAt,
            (SELECT COUNT(*) FROM orders WHERE customer_id = c.id AND status NOT IN ('cancelled', 'failed')) AS orderCount
     FROM customer_referral_codes ref
     JOIN customers c ON c.id = ref.customer_id
     WHERE ref.referred_by_code = ?
     ORDER BY c.created_at DESC
     LIMIT 20`,
    [referral.referral_code]
  );

  response.json({
    success: true,
    data: {
      referralCode:          referral.referral_code,
      totalReferrals:        referral.total_referrals,
      successfulReferrals:   referral.successful_referrals,
      pointsEarned:          referral.points_earned,
      cashbackEarned:        Math.floor(referral.points_earned / settings.points_per_rupee),
      referrerBonusPoints:   settings.referrer_bonus_points,
      refereeBonusPoints:    settings.referee_bonus_points,
      referredCustomers:     referred.map((r) => ({
        name:        r.name,
        email:       r.email,
        joinedAt:    r.joinedAt,
        orderCount:  Number(r.orderCount),
        isConverted: Number(r.orderCount) > 0
      }))
    }
  });
}
