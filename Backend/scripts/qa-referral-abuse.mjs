import dotenv from "dotenv";
import { pool, query } from "../config/db.js";
import { preventSelfReferral, validateReferralAtSignup } from "../services/creditPointsSecurity.js";

dotenv.config();

const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const referrerEmail = `qa.referrer.${runId}@gmail.com`;
const referralCode = `QA${String(runId).slice(-8)}`;
const referrerPhone = `91000${String(runId).slice(-5)}`;
const signupIp = "203.0.113.25";
const deviceHash = `qa-device-${runId}`;
let referrerId = null;
const results = [];

function check(label, condition, detail = "") {
  results.push({ label, passed: Boolean(condition), detail });
}

async function expectBlocked(label, fn, expectedStatusCode) {
  try {
    await fn();
    check(label, false, "request was allowed");
  } catch (error) {
    check(label, Number(error.statusCode) === expectedStatusCode, error.message || String(error));
  }
}

async function cleanup() {
  await query("DELETE FROM credit_fraud_logs WHERE ip_address = ? OR metadata LIKE ?", [signupIp, `%${runId}%`]);
  await query("DELETE FROM customer_referral_codes WHERE referral_code = ? OR referred_by_code = ?", [referralCode, referralCode]);
  await query("DELETE FROM customers WHERE email IN (?, ?, ?, ?, ?, ?)", [
    referrerEmail,
    `qa.new.${runId}@example.com`,
    `qa.phone.${runId}@example.com`,
    `qareferrer${runId}@gmail.com`,
    `qa.valid.${runId}@example.com`,
    `qa.fake.${runId}@example.com`
  ]);
}

async function main() {
  try {
    await cleanup();

    const customerResult = await query(
      `INSERT INTO customers (full_name, email, phone, password_hash, status)
       VALUES ('QA Referral Referrer', ?, ?, 'qa-password-hash', 'active')`,
      [referrerEmail, referrerPhone]
    );
    referrerId = customerResult.insertId;

    await query(
      `INSERT INTO customer_referral_codes
         (customer_id, referral_code, referral_status, signup_ip, signup_device_hash)
       VALUES (?, ?, 'none', ?, ?)`,
      [referrerId, referralCode, signupIp, deviceHash]
    );

    await expectBlocked(
      "Self referral is blocked",
      () => preventSelfReferral(referrerId, referralCode, signupIp),
      400
    );

    await expectBlocked(
      "Same device referral signup is blocked",
      () => validateReferralAtSignup({
        referralCode,
        email: `qa.new.${runId}@example.com`,
        phone: `92000${String(runId).slice(-5)}`,
        deviceHash,
        ipAddress: "203.0.113.50"
      }),
      400
    );

    await expectBlocked(
      "Same IP referral signup is blocked",
      () => validateReferralAtSignup({
        referralCode,
        email: `qa.fake.${runId}@example.com`,
        phone: `93000${String(runId).slice(-5)}`,
        deviceHash: `different-device-${runId}`,
        ipAddress: signupIp
      }),
      400
    );

    await expectBlocked(
      "Same phone referral signup is blocked",
      () => validateReferralAtSignup({
        referralCode,
        email: `qa.phone.${runId}@example.com`,
        phone: referrerPhone,
        deviceHash: `phone-device-${runId}`,
        ipAddress: "203.0.113.51"
      }),
      400
    );

    await expectBlocked(
      "Fake email pattern referral signup is blocked",
      () => validateReferralAtSignup({
        referralCode,
        email: `qa.referrer.${runId}+farm@gmail.com`,
        phone: `94000${String(runId).slice(-5)}`,
        deviceHash: `email-device-${runId}`,
        ipAddress: "203.0.113.52"
      }),
      400
    );

    const validResult = await validateReferralAtSignup({
      referralCode,
      email: `qa.valid.${runId}@example.com`,
      phone: `95000${String(runId).slice(-5)}`,
      deviceHash: `valid-device-${runId}`,
      ipAddress: "203.0.113.53"
    });
    check("Valid referral control case is allowed", Number(validResult?.referrerCustomerId) === Number(referrerId));

    const failed = results.filter((result) => !result.passed);
    for (const result of results) {
      console.log(`${result.passed ? "PASS" : "FAIL"} ${result.label}${result.detail ? ` (${result.detail})` : ""}`);
    }

    if (failed.length) {
      console.error(`\n${failed.length} referral abuse QA check(s) failed.`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${results.length} referral abuse QA checks passed.`);
    }
  } finally {
    await cleanup();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error("Referral abuse QA failed:");
  console.error(error.message || error);
  await cleanup().catch(() => {});
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
