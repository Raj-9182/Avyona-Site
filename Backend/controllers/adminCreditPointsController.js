import { pool, query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { runExpiryJob, getUpcomingExpirations } from "../services/creditPointsExpiry.js";

/* ─── Allowed enums (validated on write) ─────────────────────────────────── */

const ALLOWED_RULE_TYPES     = ["cashback", "bonus", "campaign", "milestone"];
const ALLOWED_TRIGGER_EVENTS = ["signup", "referral", "purchase", "review", "milestone", "manual_reward", "festival_campaign"];
const ALLOWED_REWARD_TARGETS = ["customer", "referrer", "referee", "both"];
const ALLOWED_RULE_STATUSES  = ["active", "inactive"];
const ALLOWED_TX_TYPES       = ["signup_bonus", "referral_bonus", "purchase_cashback", "review_reward", "milestone_reward", "manual_adjustment", "redemption", "expiry"];
const ALLOWED_TX_STATUSES    = ["active", "used", "expired", "pending"];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function mapRuleRow(row) {
  return {
    id:            row.id,
    ruleName:      row.rule_name,
    ruleType:      row.rule_type,
    triggerEvent:  row.trigger_event,
    rewardPoints:  Number(row.reward_points),
    cashbackValue: Number(row.cashback_value),
    cashbackPercent: row.cashback_percent != null ? Number(row.cashback_percent) : null,
    milestoneOrderCount: row.milestone_order_count != null ? Number(row.milestone_order_count) : null,
    rewardTarget: row.reward_target || "customer",
    priority: Number(row.priority ?? 100),
    maxUsage: row.max_usage != null ? Number(row.max_usage) : null,
    usedCount: Number(row.used_count || 0),
    status:        row.status,
    expiryDate:    row.expiry_date || null,
    minOrderValue: row.min_order_value ? Number(row.min_order_value) : null,
    maxRewardLimit:row.max_reward_limit ? Number(row.max_reward_limit) : null,
    isDefault:     Boolean(row.is_default),
    createdAt:     row.created_at,
    updatedAt:     row.updated_at
  };
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  REWARD RULES                                                              */
/* ══════════════════════════════════════════════════════════════════════════ */

/* GET /admin/credits/rules ─────────────────────────────────────────────── */
export async function listRewardRules(request, response) {
  const { type, status, triggerEvent } = request.query;

  const conditions = [];
  const params     = [];

  if (type) {
    if (!ALLOWED_RULE_TYPES.includes(type)) throw new ApiError(400, "Invalid rule_type filter.");
    conditions.push("rule_type = ?");
    params.push(type);
  }
  if (status) {
    if (!ALLOWED_RULE_STATUSES.includes(status)) throw new ApiError(400, "Invalid status filter.");
    conditions.push("status = ?");
    params.push(status);
  }
  if (triggerEvent) {
    if (!ALLOWED_TRIGGER_EVENTS.includes(triggerEvent)) throw new ApiError(400, "Invalid trigger_event filter.");
    conditions.push("trigger_event = ?");
    params.push(triggerEvent);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows  = await query(`SELECT * FROM reward_rules ${where} ORDER BY priority ASC, is_default DESC, created_at ASC`, params);

  response.json({ success: true, count: rows.length, data: rows.map(mapRuleRow) });
}

/* POST /admin/credits/rules ─────────────────────────────────────────────── */
export async function createRewardRule(request, response) {
  const { ruleName, ruleType, triggerEvent, rewardPoints, cashbackValue, status,
          cashbackPercent, milestoneOrderCount, rewardTarget, priority, maxUsage,
          expiryDate, minOrderValue, maxRewardLimit } = request.body;

  if (!ruleName?.trim())                                throw new ApiError(400, "ruleName is required.");
  if (!ALLOWED_RULE_TYPES.includes(ruleType))           throw new ApiError(400, "Invalid ruleType.");
  if (!ALLOWED_TRIGGER_EVENTS.includes(triggerEvent))   throw new ApiError(400, "Invalid triggerEvent.");
  if (triggerEvent !== "purchase" && (!rewardPoints || Number(rewardPoints) < 1)) {
    throw new ApiError(400, "rewardPoints must be at least 1.");
  }
  if (triggerEvent === "purchase" && (cashbackPercent == null || Number(cashbackPercent) <= 0)) {
    throw new ApiError(400, "cashbackPercent must be greater than 0 for purchase cashback rules.");
  }
  if (triggerEvent === "milestone" && (!milestoneOrderCount || Number(milestoneOrderCount) < 1)) {
    throw new ApiError(400, "milestoneOrderCount must be at least 1 for milestone rules.");
  }
  const target = ALLOWED_REWARD_TARGETS.includes(rewardTarget) ? rewardTarget : "customer";
  if (rewardTarget != null && !ALLOWED_REWARD_TARGETS.includes(rewardTarget)) {
    throw new ApiError(400, "Invalid rewardTarget.");
  }
  if (triggerEvent === "referral" && target === "customer") {
    throw new ApiError(400, "Referral rules must target referrer, referee, or both.");
  }
  if (priority != null && Number(priority) < 0) {
    throw new ApiError(400, "priority must be 0 or higher.");
  }
  if (maxUsage != null && maxUsage !== "" && Number(maxUsage) < 1) {
    throw new ApiError(400, "maxUsage must be at least 1.");
  }

  const pts      = Math.floor(Number(rewardPoints || 0));
  const cashback = cashbackValue != null ? Number(cashbackValue) : pts / 10;
  const st       = ALLOWED_RULE_STATUSES.includes(status) ? status : "active";

  const result = await query(
    `INSERT INTO reward_rules
       (rule_name, rule_type, trigger_event, reward_points, cashback_value, cashback_percent, milestone_order_count,
        reward_target, priority, max_usage, status, expiry_date, min_order_value, max_reward_limit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ruleName.trim(), ruleType, triggerEvent, pts, cashback,
      cashbackPercent != null ? Number(cashbackPercent) : null,
      milestoneOrderCount != null ? Math.floor(Number(milestoneOrderCount)) : null,
      target,
      priority != null && priority !== "" ? Math.floor(Number(priority)) : 100,
      maxUsage != null && maxUsage !== "" ? Math.floor(Number(maxUsage)) : null,
      st,
      expiryDate || null,
      minOrderValue != null ? Number(minOrderValue) : null,
      maxRewardLimit != null ? Math.floor(Number(maxRewardLimit)) : null
    ]
  );

  const [created] = await query("SELECT * FROM reward_rules WHERE id = ? LIMIT 1", [result.insertId]);
  response.status(201).json({ success: true, data: mapRuleRow(created) });
}

/* PUT /admin/credits/rules/:id ─────────────────────────────────────────── */
export async function updateRewardRule(request, response) {
  const ruleId = Number(request.params.id);
  if (!ruleId) throw new ApiError(400, "Invalid rule ID.");

  const existing = await query("SELECT * FROM reward_rules WHERE id = ? LIMIT 1", [ruleId]);
  if (!existing[0]) throw new ApiError(404, "Reward rule not found.");

  const { ruleName, ruleType, triggerEvent, rewardPoints, cashbackValue, cashbackPercent,
          milestoneOrderCount, rewardTarget, priority, maxUsage, status, expiryDate,
          minOrderValue, maxRewardLimit } = request.body;

  const sets   = [];
  const params = [];

  if (ruleName != null)      { sets.push("rule_name = ?");        params.push(String(ruleName).trim()); }
  if (ruleType != null) {
    if (!ALLOWED_RULE_TYPES.includes(ruleType)) throw new ApiError(400, "Invalid ruleType.");
    sets.push("rule_type = ?"); params.push(ruleType);
  }
  if (triggerEvent != null) {
    if (!ALLOWED_TRIGGER_EVENTS.includes(triggerEvent)) throw new ApiError(400, "Invalid triggerEvent.");
    sets.push("trigger_event = ?"); params.push(triggerEvent);
  }
  if (rewardPoints != null)  { sets.push("reward_points = ?");    params.push(Math.floor(Number(rewardPoints))); }
  if (cashbackValue != null) { sets.push("cashback_value = ?");   params.push(Number(cashbackValue)); }
  if (cashbackPercent !== undefined) {
    sets.push("cashback_percent = ?");
    params.push(cashbackPercent != null && cashbackPercent !== "" ? Number(cashbackPercent) : null);
  }
  if (milestoneOrderCount !== undefined) {
    sets.push("milestone_order_count = ?");
    params.push(milestoneOrderCount != null && milestoneOrderCount !== "" ? Math.floor(Number(milestoneOrderCount)) : null);
  }
  if (rewardTarget !== undefined) {
    if (rewardTarget != null && rewardTarget !== "" && !ALLOWED_REWARD_TARGETS.includes(rewardTarget)) throw new ApiError(400, "Invalid rewardTarget.");
    sets.push("reward_target = ?");
    params.push(rewardTarget || "customer");
  }
  if (priority !== undefined) {
    if (priority != null && priority !== "" && Number(priority) < 0) throw new ApiError(400, "priority must be 0 or higher.");
    sets.push("priority = ?");
    params.push(priority != null && priority !== "" ? Math.floor(Number(priority)) : 100);
  }
  if (maxUsage !== undefined) {
    if (maxUsage != null && maxUsage !== "" && Number(maxUsage) < 1) throw new ApiError(400, "maxUsage must be at least 1.");
    sets.push("max_usage = ?");
    params.push(maxUsage != null && maxUsage !== "" ? Math.floor(Number(maxUsage)) : null);
  }
  if (status != null) {
    if (!ALLOWED_RULE_STATUSES.includes(status)) throw new ApiError(400, "Invalid status.");
    sets.push("status = ?"); params.push(status);
  }
  if (expiryDate !== undefined)    { sets.push("expiry_date = ?");      params.push(expiryDate || null); }
  if (minOrderValue !== undefined) { sets.push("min_order_value = ?");  params.push(minOrderValue != null ? Number(minOrderValue) : null); }
  if (maxRewardLimit !== undefined){ sets.push("max_reward_limit = ?"); params.push(maxRewardLimit != null ? Math.floor(Number(maxRewardLimit)) : null); }

  if (!sets.length) throw new ApiError(400, "No fields to update.");

  const nextTrigger = triggerEvent ?? existing[0].trigger_event;
  const nextRewardPoints = rewardPoints !== undefined ? Math.floor(Number(rewardPoints || 0)) : Number(existing[0].reward_points || 0);
  const nextCashbackPercent = cashbackPercent !== undefined
    ? (cashbackPercent != null && cashbackPercent !== "" ? Number(cashbackPercent) : null)
    : (existing[0].cashback_percent != null ? Number(existing[0].cashback_percent) : null);
  const nextMilestoneOrderCount = milestoneOrderCount !== undefined
    ? (milestoneOrderCount != null && milestoneOrderCount !== "" ? Math.floor(Number(milestoneOrderCount)) : null)
    : (existing[0].milestone_order_count != null ? Number(existing[0].milestone_order_count) : null);
  const nextRewardTarget = rewardTarget !== undefined ? (rewardTarget || "customer") : (existing[0].reward_target || "customer");

  if (nextTrigger !== "purchase" && nextRewardPoints < 1) {
    throw new ApiError(400, "rewardPoints must be at least 1.");
  }
  if (nextTrigger === "purchase" && (!nextCashbackPercent || nextCashbackPercent <= 0)) {
    throw new ApiError(400, "cashbackPercent must be greater than 0 for purchase cashback rules.");
  }
  if (nextTrigger === "milestone" && (!nextMilestoneOrderCount || nextMilestoneOrderCount < 1)) {
    throw new ApiError(400, "milestoneOrderCount must be at least 1 for milestone rules.");
  }
  if (nextTrigger === "referral" && nextRewardTarget === "customer") {
    throw new ApiError(400, "Referral rules must target referrer, referee, or both.");
  }

  params.push(ruleId);
  await query(`UPDATE reward_rules SET ${sets.join(", ")} WHERE id = ?`, params);

  const [updated] = await query("SELECT * FROM reward_rules WHERE id = ? LIMIT 1", [ruleId]);
  response.json({ success: true, data: mapRuleRow(updated) });
}

/* PATCH /admin/credits/rules/:id/status ─────────────────────────────────── */
export async function toggleRuleStatus(request, response) {
  const ruleId = Number(request.params.id);
  const { status } = request.body;

  if (!ALLOWED_RULE_STATUSES.includes(status)) throw new ApiError(400, "status must be 'active' or 'inactive'.");

  const existing = await query("SELECT id FROM reward_rules WHERE id = ? LIMIT 1", [ruleId]);
  if (!existing[0]) throw new ApiError(404, "Reward rule not found.");

  await query("UPDATE reward_rules SET status = ? WHERE id = ?", [status, ruleId]);
  response.json({ success: true, message: `Rule ${status}.` });
}

/* DELETE /admin/credits/rules/:id ─────────────────────────────────────────*/
export async function deleteRewardRule(request, response) {
  const ruleId = Number(request.params.id);

  const existing = await query("SELECT id, is_default FROM reward_rules WHERE id = ? LIMIT 1", [ruleId]);
  if (!existing[0]) throw new ApiError(404, "Reward rule not found.");
  if (existing[0].is_default) throw new ApiError(400, "Default system rules cannot be deleted.");

  await query("DELETE FROM reward_rules WHERE id = ?", [ruleId]);
  response.json({ success: true, message: "Reward rule deleted." });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  CONVERSION SETTINGS                                                       */
/* ══════════════════════════════════════════════════════════════════════════ */

/* GET /admin/credits/settings ──────────────────────────────────────────── */
export async function getConversionSettings(_request, response) {
  const rows = await query("SELECT * FROM credit_settings LIMIT 1");
  const s = rows[0] || {};
  response.json({
    success: true,
    data: {
      pointsPerRupee:      Number(s.points_per_rupee      ?? 10),
      minRedeemPoints:     Number(s.min_redeem_points     ?? 100),
      maxRedeemPercent:    Number(s.max_redeem_percent    ?? 20),
      expiryDays:          Number(s.expiry_days           ?? 365),
      expiryWarningDays:   Number(s.expiry_warning_days   ?? 30),
      referrerBonusPoints: Number(s.referrer_bonus_points ?? 0),
      refereeBonusPoints:  Number(s.referee_bonus_points  ?? 0)
    }
  });
}

/* PUT /admin/credits/settings ──────────────────────────────────────────── */
export async function updateConversionSettings(request, response) {
  const {
    pointsPerRupee, minRedeemPoints, maxRedeemPercent,
    expiryDays, expiryWarningDays, referrerBonusPoints, refereeBonusPoints
  } = request.body;

  if (pointsPerRupee     != null && Number(pointsPerRupee) < 1)        throw new ApiError(400, "pointsPerRupee must be at least 1.");
  if (minRedeemPoints    != null && Number(minRedeemPoints) < 1)        throw new ApiError(400, "minRedeemPoints must be at least 1.");
  if (maxRedeemPercent   != null && (Number(maxRedeemPercent) < 1 || Number(maxRedeemPercent) > 100))
    throw new ApiError(400, "maxRedeemPercent must be between 1 and 100.");
  if (expiryDays         != null && Number(expiryDays) < 1)             throw new ApiError(400, "expiryDays must be at least 1.");
  if (expiryWarningDays  != null && Number(expiryWarningDays) < 1)      throw new ApiError(400, "expiryWarningDays must be at least 1.");
  if (referrerBonusPoints!= null && Number(referrerBonusPoints) < 0)    throw new ApiError(400, "referrerBonusPoints cannot be negative.");
  if (refereeBonusPoints != null && Number(refereeBonusPoints) < 0)     throw new ApiError(400, "refereeBonusPoints cannot be negative.");

  await query(
    `INSERT INTO credit_settings (id, points_per_rupee, min_redeem_points, max_redeem_percent,
       expiry_days, expiry_warning_days, referrer_bonus_points, referee_bonus_points)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       points_per_rupee      = COALESCE(?, points_per_rupee),
       min_redeem_points     = COALESCE(?, min_redeem_points),
       max_redeem_percent    = COALESCE(?, max_redeem_percent),
       expiry_days           = COALESCE(?, expiry_days),
       expiry_warning_days   = COALESCE(?, expiry_warning_days),
       referrer_bonus_points = COALESCE(?, referrer_bonus_points),
       referee_bonus_points  = COALESCE(?, referee_bonus_points)`,
    [
      pointsPerRupee ?? 10, minRedeemPoints ?? 100, maxRedeemPercent ?? 20,
      expiryDays ?? 365, expiryWarningDays ?? 30, referrerBonusPoints ?? 0, refereeBonusPoints ?? 0,
      pointsPerRupee   ?? null, minRedeemPoints  ?? null, maxRedeemPercent ?? null,
      expiryDays       ?? null, expiryWarningDays ?? null, referrerBonusPoints ?? null, refereeBonusPoints ?? null
    ]
  );

  const [saved] = await query("SELECT * FROM credit_settings LIMIT 1");
  response.json({
    success: true,
    message: "Credit settings updated.",
    data: {
      pointsPerRupee:      Number(saved.points_per_rupee),
      minRedeemPoints:     Number(saved.min_redeem_points),
      maxRedeemPercent:    Number(saved.max_redeem_percent),
      expiryDays:          Number(saved.expiry_days),
      expiryWarningDays:   Number(saved.expiry_warning_days),
      referrerBonusPoints: Number(saved.referrer_bonus_points),
      refereeBonusPoints:  Number(saved.referee_bonus_points)
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  CUSTOMER WALLETS                                                          */
/* ══════════════════════════════════════════════════════════════════════════ */

/* GET /admin/credits/wallets ─────────────────────────────────────────────── */
export async function listCustomerWallets(request, response) {
  const page      = Math.max(1, Number(request.query.page) || 1);
  const limit     = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const offset    = (page - 1) * limit;
  const search    = request.query.search?.trim() || "";
  const blocked   = request.query.blocked;

  const conditions = [];
  const params     = [];

  if (search) {
    conditions.push("(c.full_name LIKE ? OR c.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (blocked === "true")  { conditions.push("w.is_blocked = 1"); }
  if (blocked === "false") { conditions.push("w.is_blocked = 0"); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const settingsRows = await query("SELECT points_per_rupee FROM credit_settings LIMIT 1");
  const pointsPerRupee = Number(settingsRows[0]?.points_per_rupee || 10);

  const [countRows, rows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total
       FROM customer_credit_wallets w
       JOIN customers c ON c.id = w.customer_id
       ${where}`,
      params
    ),
    query(
      `SELECT
         w.id, w.customer_id AS customerId,
         c.full_name AS customerName, c.email AS customerEmail,
         c.total_orders AS totalOrders,
         w.total_points AS totalPoints, w.available_points AS availablePoints,
         w.used_points AS usedPoints, w.expired_points AS expiredPoints,
         COALESCE(tx.totalCashbackEarned, 0) AS totalCashbackEarned,
         COALESCE(tx.totalRedeemedValue, 0) AS totalRedeemedValue,
         COALESCE(tx.totalExpiredPoints, 0) AS totalExpiredPoints,
         w.is_blocked AS isBlocked,
         GREATEST(w.updated_at, COALESCE(tx.lastTransactionAt, w.updated_at)) AS lastActivity
       FROM customer_credit_wallets w
       JOIN customers c ON c.id = w.customer_id
       LEFT JOIN (
         SELECT
           customer_id,
           SUM(CASE WHEN points > 0 THEN cashback_value ELSE 0 END) AS totalCashbackEarned,
           SUM(CASE WHEN transaction_type = 'redemption' THEN cashback_value ELSE 0 END) AS totalRedeemedValue,
           SUM(CASE WHEN transaction_type = 'expiry' THEN ABS(points) ELSE 0 END) AS totalExpiredPoints,
           MAX(created_at) AS lastTransactionAt
         FROM credit_transactions
         GROUP BY customer_id
       ) tx ON tx.customer_id = w.customer_id
       ${where}
       ORDER BY w.available_points DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
  ]);

  const total = Number(countRows[0]?.total || 0);

  response.json({
    success: true,
    data: rows.map((r) => {
      const { totalExpiredPoints, ...row } = r;
      return {
      ...row,
      totalPoints:     Number(r.totalPoints),
      availablePoints: Number(r.availablePoints),
      usedPoints:      Number(r.usedPoints),
      expiredPoints:   Number(r.expiredPoints),
      totalOrders:      Number(r.totalOrders || 0),
      totalCashbackEarned: Number(r.totalCashbackEarned || 0),
      totalRedeemedValue:  Number(r.totalRedeemedValue || 0),
      totalExpiredValue:   Number((Number(r.totalExpiredPoints || 0) / pointsPerRupee).toFixed(2)),
      isBlocked:       Boolean(r.isBlocked),
      cashbackValue:   Math.floor(Number(r.availablePoints) / 10)
    };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}

/* GET /admin/credits/wallets/:customerId */
export async function getCustomerWalletDetails(request, response) {
  const customerId = Number(request.params.customerId);
  if (!customerId) throw new ApiError(400, "Invalid customer ID.");

  const settingsRows = await query("SELECT points_per_rupee FROM credit_settings LIMIT 1");
  const pointsPerRupee = Number(settingsRows[0]?.points_per_rupee || 10);

  const [walletRows, transactionRows, referralRows, expiryRows] = await Promise.all([
    query(
      `SELECT
         w.id, w.customer_id AS customerId,
         c.full_name AS customerName, c.email AS customerEmail,
         c.total_orders AS totalOrders,
         w.total_points AS totalPoints, w.available_points AS availablePoints,
         w.used_points AS usedPoints, w.expired_points AS expiredPoints,
         COALESCE(tx.totalCashbackEarned, 0) AS totalCashbackEarned,
         COALESCE(tx.totalRedeemedValue, 0) AS totalRedeemedValue,
         COALESCE(tx.totalExpiredPoints, 0) AS totalExpiredPoints,
         w.is_blocked AS isBlocked,
         GREATEST(w.updated_at, COALESCE(tx.lastTransactionAt, w.updated_at)) AS lastActivity
       FROM customer_credit_wallets w
       JOIN customers c ON c.id = w.customer_id
       LEFT JOIN (
         SELECT
           customer_id,
           SUM(CASE WHEN points > 0 THEN cashback_value ELSE 0 END) AS totalCashbackEarned,
           SUM(CASE WHEN transaction_type = 'redemption' THEN cashback_value ELSE 0 END) AS totalRedeemedValue,
           SUM(CASE WHEN transaction_type = 'expiry' THEN ABS(points) ELSE 0 END) AS totalExpiredPoints,
           MAX(created_at) AS lastTransactionAt
         FROM credit_transactions
         WHERE customer_id = ?
         GROUP BY customer_id
       ) tx ON tx.customer_id = w.customer_id
       WHERE w.customer_id = ?
       LIMIT 1`,
      [customerId, customerId]
    ),
    query(
      `SELECT
         id, transaction_type AS type, points, cashback_value AS cashbackValue,
         reference_id AS referenceId, reference_type AS referenceType,
         note, status, expiry_date AS expiryDate, created_at AS date
       FROM credit_transactions
       WHERE customer_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [customerId]
    ),
    query(
      `SELECT
         rc.referral_code AS referralCode,
         rc.referred_by_code AS referredByCode,
         rc.total_referrals AS totalReferrals,
         rc.successful_referrals AS successfulReferrals,
         rc.points_earned AS pointsEarned,
         rc.created_at AS createdAt,
         referrer.customer_id AS referredByCustomerId
       FROM customer_referral_codes rc
       LEFT JOIN customer_referral_codes referrer ON referrer.referral_code = rc.referred_by_code
       WHERE rc.customer_id = ?
       LIMIT 1`,
      [customerId]
    ),
    query(
      `SELECT
         expiry_date AS expiryDate,
         status,
         SUM(points) AS points,
         COUNT(*) AS transactionCount
       FROM credit_transactions
       WHERE customer_id = ?
         AND expiry_date IS NOT NULL
       GROUP BY expiry_date, status
       ORDER BY expiry_date ASC`,
      [customerId]
    )
  ]);

  const wallet = walletRows[0];
  if (!wallet) throw new ApiError(404, "Wallet not found.");

  const { totalExpiredPoints, ...walletData } = wallet;

  response.json({
    success: true,
    data: {
      wallet: {
        ...walletData,
        totalPoints: Number(wallet.totalPoints || 0),
        availablePoints: Number(wallet.availablePoints || 0),
        usedPoints: Number(wallet.usedPoints || 0),
        expiredPoints: Number(wallet.expiredPoints || 0),
        totalOrders: Number(wallet.totalOrders || 0),
        totalCashbackEarned: Number(wallet.totalCashbackEarned || 0),
        totalRedeemedValue: Number(wallet.totalRedeemedValue || 0),
        totalExpiredValue: Number((Number(wallet.totalExpiredPoints || 0) / pointsPerRupee).toFixed(2)),
        isBlocked: Boolean(wallet.isBlocked)
      },
      transactions: transactionRows.map((tx) => ({
        ...tx,
        points: Number(tx.points || 0),
        cashbackValue: Number(tx.cashbackValue || 0),
        isDebit: Number(tx.points || 0) < 0
      })),
      referral: referralRows[0] ? {
        ...referralRows[0],
        totalReferrals: Number(referralRows[0].totalReferrals || 0),
        successfulReferrals: Number(referralRows[0].successfulReferrals || 0),
        pointsEarned: Number(referralRows[0].pointsEarned || 0)
      } : null,
      expiryTimeline: expiryRows.map((row) => ({
        expiryDate: row.expiryDate,
        status: row.status,
        points: Number(row.points || 0),
        value: Number((Number(row.points || 0) / pointsPerRupee).toFixed(2)),
        transactionCount: Number(row.transactionCount || 0)
      }))
    }
  });
}

/* POST /admin/credits/wallets/:customerId/adjust ─────────────────────────── */
export async function adjustCustomerPoints(request, response) {
  const customerId = Number(request.params.customerId);
  if (!customerId) throw new ApiError(400, "Invalid customer ID.");

  const { points, reason, expiryDays } = request.body;
  const pts = Math.trunc(Number(points));

  if (!pts || pts === 0)          throw new ApiError(400, "points must be a non-zero integer.");
  if (!reason?.trim())            throw new ApiError(400, "reason is required for manual adjustments.");

  // Verify customer exists
  const customers = await query("SELECT id FROM customers WHERE id = ? LIMIT 1", [customerId]);
  if (!customers[0]) throw new ApiError(404, "Customer not found.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Ensure wallet exists
    await connection.execute(
      "INSERT IGNORE INTO customer_credit_wallets (customer_id) VALUES (?)",
      [customerId]
    );

    // Read current wallet (lock for update)
    const [walletRows] = await connection.execute(
      "SELECT * FROM customer_credit_wallets WHERE customer_id = ? FOR UPDATE",
      [customerId]
    );
    const wallet = walletRows[0];

    if (wallet.is_blocked) {
      await connection.rollback();
      throw new ApiError(403, "This customer's wallet is blocked. Unblock it before adjusting points.");
    }

    if (pts < 0 && wallet.available_points < Math.abs(pts)) {
      await connection.rollback();
      throw new ApiError(400, `Cannot remove ${Math.abs(pts)} pts — customer only has ${wallet.available_points} available.`);
    }

    // Calculate new wallet totals
    const newAvailable = wallet.available_points + pts;
    const newTotal     = wallet.total_points + (pts > 0 ? pts : 0);
    const newUsed      = pts < 0 ? wallet.used_points + Math.abs(pts) : wallet.used_points;
    const cashback     = Number((Math.abs(pts) / 10).toFixed(2));

    // Update wallet
    await connection.execute(
      `UPDATE customer_credit_wallets
       SET total_points = ?, available_points = ?, used_points = ?
       WHERE customer_id = ?`,
      [newTotal, newAvailable, newUsed, customerId]
    );

    // Compute expiry date
    let expiryDate = null;
    if (pts > 0) {
      const days = Number(expiryDays) || 365;
      const d    = new Date();
      d.setDate(d.getDate() + days);
      expiryDate = d.toISOString().split("T")[0];
    }

    // Insert transaction record
    const [txResult] = await connection.execute(
      `INSERT INTO credit_transactions
         (customer_id, transaction_type, points, cashback_value, note, status, expiry_date)
       VALUES (?, 'manual_adjustment', ?, ?, ?, 'active', ?)`,
      [customerId, pts, cashback, reason.trim(), expiryDate]
    );

    await connection.commit();

    response.status(201).json({
      success: true,
      message: `${pts > 0 ? "Added" : "Removed"} ${Math.abs(pts)} points ${pts > 0 ? "to" : "from"} customer wallet.`,
      data: {
        transactionId:    txResult.insertId,
        customerId,
        pointsAdjusted:   pts,
        newAvailablePoints: newAvailable,
        cashbackValue:    Math.floor(newAvailable / 10)
      }
    });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  TRANSACTIONS (admin view — all customers)                                 */
/* ══════════════════════════════════════════════════════════════════════════ */

/* GET /admin/credits/transactions ──────────────────────────────────────── */
export async function setWalletBlockedStatus(request, response) {
  const customerId = Number(request.params.customerId);
  if (!customerId) throw new ApiError(400, "Invalid customer ID.");

  const isBlocked = Boolean(request.body?.isBlocked);
  const customers = await query("SELECT id FROM customers WHERE id = ? LIMIT 1", [customerId]);
  if (!customers[0]) throw new ApiError(404, "Customer not found.");

  await query("INSERT IGNORE INTO customer_credit_wallets (customer_id) VALUES (?)", [customerId]);
  await query(
    "UPDATE customer_credit_wallets SET is_blocked = ? WHERE customer_id = ?",
    [isBlocked ? 1 : 0, customerId]
  );

  response.json({
    success: true,
    message: isBlocked ? "Wallet blocked." : "Wallet unblocked.",
    data: { customerId, isBlocked }
  });
}

export async function resetCustomerWallet(request, response) {
  const customerId = Number(request.params.customerId);
  if (!customerId) throw new ApiError(400, "Invalid customer ID.");

  const reason = String(request.body?.reason || "Admin wallet reset").trim() || "Admin wallet reset";
  const customers = await query("SELECT id FROM customers WHERE id = ? LIMIT 1", [customerId]);
  if (!customers[0]) throw new ApiError(404, "Customer not found.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      "INSERT IGNORE INTO customer_credit_wallets (customer_id) VALUES (?)",
      [customerId]
    );

    const [walletRows] = await connection.execute(
      "SELECT available_points AS availablePoints FROM customer_credit_wallets WHERE customer_id = ? FOR UPDATE",
      [customerId]
    );
    const availablePoints = Number(walletRows[0]?.availablePoints || 0);

    if (availablePoints > 0) {
      await connection.execute(
        `INSERT INTO credit_transactions
           (customer_id, transaction_type, points, cashback_value, note, status)
         VALUES (?, 'manual_adjustment', ?, 0, ?, 'used')`,
        [customerId, -availablePoints, reason]
      );
    }

    await connection.execute(
      `UPDATE customer_credit_wallets
       SET total_points = 0, available_points = 0, used_points = 0, expired_points = 0
       WHERE customer_id = ?`,
      [customerId]
    );
    await connection.execute(
      `UPDATE credit_transactions
       SET status = CASE WHEN points > 0 AND status = 'active' THEN 'used' ELSE status END
       WHERE customer_id = ?`,
      [customerId]
    );

    await connection.commit();
    response.json({
      success: true,
      message: "Wallet reset to zero.",
      data: { customerId }
    });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function listAdminTransactions(request, response) {
  const page        = Math.max(1, Number(request.query.page) || 1);
  const limit       = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const offset      = (page - 1) * limit;
  const search      = request.query.search?.trim() || "";
  const type        = request.query.type   || null;
  const status      = request.query.status || null;
  const customerId  = request.query.customerId ? Number(request.query.customerId) : null;
  const dateFrom    = request.query.dateFrom || null;
  const dateTo      = request.query.dateTo   || null;

  const conditions = [];
  const params     = [];

  if (search) {
    conditions.push("(c.full_name LIKE ? OR c.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (type) {
    if (!ALLOWED_TX_TYPES.includes(type)) throw new ApiError(400, "Invalid type filter.");
    conditions.push("t.transaction_type = ?"); params.push(type);
  }
  if (status) {
    if (!ALLOWED_TX_STATUSES.includes(status)) throw new ApiError(400, "Invalid status filter.");
    conditions.push("t.status = ?"); params.push(status);
  }
  if (customerId) {
    conditions.push("t.customer_id = ?"); params.push(customerId);
  }
  if (dateFrom) {
    conditions.push("DATE(t.created_at) >= ?"); params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("DATE(t.created_at) <= ?"); params.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows, rows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total
       FROM credit_transactions t
       JOIN customers c ON c.id = t.customer_id
       ${where}`,
      params
    ),
    query(
      `SELECT
         t.id, t.customer_id AS customerId,
         c.full_name AS customerName, c.email AS customerEmail,
         t.transaction_type AS type,
         t.points, t.cashback_value AS cashbackValue,
         t.reference_id AS referenceId, t.reference_type AS referenceType,
         t.note, t.status,
         t.expiry_date AS expiryDate,
         t.created_at AS date
       FROM credit_transactions t
       JOIN customers c ON c.id = t.customer_id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
  ]);

  const total      = Number(countRows[0]?.total || 0);
  const totalEarned   = rows.filter((r) => r.points > 0).reduce((s, r) => s + Number(r.points), 0);
  const totalRedeemed = rows.filter((r) => r.points < 0).reduce((s, r) => s + Math.abs(Number(r.points)), 0);

  response.json({
    success: true,
    data: rows.map((r) => ({
      ...r,
      points:        Number(r.points),
      cashbackValue: Number(r.cashbackValue),
      isDebit:       Number(r.points) < 0
    })),
    summary: { totalEarned, totalRedeemed, netPoints: totalEarned - totalRedeemed },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  FRAUD LOGS                                                                */
/* ══════════════════════════════════════════════════════════════════════════ */

const VIOLATION_TYPES = [
  "self_referral", "circular_referral", "referral_chain_depth_exceeded",
  "duplicate_reward", "duplicate_signup_bonus", "duplicate_review_reward",
  "duplicate_purchase_cashback", "review_reward_no_purchase",
  "velocity_tx_exceeded", "velocity_points_exceeded",
  "fake_referral_code", "same_phone_referral", "same_email_pattern_referral",
  "same_device_referral", "referral_account_not_verified",
  "referral_cooldown", "blocked_wallet_attempt"
];

/* GET /admin/credits/fraud-logs ─────────────────────────────────────────── */
export async function listFraudLogs(request, response) {
  const page         = Math.max(1, Number(request.query.page) || 1);
  const limit        = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const offset       = (page - 1) * limit;
  const search       = request.query.search?.trim() || "";
  const violationType = request.query.violationType || null;
  const reviewed     = request.query.reviewed;
  const customerId   = request.query.customerId ? Number(request.query.customerId) : null;
  const dateFrom     = request.query.dateFrom || null;
  const dateTo       = request.query.dateTo   || null;

  const conditions = [];
  const params     = [];

  if (search) {
    conditions.push("(c.full_name LIKE ? OR c.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (violationType) {
    if (!VIOLATION_TYPES.includes(violationType)) throw new ApiError(400, "Invalid violationType filter.");
    conditions.push("fl.violation_type = ?"); params.push(violationType);
  }
  if (reviewed === "true")  { conditions.push("fl.reviewed = 1"); }
  if (reviewed === "false") { conditions.push("fl.reviewed = 0"); }
  if (customerId) {
    conditions.push("fl.customer_id = ?"); params.push(customerId);
  }
  if (dateFrom) { conditions.push("DATE(fl.created_at) >= ?"); params.push(dateFrom); }
  if (dateTo)   { conditions.push("DATE(fl.created_at) <= ?"); params.push(dateTo); }

  const where = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [countRows, rows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total
       FROM credit_fraud_logs fl
       LEFT JOIN customers c ON c.id = fl.customer_id
       ${where}`,
      params
    ),
    query(
      `SELECT
         fl.id, fl.customer_id AS customerId,
         c.full_name AS customerName, c.email AS customerEmail,
         fl.violation_type AS violationType,
         fl.metadata,
         fl.ip_address AS ipAddress,
         fl.reviewed,
         fl.reviewed_by AS reviewedBy,
         fl.reviewed_at AS reviewedAt,
         fl.created_at AS createdAt
       FROM credit_fraud_logs fl
       LEFT JOIN customers c ON c.id = fl.customer_id
       ${where}
       ORDER BY fl.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
  ]);

  const total          = Number(countRows[0]?.total || 0);
  const unreviewedCount = await query(
    "SELECT COUNT(*) AS cnt FROM credit_fraud_logs WHERE reviewed = 0"
  );

  response.json({
    success: true,
    data: rows.map((r) => ({
      ...r,
      reviewed: Boolean(r.reviewed),
      metadata: (() => { try { return typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata; } catch { return {}; } })()
    })),
    summary: { unreviewedCount: Number(unreviewedCount[0]?.cnt || 0) },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SUMMARY (analytics overview)                                               */
/* ══════════════════════════════════════════════════════════════════════════ */

/* GET /admin/credits/summary ───────────────────────────────────────────── */
export async function getCreditSummary(_request, response) {
  const [totalsRows, walletRows, topCustomers, referralRows, blockedReferralRows] = await Promise.all([
    query(
      `SELECT
         COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0)                            AS totalIssued,
         COALESCE(SUM(CASE WHEN transaction_type = 'redemption' THEN ABS(points) ELSE 0 END), 0)  AS totalRedeemed,
         COALESCE(SUM(CASE WHEN transaction_type = 'expiry'     THEN ABS(points) ELSE 0 END), 0)  AS totalExpired
       FROM credit_transactions`
    ),
    query(
      `SELECT
         COUNT(*)                                                        AS totalWallets,
         COALESCE(SUM(available_points), 0)                             AS totalActivePoints,
         SUM(CASE WHEN available_points > 0 AND is_blocked = 0 THEN 1 ELSE 0 END) AS activeUsers,
         SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END)               AS blockedWallets
       FROM customer_credit_wallets`
    ),
    query(
      `SELECT c.id AS customerId, c.full_name AS name, c.email,
              w.total_points AS totalPoints, w.available_points AS availablePoints
       FROM customer_credit_wallets w
       JOIN customers c ON c.id = w.customer_id
       ORDER BY w.total_points DESC
       LIMIT 5`
    ),
    query(
      `SELECT
         COUNT(*)                       AS totalCodes,
         COALESCE(SUM(CASE WHEN referred_by_code IS NOT NULL THEN 1 ELSE 0 END), 0) AS totalReferrals,
         COALESCE(SUM(CASE WHEN referred_by_code IS NOT NULL AND referral_status = 'successful' THEN 1 ELSE 0 END), 0) AS successfulReferrals,
         COALESCE(SUM(CASE WHEN referred_by_code IS NOT NULL AND referral_status = 'pending' THEN 1 ELSE 0 END), 0) AS pendingReferrals,
         COALESCE(SUM(CASE WHEN referred_by_code IS NOT NULL AND referral_status = 'blocked' THEN 1 ELSE 0 END), 0) AS blockedReferrals,
         COALESCE(SUM(points_earned),         0) AS totalPointsFromReferrals
       FROM customer_referral_codes`
    ),
    query(
      `SELECT COUNT(*) AS blockedSignupAttempts
       FROM credit_fraud_logs
       WHERE violation_type IN ('fake_referral_code', 'same_phone_referral', 'same_email_pattern_referral', 'same_device_referral', 'self_referral', 'circular_referral')`
    )
  ]);

  const t = totalsRows[0] || {};
  const w = walletRows[0]  || {};
  const r = referralRows[0] || {};
  const blocked = blockedReferralRows[0] || {};

  response.json({
    success: true,
    data: {
      totalIssued:              Number(t.totalIssued              || 0),
      totalRedeemed:            Number(t.totalRedeemed            || 0),
      totalExpired:             Number(t.totalExpired             || 0),
      totalActivePoints:        Number(w.totalActivePoints        || 0),
      totalWallets:             Number(w.totalWallets             || 0),
      activeUsers:              Number(w.activeUsers              || 0),
      blockedWallets:           Number(w.blockedWallets           || 0),
      topCustomers:             topCustomers.map((c) => ({
        customerId:     c.customerId,
        name:           c.name,
        email:          c.email,
        totalPoints:    Number(c.totalPoints),
        availablePoints: Number(c.availablePoints)
      })),
      referral: {
        totalCodes:               Number(r.totalCodes              || 0),
        totalReferrals:           Number(r.totalReferrals          || 0),
        successfulReferrals:      Number(r.successfulReferrals     || 0),
        pendingReferrals:         Number(r.pendingReferrals        || 0),
        blockedReferrals:         Number(r.blockedReferrals        || 0) + Number(blocked.blockedSignupAttempts || 0),
        totalPointsFromReferrals: Number(r.totalPointsFromReferrals || 0)
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  EXPIRY JOB                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */

/* POST /admin/credits/expiry/run ───────────────────────────────────────── */
export async function triggerExpiryJob(_request, response) {
  const result = await runExpiryJob();
  response.json({
    success: true,
    message: `Expiry job completed. ${result.processed} customer(s) affected, ${result.pointsExpired} points expired.`,
    data: result
  });
}

/* GET /admin/credits/expiry/upcoming ───────────────────────────────────── */
export async function listUpcomingExpirations(request, response) {
  const withinDays = Math.min(365, Math.max(1, Number(request.query.days) || 30));
  const data       = await getUpcomingExpirations(withinDays);
  response.json({ success: true, data });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  FRAUD LOGS                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */

/* PATCH /admin/credits/fraud-logs/:id/review ────────────────────────────── */
export async function markFraudLogReviewed(request, response) {
  const logId = Number(request.params.id);
  if (!logId) throw new ApiError(400, "Invalid log ID.");

  const rows = await query("SELECT id, reviewed FROM credit_fraud_logs WHERE id = ? LIMIT 1", [logId]);
  if (!rows[0]) throw new ApiError(404, "Fraud log entry not found.");

  await query(
    "UPDATE credit_fraud_logs SET reviewed = 1, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
    [request.admin.id || null, logId]
  );

  response.json({ success: true, message: "Fraud log marked as reviewed." });
}
