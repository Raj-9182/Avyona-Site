import dotenv from "dotenv";
import { performance } from "node:perf_hooks";
import { pool, query } from "../config/db.js";
import { getWallet, getTransactions } from "../controllers/creditPointsController.js";
import { listCustomerWallets, listAdminTransactions, getCreditSummary } from "../controllers/adminCreditPointsController.js";
import { getDashboardSummary } from "../controllers/dashboardController.js";

dotenv.config();

const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const email = `qa-performance-${runId}@avyona.local`;
const phone = `98000${String(runId).slice(-5)}`;
const txCount = 120;
let customerId = null;
const results = [];

function check(label, condition, detail = "") {
  results.push({ label, passed: Boolean(condition), detail });
}

async function cleanup() {
  await query("DELETE FROM credit_transactions WHERE customer_id = ?", [customerId || 0]);
  await query("DELETE FROM customer_credit_wallets WHERE customer_id = ?", [customerId || 0]);
  await query("DELETE FROM customer_referral_codes WHERE customer_id = ?", [customerId || 0]);
  await query("DELETE FROM customers WHERE email = ?", [email]);
}

function createJsonResponse() {
  let payload = null;
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return body;
    },
    get payload() {
      return payload;
    }
  };
}

async function timed(label, fn, maxMs = 750) {
  const start = performance.now();
  const value = await fn();
  const elapsed = Math.round(performance.now() - start);
  check(label, elapsed <= maxMs, `${elapsed}ms <= ${maxMs}ms`);
  return value;
}

async function explainUsesIndex(label, sql, params, expectedIndexPrefix) {
  const rows = await query(`EXPLAIN ${sql}`, params);
  const usedIndex = rows.some((row) => String(row.key || "").startsWith(expectedIndexPrefix));
  check(label, usedIndex, `indexes: ${rows.map((row) => row.key || "none").join(", ")}`);
}

async function indexExists(label, tableName, indexName) {
  const rows = await query(
    `SELECT INDEX_NAME AS indexName
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND index_name = ?
     LIMIT 1`,
    [tableName, indexName]
  );
  check(label, Boolean(rows[0]), `${tableName}.${indexName}`);
}

async function callController(label, controller, request, maxMs = 750) {
  const response = createJsonResponse();
  await timed(label, async () => controller(request, response), maxMs);
  return response.payload;
}

async function seedData() {
  const result = await query(
    `INSERT INTO customers (full_name, email, phone, password_hash, status)
     VALUES ('QA Performance Customer', ?, ?, 'qa-password-hash', 'active')`,
    [email, phone]
  );
  customerId = result.insertId;

  await query(
    `INSERT INTO customer_credit_wallets
       (customer_id, total_points, available_points, used_points, expired_points)
     VALUES (?, 12000, 8000, 2500, 1500)`,
    [customerId]
  );

  const values = [];
  const placeholders = [];
  for (let index = 1; index <= txCount; index += 1) {
    const isDebit = index % 7 === 0;
    const type = isDebit ? "redemption" : ["signup_bonus", "purchase_cashback", "review_reward", "milestone_reward"][index % 4];
    const points = isDebit ? -100 : 100 + (index % 5) * 10;
    placeholders.push("(?, ?, ?, ?, ?, ?, ?, 'active', DATE_ADD(CURDATE(), INTERVAL 30 DAY))");
    values.push(customerId, type, points, Math.abs(points / 10), `qa-${runId}-${index}`, "qa", `QA performance tx ${index}`);
  }

  await query(
    `INSERT INTO credit_transactions
       (customer_id, transaction_type, points, cashback_value, reference_id, reference_type, note, status, expiry_date)
     VALUES ${placeholders.join(",")}`,
    values
  );
}

async function main() {
  try {
    await cleanup();
    await seedData();

    await explainUsesIndex(
      "Wallet query uses customer wallet unique/indexed lookup",
      "SELECT * FROM customer_credit_wallets WHERE customer_id = ? LIMIT 1",
      [customerId],
      "customer_id"
    );
    await explainUsesIndex(
      "Customer transaction pagination uses customer/date index",
      "SELECT id FROM credit_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20 OFFSET 20",
      [customerId],
      "idx_credit_tx_customer_date"
    );
    await indexExists("Transaction status pagination index exists", "credit_transactions", "idx_credit_tx_customer_status");

    const walletPayload = await callController(
      "Reward wallet API responds within threshold",
      getWallet,
      { customer: { id: customerId } },
      750
    );
    check("Wallet API returns visible available points", Number(walletPayload?.data?.availablePoints || 0) === 8000);

    const transactionsPayload = await callController(
      "Customer transaction pagination responds within threshold",
      getTransactions,
      { customer: { id: customerId }, query: { page: "2", limit: "20", status: "active" } },
      750
    );
    check("Customer transaction pagination returns exactly 20 rows", transactionsPayload?.data?.transactions?.length === 20);

    const adminTransactionsPayload = await callController(
      "Admin transaction pagination responds within threshold",
      listAdminTransactions,
      { query: { page: "1", limit: "25", customerId: String(customerId), status: "active" } },
      1000
    );
    check("Admin transaction pagination returns rows", (adminTransactionsPayload?.data || []).length > 0);

    const walletsPayload = await callController(
      "Dashboard customer wallet list responds within threshold",
      listCustomerWallets,
      { query: { page: "1", limit: "25", search: email } },
      1000
    );
    check("Dashboard wallet list includes QA wallet", (walletsPayload?.data || []).some((wallet) => Number(wallet.customerId) === Number(customerId)));

    await callController("Credit dashboard summary responds within threshold", getCreditSummary, {}, 1000);
    await callController("Main dashboard summary responds within threshold", getDashboardSummary, { query: {} }, 1500);

    const failed = results.filter((result) => !result.passed);
    for (const result of results) {
      console.log(`${result.passed ? "PASS" : "FAIL"} ${result.label}${result.detail ? ` (${result.detail})` : ""}`);
    }

    if (failed.length) {
      console.error(`\n${failed.length} credit performance QA check(s) failed.`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${results.length} credit performance QA checks passed.`);
    }
  } finally {
    await cleanup();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error("Credit performance QA failed:");
  console.error(error.message || error);
  await cleanup().catch(() => {});
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
