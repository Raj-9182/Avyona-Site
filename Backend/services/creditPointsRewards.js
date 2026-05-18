/**
 * Credit Points Reward Grants
 *
 * Each exported function is the single source of truth for granting one
 * specific reward type. All grants are atomic (DB transaction), idempotent
 * (double-checked inside the lock), and non-fatal to the calling flow when
 * the reward was already issued.
 *
 * Exported:
 *   grantSignupBonus(customerId, opts)
 */

import { pool, query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import {
  assertSignupBonusEligible,
  assertPurchaseCashbackEligible,
  assertReviewRewardEligible,
  assertWalletActive,
  preventSelfReferral,
  preventCircularReferral,
  checkReferralChainDepth,
  checkEarningVelocity,
  logFraudViolation
} from "./creditPointsSecurity.js";

/* ─── Internal helpers ────────────────────────────────────────────────────── */

async function getSettings() {
  const rows = await query("SELECT * FROM credit_settings LIMIT 1");
  return rows[0] || {
    points_per_rupee:        10,
    expiry_days:             365
  };
}

async function getEligibleRewardRules(triggerEvent, {
  orderAmount = null,
  milestoneOrderCount = null,
  rewardTargets = null
} = {}) {
  const conditions = [
    "trigger_event = ?",
    "status = 'active'",
    "(expiry_date IS NULL OR expiry_date >= CURDATE())",
    "(max_usage IS NULL OR used_count < max_usage)"
  ];
  const params = [triggerEvent];

  if (orderAmount != null) {
    conditions.push("(min_order_value IS NULL OR min_order_value <= ?)");
    params.push(Number(orderAmount || 0));
  }
  if (milestoneOrderCount != null) {
    conditions.push("milestone_order_count = ?");
    params.push(Number(milestoneOrderCount || 0));
  }
  if (Array.isArray(rewardTargets) && rewardTargets.length) {
    conditions.push(`reward_target IN (${rewardTargets.map(() => "?").join(", ")})`);
    params.push(...rewardTargets);
  }

  return query(
    `SELECT id, rule_name, reward_points, cashback_value, cashback_percent,
            min_order_value, max_reward_limit, milestone_order_count,
            reward_target, priority, max_usage, used_count
     FROM reward_rules
     WHERE ${conditions.join(" AND ")}
     ORDER BY priority ASC, min_order_value DESC, is_default DESC, created_at ASC`,
    params
  );
}

async function getPurchaseCashbackRule(orderAmount) {
  const rows = await getEligibleRewardRules("purchase", { orderAmount, rewardTargets: ["customer", "both"] });
  return rows[0] || null;
}

async function getMilestoneRules(deliveredCount) {
  return getEligibleRewardRules("milestone", {
    milestoneOrderCount: deliveredCount,
    rewardTargets: ["customer", "both"]
  });
}

async function getSignupRule() {
  const rows = await getEligibleRewardRules("signup", { rewardTargets: ["customer", "both"] });
  return rows[0] || null;
}

async function getReviewRewardRule() {
  const rows = await getEligibleRewardRules("review", { rewardTargets: ["customer", "both"] });
  return rows[0] || null;
}

async function getReferralRule(target) {
  const rows = await getEligibleRewardRules("referral", { rewardTargets: [target, "both"] });
  return rows[0] || null;
}

async function lockRewardRuleForUse(connection, ruleId) {
  const [rows] = await connection.execute(
    `SELECT id
     FROM reward_rules
     WHERE id = ?
       AND status = 'active'
       AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       AND (max_usage IS NULL OR used_count < max_usage)
     FOR UPDATE`,
    [ruleId]
  );
  return Boolean(rows[0]);
}

async function markRewardRuleUsed(connection, ruleId) {
  await connection.execute(
    "UPDATE reward_rules SET used_count = used_count + 1 WHERE id = ?",
    [ruleId]
  );
}

async function ensureAndLockWallet(connection, customerId) {
  await connection.execute(
    "INSERT IGNORE INTO customer_credit_wallets (customer_id) VALUES (?)",
    [customerId]
  );

  const [walletRows] = await connection.execute(
    "SELECT customer_id, is_blocked FROM customer_credit_wallets WHERE customer_id = ? FOR UPDATE",
    [customerId]
  );

  const wallet = walletRows[0] || null;
  if (wallet?.is_blocked) {
    throw new ApiError(403, "Credit points wallet is blocked.");
  }

  return wallet;
}

async function ensureAndLockWallets(connection, customerIds = []) {
  const uniqueIds = [...new Set(customerIds.map((id) => Number(id || 0)).filter(Boolean))].sort((left, right) => left - right);

  for (const customerId of uniqueIds) {
    await ensureAndLockWallet(connection, customerId);
  }
}

function expiryDateString(expiryDays) {
  const d = new Date();
  d.setDate(d.getDate() + Number(expiryDays || 365));
  return d.toISOString().split("T")[0];
}

/* ─── Signup Bonus ─────────────────────────────────────────────────────────── */

/**
 * Grant a one-time signup bonus to a newly registered customer.
 *
 * This function is intentionally non-fatal: if the bonus was already issued
 * (idempotency hit) it exits silently so that the registration response is
 * never blocked by a reward error.
 *
 * Abuse checks run BEFORE the DB transaction:
 *   - Security service: assertSignupBonusEligible (one per account lifetime)
 *   - Duplicate email: prevented upstream by signupCustomer (409 on existing email)
 *   - Duplicate phone: prevented upstream by signupCustomer (phone uniqueness check)
 *
 * @param {number} customerId
 * @param {{ ipAddress?: string }} opts
 */
export async function grantSignupBonus(customerId, { ipAddress = null } = {}) {
  try {
    await _grantSignupBonusAtomic(customerId, ipAddress);
  } catch (err) {
    if (err?.statusCode === 409) return; // already issued — silent skip
    // Unexpected error: log but do not re-throw (signup must still succeed)
    await logFraudViolation(
      customerId,
      "signup_bonus_grant_error",
      { message: err?.message || "unknown" },
      ipAddress
    );
  }
}

/* ─── Referral Bonus ───────────────────────────────────────────────────────── */

/**
 * Grant referral bonuses when a referred customer's first order reaches 'delivered'.
 * Issues active referral rules atomically:
 *   - reward_target='referrer' or 'both' for the referring customer
 *   - reward_target='referee' or 'both' for the new customer
 *
 * Silently exits if:
 *   - Customer has no referred_by_code on file
 *   - This is not their first delivered order
 *   - Either reward was already issued (idempotency hit)
 *
 * @param {number} newCustomerId  The customer whose order just delivered
 * @param {{ orderId?: number, ipAddress?: string }} opts
 */
export async function grantReferralBonus(newCustomerId, { orderId = null, ipAddress = null } = {}) {
  try {
    await _grantReferralBonusAtomic(newCustomerId, orderId, ipAddress);
  } catch (err) {
    if (err?.statusCode === 409 || err?.statusCode === 400) return; // invalid/duplicate — silent skip
    await logFraudViolation(
      newCustomerId,
      "referral_bonus_grant_error",
      { message: err?.message || "unknown", orderId },
      ipAddress
    );
  }
}

async function _grantReferralBonusAtomic(newCustomerId, orderId, ipAddress) {
  // 1. Only proceed if this customer was referred by someone
  const referralRows = await query(
    `SELECT rc.referred_by_code, rc.referral_status, c.status, c.password_hash AS passwordHash,
            c.email, c.phone
     FROM customer_referral_codes rc
     JOIN customers c ON c.id = rc.customer_id
     WHERE rc.customer_id = ?
     LIMIT 1`,
    [newCustomerId]
  );
  const referredByCode = referralRows[0]?.referred_by_code;
  if (!referredByCode) return;
  if (referralRows[0]?.referral_status === "blocked") return;
  if (referralRows[0]?.status !== "active" || !referralRows[0]?.passwordHash || !referralRows[0]?.email || !referralRows[0]?.phone) {
    await logFraudViolation(newCustomerId, "referral_account_not_verified", { referredByCode, orderId }, ipAddress);
    return;
  }

  // 2. Verify this is the referee's FIRST delivered/completed order
  const prevDelivered = await query(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE customer_id = ?
       AND status IN ('delivered', 'completed')
       AND id != ?`,
    [newCustomerId, orderId || 0]
  );
  if (Number(prevDelivered[0]?.cnt || 0) > 0) return;

  // 3. Resolve referrer customer ID
  const referrerRows = await query(
    "SELECT customer_id FROM customer_referral_codes WHERE referral_code = ? LIMIT 1",
    [referredByCode]
  );
  const referrerId = referrerRows[0]?.customer_id;
  if (!referrerId) return; // Orphaned code

  // 4. Security checks (outside transaction — fast read path)
  await preventSelfReferral(newCustomerId, referredByCode, ipAddress);
  await preventCircularReferral(newCustomerId, referredByCode, ipAddress);
  await checkReferralChainDepth(referredByCode, ipAddress);

  const [settings, referrerRule, refereeRule] = await Promise.all([
    getSettings(),
    getReferralRule("referrer"),
    getReferralRule("referee")
  ]);
  if (!referrerRule && !refereeRule) return;

  const expiryDate = expiryDateString(settings.expiry_days);
  const pointsPerRupee = Number(settings.points_per_rupee || 10);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await ensureAndLockWallets(connection, [referrerId, newCustomerId]);
    await checkEarningVelocity(referrerId, ipAddress);
    await checkEarningVelocity(newCustomerId, ipAddress);

    const [refereeOrderRows] = await connection.execute(
      `SELECT id, customer_id AS customerId, status
       FROM orders
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [orderId || 0]
    );
    const refereeOrder = refereeOrderRows[0];
    if (!refereeOrder || Number(refereeOrder.customerId) !== Number(newCustomerId) || !["delivered", "completed"].includes(refereeOrder.status)) {
      await connection.rollback();
      return;
    }

    // Idempotency re-check inside lock — referee row is the canonical dedup key
    const [existingReferee] = await connection.execute(
      `SELECT id FROM credit_transactions
       WHERE customer_id = ? AND transaction_type = 'referral_bonus'
         AND reference_id = ? AND reference_type = 'referral'
       LIMIT 1
       FOR UPDATE`,
      [newCustomerId, String(newCustomerId)]
    );
    if (existingReferee[0]) {
      await connection.rollback();
      return;
    }

    const [existingReferrer] = await connection.execute(
      `SELECT id FROM credit_transactions
       WHERE customer_id = ? AND transaction_type = 'referral_bonus'
         AND reference_id = ? AND reference_type = 'referral'
       LIMIT 1
       FOR UPDATE`,
      [referrerId, String(newCustomerId)]
    );
    if (existingReferrer[0]) {
      await connection.rollback();
      return;
    }

    let referrerPts = 0;
    if (referrerRule && await lockRewardRuleForUse(connection, referrerRule.id)) {
      referrerPts = Number(referrerRule.reward_points || 0);
      if (referrerPts > 0) {
        const referrerCash = Number((referrerPts / pointsPerRupee).toFixed(2));
        await connection.execute(
          `INSERT INTO credit_transactions
             (customer_id, transaction_type, points, cashback_value,
              reference_id, reference_type, note, status, expiry_date)
           VALUES (?, 'referral_bonus', ?, ?, ?, 'referral', ?, 'active', ?)`,
          [
            referrerId,
            referrerPts,
            referrerCash,
            String(newCustomerId),
            `${referrerRule.rule_name || "Referral bonus"} - friend completed first order`,
            expiryDate
          ]
        );
        await connection.execute(
          `UPDATE customer_credit_wallets
           SET total_points = total_points + ?, available_points = available_points + ?
           WHERE customer_id = ?`,
          [referrerPts, referrerPts, referrerId]
        );
        await markRewardRuleUsed(connection, referrerRule.id);
      }
    }

    if (refereeRule && await lockRewardRuleForUse(connection, refereeRule.id)) {
      const refereePts = Number(refereeRule.reward_points || 0);
      if (refereePts > 0) {
        const refereeCash = Number((refereePts / pointsPerRupee).toFixed(2));
        await connection.execute(
          `INSERT INTO credit_transactions
             (customer_id, transaction_type, points, cashback_value,
              reference_id, reference_type, note, status, expiry_date)
           VALUES (?, 'referral_bonus', ?, ?, ?, 'referral', ?, 'active', ?)`,
          [
            newCustomerId,
            refereePts,
            refereeCash,
            String(newCustomerId),
            `${refereeRule.rule_name || "Referral bonus"} - joined via referral`,
            expiryDate
          ]
        );
        await connection.execute(
          `UPDATE customer_credit_wallets
           SET total_points = total_points + ?, available_points = available_points + ?
           WHERE customer_id = ?`,
          [refereePts, refereePts, newCustomerId]
        );
        await markRewardRuleUsed(connection, refereeRule.id);
      }
    }

    // Update referral stats on the referrer's code row
    await connection.execute(
      `UPDATE customer_referral_codes
       SET total_referrals      = total_referrals      + 1,
           successful_referrals = successful_referrals + 1,
           points_earned        = points_earned        + ?,
           successful_at        = NOW()
       WHERE referral_code = ?`,
      [referrerPts, referredByCode]
    );

    await connection.execute(
      `UPDATE customer_referral_codes
       SET referral_status = 'successful',
           successful_at = NOW()
       WHERE customer_id = ?`,
      [newCustomerId]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/* ─── Milestone Reward ─────────────────────────────────────────────────────── */

/**
 * Grant any active milestone rule matching the customer's delivered order count.
 * Admins can configure rewards such as 5, 10, or 20 delivered orders.
 *
 * @param {number} customerId
 * @param {number} orderId    The order that just reached 'delivered'
 * @param {{ ipAddress?: string }} opts
 */
export async function grantMilestoneReward(customerId, orderId, { ipAddress = null } = {}) {
  try {
    await _grantMilestoneRewardAtomic(customerId, orderId, ipAddress);
  } catch (err) {
    if (err?.statusCode === 409) return; // already issued — silent skip
    await logFraudViolation(
      customerId,
      "milestone_reward_grant_error",
      { message: err?.message || "unknown", orderId },
      ipAddress
    );
  }
}

async function _grantMilestoneRewardAtomic(customerId, orderId, ipAddress) {
  await assertWalletActive(customerId, ipAddress);
  await checkEarningVelocity(customerId, ipAddress);

  const settings = await getSettings();
  const expiryDate = expiryDateString(settings.expiry_days);
  const pointsPerRupee = Number(settings.points_per_rupee || 10);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await ensureAndLockWallet(connection, customerId);
    await checkEarningVelocity(customerId, ipAddress);

    const [orderRows] = await connection.execute(
      `SELECT id, customer_id AS customerId, status, created_at AS createdAt
       FROM orders
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [orderId || 0]
    );
    const order = orderRows[0];
    if (!order || Number(order.customerId) !== Number(customerId) || !["delivered", "completed"].includes(order.status)) {
      await connection.rollback();
      return;
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS cnt
       FROM orders
       WHERE customer_id = ?
         AND status IN ('delivered', 'completed')
         AND (
           created_at < ?
           OR (created_at = ? AND id <= ?)
         )`,
      [customerId, order.createdAt, order.createdAt, order.id]
    );
    const deliveredCount = Number(countRows[0]?.cnt || 0);
    if (deliveredCount === 0) {
      await connection.rollback();
      return;
    }

    const rules = await getMilestoneRules(deliveredCount);
    if (!rules.length) {
      await connection.rollback();
      return;
    }

    const [existingSourceReward] = await connection.execute(
      `SELECT id
       FROM credit_transactions
       WHERE customer_id = ?
         AND transaction_type = 'milestone_reward'
         AND reference_type = 'milestone'
         AND reference_id LIKE ?
       LIMIT 1
       FOR UPDATE`,
      [customerId, `${orderId}:%`]
    );
    if (existingSourceReward[0]) {
      await connection.rollback();
      return;
    }

    let totalPts = 0;
    for (const rule of rules) {
      if (!await lockRewardRuleForUse(connection, rule.id)) continue;
      const rulePts = Number(rule.reward_points || 0);
      if (rulePts <= 0) continue;

      const referenceId = `${orderId}:${rule.id}`;
      const ruleCashback = Number(rule.cashback_value || (rulePts / pointsPerRupee)).toFixed(2);
      const [existingRuleReward] = await connection.execute(
        `SELECT id FROM credit_transactions
         WHERE customer_id = ? AND transaction_type = 'milestone_reward'
           AND reference_id = ? AND reference_type = 'milestone'
         LIMIT 1
         FOR UPDATE`,
        [customerId, referenceId]
      );
      if (existingRuleReward[0]) continue;

      await connection.execute(
        `INSERT INTO credit_transactions
           (customer_id, transaction_type, points, cashback_value,
            reference_id, reference_type, note, status, expiry_date)
         VALUES (?, 'milestone_reward', ?, ?, ?, 'milestone', ?, 'active', ?)`,
        [
          customerId,
          rulePts,
          Number(ruleCashback),
          referenceId,
          `${rule.rule_name || "Milestone reward"} - ${deliveredCount} delivered orders`,
          expiryDate
        ]
      );
      totalPts += rulePts;
      await markRewardRuleUsed(connection, rule.id);
      break;
    }

    if (totalPts > 0) {
      await connection.execute(
        `UPDATE customer_credit_wallets
         SET total_points = total_points + ?, available_points = available_points + ?
         WHERE customer_id = ?`,
        [totalPts, totalPts, customerId]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/* --- Purchase Cashback ────────────────────────────────────────────────────── */

/**
 * Grant purchase cashback after an order first reaches 'delivered'.
 * The percentage, optional fixed points, minimum order, and cap come from reward_rules.
 *
 * @param {number} customerId
 * @param {number} orderId
 * @param {number} orderAmount   Total order value in rupees
 * @param {{ ipAddress?: string }} opts
 */
export async function grantPurchaseCashback(customerId, orderId, orderAmount, { ipAddress = null } = {}) {
  try {
    await _grantPurchaseCashbackAtomic(customerId, orderId, orderAmount, ipAddress);
  } catch (err) {
    if (err?.statusCode === 409) return; // already issued — silent skip
    await logFraudViolation(
      customerId,
      "purchase_cashback_grant_error",
      { message: err?.message || "unknown", orderId },
      ipAddress
    );
  }
}

async function _grantPurchaseCashbackAtomic(customerId, orderId, orderAmount, ipAddress) {
  // Pre-flight security checks (outside transaction)
  await assertWalletActive(customerId, ipAddress);
  await assertPurchaseCashbackEligible(customerId, orderId, ipAddress);
  await checkEarningVelocity(customerId, ipAddress);

  const settings = await getSettings();
  const expiryDate = expiryDateString(settings.expiry_days);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await ensureAndLockWallet(connection, customerId);
    await checkEarningVelocity(customerId, ipAddress);

    const [orderRows] = await connection.execute(
      `SELECT id, customer_id AS customerId, status, total_amount AS totalAmount
       FROM orders
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [orderId || 0]
    );
    const order = orderRows[0];
    if (!order || Number(order.customerId) !== Number(customerId) || !["delivered", "completed"].includes(order.status)) {
      await connection.rollback();
      return;
    }

    const lockedOrderAmount = Number(order.totalAmount || orderAmount || 0);
    const rule = await getPurchaseCashbackRule(lockedOrderAmount);
    if (!rule) {
      await connection.rollback();
      return;
    }

    const percent = Number(rule.cashback_percent || 0);
    const fixedPoints = Number(rule.reward_points || 0);
    const cashbackRupees = fixedPoints > 0
      ? Math.floor(fixedPoints / Number(settings.points_per_rupee || 10))
      : Math.floor(lockedOrderAmount * (percent / 100));
    if (fixedPoints <= 0 && cashbackRupees <= 0) {
      await connection.rollback();
      return;
    }

    let pts = fixedPoints > 0 ? fixedPoints : cashbackRupees * Number(settings.points_per_rupee || 10);
    if (rule.max_reward_limit != null) pts = Math.min(pts, Number(rule.max_reward_limit));

    // Idempotency re-check inside lock
    const [existing] = await connection.execute(
      `SELECT id FROM credit_transactions
       WHERE customer_id = ? AND transaction_type = 'purchase_cashback'
         AND reference_id = ? AND reference_type = 'order'
       LIMIT 1
       FOR UPDATE`,
      [customerId, String(orderId)]
    );
    if (existing[0]) {
      await connection.rollback();
      return;
    }
    if (!await lockRewardRuleForUse(connection, rule.id)) {
      await connection.rollback();
      return;
    }

    const finalCashback = Math.floor(pts / Number(settings.points_per_rupee || 10));
    await connection.execute(
      `INSERT INTO credit_transactions
         (customer_id, transaction_type, points, cashback_value,
          reference_id, reference_type, note, status, expiry_date)
       VALUES (?, 'purchase_cashback', ?, ?, ?, 'order',
               ?, 'active', ?)`,
      [
        customerId,
        pts,
        finalCashback,
        String(orderId),
        `${rule.rule_name || "Purchase cashback"} - ${percent || "fixed"}${percent ? "% cashback" : " points"}`,
        expiryDate
      ]
    );

    await connection.execute(
      `UPDATE customer_credit_wallets
       SET total_points = total_points + ?, available_points = available_points + ?
       WHERE customer_id = ?`,
      [pts, pts, customerId]
    );
    await markRewardRuleUsed(connection, rule.id);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/* ─── Review Reward ────────────────────────────────────────────────────────── */


/**
 * Grant a one-time review reward when a verified review is approved (set to 'public').
 * Reward amount is controlled by the reward_rules table (trigger_event='review').
 * One reward per product per customer lifetime — no farming.
 *
 * @param {number} customerId
 * @param {number} productId
 * @param {number} reviewId
 * @param {{ ipAddress?: string }} opts
 */
export async function grantReviewReward(customerId, productId, reviewId, { ipAddress = null } = {}) {
  try {
    await _grantReviewRewardAtomic(customerId, productId, reviewId, ipAddress);
  } catch (err) {
    if (err?.statusCode === 409 || err?.statusCode === 403) return; // already issued or no verified purchase — silent skip
    await logFraudViolation(
      customerId,
      "review_reward_grant_error",
      { message: err?.message || "unknown", reviewId, productId },
      ipAddress
    );
  }
}

async function _grantReviewRewardAtomic(customerId, productId, reviewId, ipAddress) {
  // Security checks (outside transaction — fast read path)
  // assertReviewRewardEligible verifies: no prior reward for this product + delivered order exists
  await assertWalletActive(customerId, ipAddress);
  await assertReviewRewardEligible(customerId, productId, reviewId, ipAddress);
  await checkEarningVelocity(customerId, ipAddress);

  const [settings, rule] = await Promise.all([getSettings(), getReviewRewardRule()]);
  if (!rule) return;

  const pts = Number(rule.reward_points || 0);
  if (pts <= 0) return;
  const cashback   = Number((pts / Number(settings.points_per_rupee || 10)).toFixed(2));
  const expiryDate = expiryDateString(settings.expiry_days);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await ensureAndLockWallet(connection, customerId);
    await checkEarningVelocity(customerId, ipAddress);

    const [reviewRows] = await connection.execute(
      `SELECT review_id AS reviewId, customer_id AS customerId, product_id AS productId,
              review_type AS reviewType, is_verified_purchase AS isVerifiedPurchase,
              visibility_status AS visibilityStatus
       FROM reviews
       WHERE review_id = ?
       LIMIT 1
       FOR UPDATE`,
      [reviewId || 0]
    );
    const review = reviewRows[0];
    if (
      !review ||
      Number(review.customerId) !== Number(customerId) ||
      Number(review.productId) !== Number(productId) ||
      review.reviewType !== "customer_review" ||
      !review.isVerifiedPurchase ||
      review.visibilityStatus !== "public"
    ) {
      await connection.rollback();
      return;
    }

    // Idempotency re-check inside lock: keyed on product (one reward per product, not per review)
    const [existing] = await connection.execute(
      `SELECT id FROM credit_transactions
       WHERE customer_id = ? AND transaction_type = 'review_reward'
         AND reference_id = ? AND reference_type = 'product'
       LIMIT 1
       FOR UPDATE`,
      [customerId, String(productId)]
    );
    if (existing[0]) {
      await connection.rollback();
      return;
    }
    if (!await lockRewardRuleForUse(connection, rule.id)) {
      await connection.rollback();
      return;
    }

    await connection.execute(
      `INSERT INTO credit_transactions
         (customer_id, transaction_type, points, cashback_value,
          reference_id, reference_type, note, status, expiry_date)
       VALUES (?, 'review_reward', ?, ?, ?, 'product',
               'Review reward — verified purchase review approved', 'active', ?)`,
      [customerId, pts, cashback, String(productId), expiryDate]
    );

    await connection.execute(
      `UPDATE customer_credit_wallets
       SET total_points = total_points + ?, available_points = available_points + ?
       WHERE customer_id = ?`,
      [pts, pts, customerId]
    );
    await markRewardRuleUsed(connection, rule.id);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/* ─── Signup Bonus ─────────────────────────────────────────────────────────── */

async function _grantSignupBonusAtomic(customerId, ipAddress) {
  // Pre-flight security check (outside transaction — fast read path)
  await assertSignupBonusEligible(customerId, ipAddress);

  const [settings, rule] = await Promise.all([getSettings(), getSignupRule()]);
  if (!rule) return;

  const pts = Number(rule.reward_points || 0);
  if (pts <= 0) return;
  const cashback   = Number((pts / settings.points_per_rupee).toFixed(2));
  const expiryDate = expiryDateString(settings.expiry_days);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await ensureAndLockWallet(connection, customerId);
    await checkEarningVelocity(customerId, ipAddress);

    // Idempotency re-check inside the lock — race-condition safe
    const [existing] = await connection.execute(
      "SELECT id FROM credit_transactions WHERE customer_id = ? AND transaction_type = 'signup_bonus' LIMIT 1 FOR UPDATE",
      [customerId]
    );
    if (existing[0]) {
      await connection.rollback();
      return; // Concurrent grant already committed — silent exit
    }

    if (!await lockRewardRuleForUse(connection, rule.id)) {
      await connection.rollback();
      return;
    }

    // Insert transaction record
    await connection.execute(
      `INSERT INTO credit_transactions
         (customer_id, transaction_type, points, cashback_value,
          reference_type, note, status, expiry_date)
       VALUES (?, 'signup_bonus', ?, ?, 'signup', 'Welcome bonus for creating your account', 'active', ?)`,
      [customerId, pts, cashback, expiryDate]
    );

    // Update wallet totals
    await connection.execute(
      `UPDATE customer_credit_wallets
       SET total_points     = total_points     + ?,
           available_points = available_points + ?
       WHERE customer_id = ?`,
      [pts, pts, customerId]
    );

    await markRewardRuleUsed(connection, rule.id);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
