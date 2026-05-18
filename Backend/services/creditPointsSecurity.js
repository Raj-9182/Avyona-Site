/**
 * Credit Points Security Service
 *
 * All public functions throw ApiError on violation.
 * Every violation is written to credit_fraud_logs before throwing so that
 * the admin dashboard has a full audit trail regardless of what the caller does.
 *
 * Rules enforced:
 *   1. Wallet blocked           — blocked wallet blocks all earning/redemption
 *   2. Self-referral            — cannot use your own referral code
 *   3. Circular referral        — A referred B, B cannot refer A
 *   4. Referral chain depth     — chain capped at MAX_REFERRAL_CHAIN_DEPTH levels
 *   5. Duplicate reward         — idempotency check per (customer, type, ref)
 *   6. Signup bonus once        — one per customer lifetime
 *   7. Review reward gating     — verified purchase required; one reward per product
 *   8. Purchase cashback once   — one per order
 *   9. Daily earning velocity   — caps daily tx count and daily points earned
 *  10. Referral cooldown        — a customer can only receive one referral credit per day
 */

import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

/* ─── Configurable limits ─────────────────────────────────────────────────── */

const MAX_REFERRAL_CHAIN_DEPTH   = 3;
const MAX_DAILY_EARN_TX          = 10;   // earning transactions per customer per day
const MAX_DAILY_EARN_POINTS      = 5000; // total earn-side points per customer per day
const MAX_DAILY_REFERRAL_CREDITS = 1;    // referral bonuses receivable per day

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function normalizeEmailPattern(email) {
  const [local = "", domain = ""] = String(email || "").trim().toLowerCase().split("@");
  if (!local || !domain) return "";
  const withoutTag = local.split("+")[0];
  const compactLocal = ["gmail.com", "googlemail.com"].includes(domain)
    ? withoutTag.replace(/\./g, "")
    : withoutTag;
  return `${compactLocal}@${domain === "googlemail.com" ? "gmail.com" : domain}`;
}

/* ─── Fraud logger (non-fatal — never throws) ─────────────────────────────── */

export async function logFraudViolation(customerId, violationType, metadata = {}, ipAddress = null) {
  try {
    await query(
      `INSERT INTO credit_fraud_logs (customer_id, violation_type, metadata, ip_address)
       VALUES (?, ?, ?, ?)`,
      [
        customerId || null,
        String(violationType),
        JSON.stringify(metadata),
        ipAddress || null
      ]
    );
  } catch {
    // Logging must never break the caller's flow.
  }
}

/* ─── Rule 1 — Wallet blocked ─────────────────────────────────────────────── */

export async function assertWalletActive(customerId, ipAddress = null) {
  const rows = await query(
    "SELECT is_blocked FROM customer_credit_wallets WHERE customer_id = ? LIMIT 1",
    [customerId]
  );
  if (rows[0]?.is_blocked) {
    await logFraudViolation(customerId, "blocked_wallet_attempt", {}, ipAddress);
    throw new ApiError(403, "Your credit points wallet has been blocked. Contact support to resolve this.");
  }
}

/* ─── Rule 2 — Self-referral ──────────────────────────────────────────────── */

export async function preventSelfReferral(customerId, referralCode, ipAddress = null) {
  const rows = await query(
    "SELECT customer_id FROM customer_referral_codes WHERE referral_code = ? LIMIT 1",
    [referralCode]
  );
  if (rows[0]?.customer_id === customerId) {
    await logFraudViolation(customerId, "self_referral", { referralCode }, ipAddress);
    throw new ApiError(400, "You cannot use your own referral code.");
  }
}

