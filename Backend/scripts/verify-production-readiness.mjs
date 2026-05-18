import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const backendRoot = process.cwd();
const repoRoot = path.resolve(backendRoot, "..");
const results = [];

function check(label, condition, detail = "") {
  results.push({ label, passed: Boolean(condition), detail });
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function packageScript(packageJsonPath, scriptName) {
  const pkg = JSON.parse(read(packageJsonPath));
  return Boolean(pkg.scripts?.[scriptName]);
}

function envValue(name) {
  return String(process.env[name] || "").trim();
}

const backendPackage = path.join(backendRoot, "package.json");
const frontendPackage = path.join(repoRoot, "Frontend", "package.json");
const dashboardPackage = path.join(repoRoot, "Dashboard", "package.json");
const envSource = read(path.join(backendRoot, "config", "env.js"));
const serverSource = read(path.join(backendRoot, "server.js"));
const expiryServicePath = path.join(backendRoot, "services", "creditPointsExpiry.js");

check("Backend start script exists", packageScript(backendPackage, "start"));
check("Backend syntax target files exist", exists(path.join(backendRoot, "server.js")) && exists(path.join(backendRoot, "app.js")));
check("Frontend build script exists", packageScript(frontendPackage, "build"));
check("Dashboard build script exists", packageScript(dashboardPackage, "build"));
check("Credit expiry cron service exists", exists(expiryServicePath));
check("Server starts credit expiry cron on interval", /runExpiryJob/.test(serverSource) && /setInterval\(runExpiry/.test(serverSource));
check("Manual credit expiry endpoint exists", /triggerExpiryJob/.test(read(path.join(backendRoot, "routes", "v1", "adminCreditPointsRoutes.js"))));

const requiredEnvNames = [
  "NODE_ENV",
  "PORT",
  "FRONTEND_ORIGIN",
  "SITE_URL",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_SECRET",
  "JWT_EXPIRES_IN"
];
for (const name of requiredEnvNames) {
  check(`Env config defines ${name}`, envSource.includes(`process.env.${name}`));
}

const isProduction = envValue("NODE_ENV") === "production";
if (isProduction) {
  check("Production JWT_SECRET is not default", envValue("JWT_SECRET") && envValue("JWT_SECRET") !== "change_this_to_a_long_secure_secret");
  check("Production DB_PASSWORD is set", Boolean(envValue("DB_PASSWORD")));
  check("Production FRONTEND_ORIGIN is not localhost", Boolean(envValue("FRONTEND_ORIGIN")) && !/localhost|127\.0\.0\.1/.test(envValue("FRONTEND_ORIGIN")));
  check("Production SITE_URL is not localhost", Boolean(envValue("SITE_URL")) && !/localhost|127\.0\.0\.1/.test(envValue("SITE_URL")));
  check("Production local dev admin bypass is disabled", envValue("ALLOW_LOCAL_DEV_ADMIN") !== "true");
} else {
  check("Production env strict validation is ready", true, "Set NODE_ENV=production to enforce live secret/origin checks.");
}

const failed = results.filter((result) => !result.passed);
for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.label}${result.detail ? ` (${result.detail})` : ""}`);
}

if (failed.length) {
  console.error(`\n${failed.length} production readiness check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${results.length} production readiness checks passed.`);
}
