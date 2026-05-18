import dotenv from "dotenv";
import { pool, query } from "../config/db.js";
import { grantMilestoneReward } from "../services/creditPointsRewards.js";

dotenv.config();

const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const email = `qa-milestone-${runId}@avyona.local`;
const orderPrefix = `QA-MILESTONE-${runId}`;
const ruleNames = [
  `QA Milestone 5 ${runId}`,
  `QA Milestone 10 ${runId}`,
  `QA Milestone 15 ${runId}`
];

const results = [];
let customerId = null;
const orderIds = [];

function check(label, condition, detail = "") {
  results.push({ label, passed: Boolean(condition), detail });
}

async function cleanup() {
  await query("DELETE FROM credit_transactions WHERE customer_id = ?", [customerId || 0]);
  await query(`DELETE FROM orders WHERE order_number LIKE ?`, [`${orderPrefix}%`]);
  await query(`DELETE FROM reward_rules WHERE rule_name IN (${ruleNames.map(() => "?").join(",")})`, ruleNames);
  await query("DELETE FROM customer_credit_wallets WHERE customer_id = ?", [customerId || 0]);
  await query("DELETE FROM customer_referral_codes WHERE customer_id = ?", [customerId || 0]);
  await query("DELETE FROM customers WHERE email = ?", [email]);
}

async function createDeliveredOrder(index) {
  const result = await query(
    `INSERT INTO orders
       (customer_id, order_number, status, payment_status, payment_method, subtotal, shipping_fee, total_amount)
     VALUES (?, ?, 'delivered', 'paid', 'qa', 1000, 0, 1000)`,
    [customerId, `${orderPrefix}-${String(index).padStart(2, "0")}`]
  );
  orderIds.push(result.insertId);
  return result.insertId;
}

async function countMilestoneReward(referenceId, expectedPoints) {
  const rows = await query(
    `SELECT points, cashback_value AS cashbackValue, status
     FROM credit_transactions
     WHERE customer_id = ?
       AND transaction_type = 'milestone_reward'
       AND reference_id = ?
       AND reference_type = 'milestone'`,
    [customerId, referenceId]
  );

  return rows.some((row) => Number(row.points) === expectedPoints && row.status === "active");
}

async function main() {
  try {
    await cleanup();

    const customerResult = await query(
      `INSERT INTO customers (full_name, email, phone, password_hash, status)
       VALUES ('QA Milestone Customer', ?, ?, 'qa-password-hash', 'active')`,
      [email, `90000${String(runId).slice(-5)}`]
    );
    customerId = customerResult.insertId;

    await query("INSERT IGNORE INTO customer_credit_wallets (customer_id) VALUES (?)", [customerId]);

    const ruleRows = [];
    for (const [index, milestone] of [5, 10, 15].entries()) {
      const points = milestone * 100;
      const result = await query(
        `INSERT INTO reward_rules
           (rule_name, rule_type, trigger_event, reward_points, cashback_value,
            milestone_order_count, reward_target, priority, status, is_default)
         VALUES (?, 'milestone', 'milestone', ?, ?, ?, 'customer', ?, 'active', 0)`,
        [ruleNames[index], points, points / 10, milestone, index + 1]
      );
      ruleRows.push({ id: result.insertId, milestone, points });
    }

    for (let index = 1; index <= 15; index += 1) {
      const orderId = await createDeliveredOrder(index);
      if ([5, 10, 15].includes(index)) {
        await grantMilestoneReward(customerId, orderId, { ipAddress: "127.0.0.1" });
        const rule = ruleRows.find((item) => item.milestone === index);
        const referenceId = `${orderId}:${rule.id}`;
        check(
          `${index}th delivered order grants ${rule.points} milestone points`,
          await countMilestoneReward(referenceId, rule.points),
          `reference ${referenceId}`
        );
      }
    }

    const duplicateOrderId = orderIds[4];
    await grantMilestoneReward(customerId, duplicateOrderId, { ipAddress: "127.0.0.1" });

    const txRows = await query(
      `SELECT milestone.reference_id AS referenceId
       FROM credit_transactions milestone
       WHERE milestone.customer_id = ?
         AND milestone.transaction_type = 'milestone_reward'`,
      [customerId]
    );
    check("Repeated milestone reward request does not duplicate grants", txRows.length === 3, `found ${txRows.length} milestone transactions`);

    const walletRows = await query(
      "SELECT available_points AS availablePoints, total_points AS totalPoints FROM customer_credit_wallets WHERE customer_id = ?",
      [customerId]
    );
    const expectedTotal = 500 + 1000 + 1500;
    check(
      "Wallet total matches 5th + 10th + 15th milestone rewards",
      Number(walletRows[0]?.availablePoints || 0) === expectedTotal && Number(walletRows[0]?.totalPoints || 0) === expectedTotal,
      `expected ${expectedTotal}, got available ${walletRows[0]?.availablePoints}`
    );

    const failed = results.filter((result) => !result.passed);
    for (const result of results) {
      console.log(`${result.passed ? "PASS" : "FAIL"} ${result.label}${result.detail ? ` (${result.detail})` : ""}`);
    }

    if (failed.length) {
      console.error(`\n${failed.length} milestone QA check(s) failed.`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${results.length} milestone QA checks passed.`);
    }
  } finally {
    await cleanup();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error("Milestone QA failed:");
  console.error(error.message || error);
  await cleanup().catch(() => {});
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
