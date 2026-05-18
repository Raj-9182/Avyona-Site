import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { pool } from "../config/db.js";
import { requireCustomerAuth, requireAdminAuth } from "../middlewares/authMiddleware.js";
import { rateLimit } from "../middlewares/rateLimit.js";

dotenv.config();

const backendRoot = process.cwd();
const results = [];

function check(label, condition, detail = "") {
  results.push({ label, passed: Boolean(condition), detail });
}

function read(relativePath) {
  return fs.readFileSync(path.join(backendRoot, relativePath), "utf8");
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return body;
    }
  };
}

async function expectAuthBlocked(label, middleware, expectedMessage) {
  const response = createResponse();
  let capturedError = null;
  await middleware({ headers: {} }, response, (error) => {
    capturedError = error || null;
  });

  check(label, capturedError?.statusCode === 401 && String(capturedError.message || "").includes(expectedMessage), capturedError?.message || "no error");
}

async function verifyRateLimiter() {
  const limiter = rateLimit({ windowMs: 60_000, max: 2, keyPrefix: `qa-rate-${Date.now()}` });
  const request = { headers: { "x-forwarded-for": "198.51.100.99" }, ip: "198.51.100.99", socket: {} };
  const first = createResponse();
  const second = createResponse();
  const third = createResponse();
  let firstNext = false;
  let secondNext = false;

  limiter(request, first, () => { firstNext = true; });
  limiter(request, second, () => { secondNext = true; });
  limiter(request, third, () => undefined);

  check("Rate limiter allows requests within threshold", firstNext && secondNext);
  check("Rate limiter blocks repeated requests after threshold", third.statusCode === 429, `status ${third.statusCode}`);
}

async function main() {
  const appSource = read("app.js");
  const creditRoutes = read("routes/v1/creditPointsRoutes.js");
  const adminCreditRoutes = read("routes/v1/adminCreditPointsRoutes.js");
  const customerRoutes = read("routes/v1/customerAccountRoutes.js");
  const adminAuthRoutes = read("routes/v1/adminAuthRoutes.js");
  const rewardsService = read("services/creditPointsRewards.js");

  await expectAuthBlocked("Customer credit API auth blocks missing token", requireCustomerAuth, "Customer authorization token");
  await expectAuthBlocked("Admin API auth blocks missing token", requireAdminAuth, "Authorization token");

  check("Global API rate limiting is enabled", /app\.use\("\/api", apiRateLimit\)/.test(appSource));
  check("Customer credit apply endpoint has stricter rate limiting", /\/apply[\s\S]*rateLimit\(\{\s*windowMs:\s*60_000,\s*max:\s*30/.test(creditRoutes));
  check("Customer auth endpoints have route rate limiting", /customerAuthRateLimit/.test(customerRoutes) && /passwordResetRateLimit/.test(customerRoutes));
  check("Admin auth endpoints have route rate limiting", /adminAuthRateLimit/.test(adminAuthRoutes) && /adminBootstrapRateLimit/.test(adminAuthRoutes));
  await verifyRateLimiter();

  check("Customer credit routes require customer auth", /router\.use\(asyncHandler\(requireCustomerAuth\)\)/.test(creditRoutes));
  check("Admin credit routes require admin auth", /router\.use\(asyncHandler\(requireAdminAuth\)\)/.test(adminCreditRoutes));
  check("Admin credit routes enforce credit_points permissions", /requireAdminPermission\("credit_points", "view"\)/.test(adminCreditRoutes) && /requireAdminPermission\("credit_points", "edit"\)/.test(adminCreditRoutes));

  check("Duplicate purchase rewards are locked", /transaction_type = 'purchase_cashback'[\s\S]*FOR UPDATE/.test(rewardsService));
  check("Duplicate review rewards are locked", /transaction_type = 'review_reward'[\s\S]*FOR UPDATE/.test(rewardsService));
  check("Duplicate milestone source order rewards are locked", /reference_id LIKE \?[\s\S]*FOR UPDATE/.test(rewardsService));
  check("Wallet reward grants lock wallet rows", /customer_credit_wallets WHERE customer_id = \? FOR UPDATE/.test(rewardsService));
  check("Reward rules lock usage before increment", /FROM reward_rules[\s\S]*FOR UPDATE/.test(rewardsService) && /used_count = used_count \+ 1/.test(rewardsService));

  const failed = results.filter((result) => !result.passed);
  for (const result of results) {
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.label}${result.detail ? ` (${result.detail})` : ""}`);
  }

  if (failed.length) {
    console.error(`\n${failed.length} security hardening QA check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${results.length} security hardening QA checks passed.`);
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error("Security hardening QA failed:");
  console.error(error.message || error);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