export async function validateReferralAtSignup({
  referralCode,
  email,
  phone,
  deviceHash = null,
  ipAddress = null
}) {
  if (!referralCode) return null;

  const rows = await query(
    `SELECT
       rc.customer_id AS referrerCustomerId,
       rc.referral_code AS referralCode,
       rc.signup_ip AS referrerSignupIp,
       rc.signup_device_hash AS referrerDeviceHash,
       c.email AS referrerEmail,
       c.phone AS referrerPhone,
       c.status AS referrerStatus
     FROM customer_referral_codes rc
     JOIN customers c ON c.id = rc.customer_id
     WHERE rc.referral_code = ?
     LIMIT 1`,
    [referralCode]
  );
  const referrer = rows[0];
  if (!referrer) {
    await logFraudViolation(null, "fake_referral_code", { referralCode, email }, ipAddress);
    throw new ApiError(400, "Invalid referral code.");
  }

  const newPhone = normalizePhone(phone);
  const refPhone = normalizePhone(referrer.referrerPhone);
  if (newPhone && refPhone && newPhone === refPhone) {
    await logFraudViolation(null, "same_phone_referral", { referralCode, email }, ipAddress);
    throw new ApiError(400, "Referral cannot be used with the same phone number.");
  }

  const newEmailPattern = normalizeEmailPattern(email);
  const refEmailPattern = normalizeEmailPattern(referrer.referrerEmail);
  if (newEmailPattern && refEmailPattern && newEmailPattern === refEmailPattern) {
    await logFraudViolation(null, "same_email_pattern_referral", { referralCode, email }, ipAddress);
    throw new ApiError(400, "Referral cannot be used with the same email identity.");
  }

  if (deviceHash && referrer.referrerDeviceHash && deviceHash === referrer.referrerDeviceHash) {
    await logFraudViolation(null, "same_device_referral", { referralCode, email }, ipAddress);
    throw new ApiError(400, "Referral cannot be used from the same device.");
  }

  if (ipAddress && referrer.referrerSignupIp && ipAddress === referrer.referrerSignupIp) {
    await logFraudViolation(null, "same_device_referral", { referralCode, email, reason: "same_ip" }, ipAddress);
    throw new ApiError(400, "Referral cannot be used from the same signup source.");
  }

  if (deviceHash) {
    const sameDeviceRows = await query(
      `SELECT customer_id
       FROM customer_referral_codes
       WHERE referred_by_code = ?
         AND signup_device_hash = ?
         AND referral_status IN ('pending', 'successful')
       LIMIT 1`,
      [referralCode, deviceHash]
    );
    if (sameDeviceRows[0]) {
      await logFraudViolation(null, "same_device_referral", { referralCode, email, reason: "duplicate_referred_device" }, ipAddress);
      throw new ApiError(400, "This referral has already been used from this device.");
    }
  }

  if (ipAddress) {
    const sameIpRows = await query(
      `SELECT customer_id
       FROM customer_referral_codes
       WHERE referred_by_code = ?
         AND signup_ip = ?
         AND referral_status IN ('pending', 'successful')
       LIMIT 1`,
      [referralCode, ipAddress]
    );
    if (sameIpRows[0]) {
      await logFraudViolation(null, "same_device_referral", { referralCode, email, reason: "duplicate_referred_ip" }, ipAddress);
      throw new ApiError(400, "This referral has already been used from this signup source.");
    }
  }

  return referrer;
}

/* ─── Rule 3 — Circular referral (A→B then B→A) ──────────────────────────── */

export async function preventCircularReferral(newCustomerId, referralCode, ipAddress = null) {
  // Find who owns this referral code (the would-be referrer)
  const referrerRows = await query(
    "SELECT customer_id FROM customer_referral_codes WHERE referral_code = ? LIMIT 1",
    [referralCode]
  );
  const referrerCustomerId = referrerRows[0]?.customer_id;
  if (!referrerCustomerId) return; // unknown code — let the caller decide

  // Check whether the referrer was themselves referred by the new customer
  const circularRows = await query(
    `SELECT r.customer_id
     FROM customer_referral_codes r
     WHERE r.customer_id = ?
       AND r.referred_by_code IN (
         SELECT referral_code FROM customer_referral_codes WHERE customer_id = ?
       )
     LIMIT 1`,
    [referrerCustomerId, newCustomerId]
  );

  if (circularRows[0]) {
    await logFraudViolation(newCustomerId, "circular_referral", { referralCode, referrerCustomerId }, ipAddress);
    throw new ApiError(400, "Circular referral detected. This referral is not eligible for bonus points.");
  }
}

