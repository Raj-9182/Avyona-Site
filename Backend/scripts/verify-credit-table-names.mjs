import fs from "fs";
import path from "path";

const backendRoot = process.cwd();
const scanRoots = ["controllers", "routes", "services", "scripts", "sql"];

const canonicalTables = [
  "credit_settings",
  "customer_credit_wallets",
  "credit_transactions",
  "reward_rules",
  "customer_referral_codes",
  "credit_fraud_logs"
];

const disallowedTables = [
  "customer_credit_transactions",
  "customer_referrals",
  "credit_point_transactions",
  "credit_points_transactions",
  "referral_codes"
];

const allowedExtensions = new Set([".js", ".mjs", ".sql"]);
const ignoredFiles = new Set([path.normalize("scripts/verify-credit-table-names.mjs")]);

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (!allowedExtensions.has(path.extname(entry.name))) return [];
    return [fullPath];
  });
}

const files = scanRoots.flatMap((root) => walkFiles(path.join(backendRoot, root)));
const violations = [];
const foundCanonicalTables = new Set();

for (const filePath of files) {
  const relativePath = path.relative(backendRoot, filePath);
  if (ignoredFiles.has(path.normalize(relativePath))) continue;

  const content = fs.readFileSync(filePath, "utf8");

  for (const tableName of canonicalTables) {
    if (new RegExp(`\\b${tableName}\\b`).test(content)) {
      foundCanonicalTables.add(tableName);
    }
  }

  for (const tableName of disallowedTables) {
    const regex = new RegExp(`\\b${tableName}\\b`, "g");
    const matches = [...content.matchAll(regex)];
    for (const match of matches) {
      const before = content.slice(0, match.index);
      const line = before.split(/\r?\n/).length;
      violations.push(`${relativePath}:${line} uses disallowed credit table name "${tableName}"`);
    }
  }
}

const missingCanonicalTables = canonicalTables.filter((tableName) => !foundCanonicalTables.has(tableName));

if (violations.length || missingCanonicalTables.length) {
  console.error("Credit table naming verification failed.");

  if (violations.length) {
    console.error("\nDisallowed table names:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
  }

  if (missingCanonicalTables.length) {
    console.error("\nMissing canonical table references:");
    for (const tableName of missingCanonicalTables) {
      console.error(`- ${tableName}`);
    }
  }

  process.exitCode = 1;
} else {
  console.log("PASS Credit table naming is standardized.");
  console.log(`Canonical tables: ${canonicalTables.join(", ")}`);
}