/* ─── Rule 4 — Referral chain depth ──────────────────────────────────────── */

export async function checkReferralChainDepth(referralCode, ipAddress = null) {
  let currentCode = referralCode;
  let depth = 0;

  while (currentCode && depth < MAX_REFERRAL_CHAIN_DEPTH) {
    const rows = await query(
      "SELECT referred_by_code FROM customer_referral_codes WHERE referral_code = ? LIMIT 1",
      [currentCode]
    );
    if (!rows[0]?.referred_by_code) break;
    currentCode = rows[0].referred_by_code;
    depth++;
  }

  if (depth >= MAX_REFERRAL_CHAIN_DEPTH) {
    await logFraudViolation(null, "referral_chain_depth_exceeded", { referralCode, depth }, ipAddress);
    throw new ApiError(400, `Referral bonus is limited to ${MAX_REFERRAL_CHAIN_DEPTH} chain levels. This referral is not eligible.`);
  }
}

/* ─── Rule 5 — Duplicate reward idempotency ───────────────────────────────── */
// reference_id + reference_type uniquely identify the source of a reward.
// e.g. order #42 → referenceId="42", referenceType="order"

export async function preventDuplicateReward(customerId, txType, referenceId, referenceType, ipAddress = null) {
  if (!referenceId || !referenceType) return;

  const rows = await query(
    `SELECT id FROM credit_transactions
     WHERE customer_id = ?
       AND transaction_type = ?
       AND reference_id = ?
       AND reference_type = ?
     LIMIT 1`,
    [customerId, txType, String(referenceId), String(referenceType)]
  );

  if (rows[0]) {
    await logFraudViolation(customerId, "duplicate_reward", { txType, referenceId, referenceType }, ipAddress);
    throw new ApiError(409, `Reward for this ${referenceType} has already been issued.`);
  }
}

/* ─── Rule 6 — Signup bonus (one per account lifetime) ───────────────────── */

export async function assertSignupBonusEligible(customerId, ipAddress = null) {
  const rows = await query(
    `SELECT id FROM credit_transactions
     WHERE customer_id = ? AND transaction_type = 'signup_bonus'
     LIMIT 1`,
    [customerId]
  );
  if (rows[0]) {
    await logFraudViolation(customerId, "duplicate_signup_bonus", {}, ipAddress);
    throw new ApiError(409, "Signup bonus has already been awarded for this account.");
  }
}

/* ─── Rule 7 — Review reward: verified purchase + one per product ─────────── */

export async function assertReviewRewardEligible(customerId, productId, reviewId, ipAddress = null) {
  // Must not have already received a reward for this product
  const dupRows = await query(
    `SELECT id FROM credit_transactions
     WHERE customer_id = ?
       AND transaction_type = 'review_reward'
       AND reference_id = ?
       AND reference_type = 'product'
     LIMIT 1`,
    [customerId, String(productId)]
  );
  if (dupRows[0]) {
    await logFraudViolation(customerId, "duplicate_review_reward", { productId, reviewId }, ipAddress);
    throw new ApiError(409, "Review reward for this product has already been awarded.");
  }

  // Customer must have a delivered/completed order containing this product
  const purchaseRows = await query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.customer_id = ?
       AND oi.product_id = ?
       AND o.status IN ('delivered', 'completed')
     LIMIT 1`,
    [customerId, productId]
  );
  if (!purchaseRows[0]) {
    await logFraudViolation(customerId, "review_reward_no_purchase", { productId, reviewId }, ipAddress);
    throw new ApiError(403, "Review reward is only available for verified purchases (delivered orders).");
  }
}

/* ─── Rule 8 — Purchase cashback: one per order ──────────────────────────── */

export async function assertPurchaseCashbackEligible(customerId, orderId, ipAddress = null) {
  const rows = await query(
    `SELECT id FROM credit_transactions
     WHERE customer_id = ?
       AND transaction_type = 'purchase_cashback'
       AND reference_id = ?
       AND reference_type = 'order'
     LIMIT 1`,
    [customerId, String(orderId)]
  );
  if (rows[0]) {
    await logFraudViolation(customerId, "duplicate_purchase_cashback", { orderId }, ipAddress);
    throw new ApiError(409, `Purchase cashback for order #${orderId} has already been issued.`);
  }
}

/* ─── Rule 9 — Daily earning velocity ────────────────────────────────────── */

export async function checkEarningVelocity(customerId, ipAddress = null) {
  const rows = await query(
    `SELECT
       COUNT(*) AS txCount,
       COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS totalPts
     FROM credit_transactions
     WHERE customer_id = ?
       AND points > 0
       AND DATE(created_at) = CURDATE()
       AND transaction_type NOT IN ('manual_adjustment', 'redemption', 'expiry')`,
    [customerId]
  );

  const txCount  = Number(rows[0]?.txCount  || 0);
  const totalPts = Number(rows[0]?.totalPts || 0);

  if (txCount >= MAX_DAILY_EARN_TX) {
    await logFraudViolation(customerId, "velocity_tx_exceeded",
      { txCount, limit: MAX_DAILY_EARN_TX }, ipAddress);
    throw new ApiError(429, `Daily earning transaction limit (${MAX_DAILY_EARN_TX}) reached. Try again tomorrow.`);
  }

  if (totalPts >= MAX_DAILY_EARN_POINTS) {
    await logFraudViolation(customerId, "velocity_points_exceeded",
      { totalPts, limit: MAX_DAILY_EARN_POINTS }, ipAddress);
    throw new ApiError(429, `Daily earning points limit (${MAX_DAILY_EARN_POINTS} pts) reached. Try again tomorrow.`);
  }
}

/* ─── Rule 10 — Referral credit cooldown (one per day) ───────────────────── */

export async function checkReferralCooldown(customerId, ipAddress = null) {
  const rows = await query(
    `SELECT id FROM credit_transactions
     WHERE customer_id = ?
       AND transaction_type = 'referral_bonus'
       AND DATE(created_at) = CURDATE()
     LIMIT ?`,
    [customerId, MAX_DAILY_REFERRAL_CREDITS]
  );

  if (rows.length >= MAX_DAILY_REFERRAL_CREDITS) {
    await logFraudViolation(customerId, "referral_cooldown",
      { daily_limit: MAX_DAILY_REFERRAL_CREDITS }, ipAddress);
    throw new ApiError(429, "Referral bonus limit for today has been reached.");
  }
}

/* ─── Composite guard — run all relevant checks before granting any reward ─ */

export async function guardRewardGrant({
  customerId,
  txType,
  referenceId    = null,
  referenceType  = null,
  productId      = null,
  reviewId       = null,
  orderId        = null,
  referralCode   = null,
  ipAddress      = null
}) {
  // Always check: wallet active + velocity
  await assertWalletActive(customerId, ipAddress);
  await checkEarningVelocity(customerId, ipAddress);

  // Duplicate reward check for all typed that carry a reference
  if (referenceId && referenceType) {
    await preventDuplicateReward(customerId, txType, referenceId, referenceType, ipAddress);
  }

  switch (txType) {
    case "signup_bonus":
      await assertSignupBonusEligible(customerId, ipAddress);
      break;

    case "review_reward":
      if (!productId) throw new ApiError(500, "productId required for review_reward guard.");
      await assertReviewRewardEligible(customerId, productId, reviewId, ipAddress);
      break;

    case "purchase_cashback":
      if (!orderId) throw new ApiError(500, "orderId required for purchase_cashback guard.");
      await assertPurchaseCashbackEligible(customerId, orderId, ipAddress);
      break;

    case "referral_bonus":
      await checkReferralCooldown(customerId, ipAddress);
      if (referralCode) {
        await preventSelfReferral(customerId, referralCode, ipAddress);
        await preventCircularReferral(customerId, referralCode, ipAddress);
        await checkReferralChainDepth(referralCode, ipAddress);
      }
      break;

    default:
      break;
  }
}
