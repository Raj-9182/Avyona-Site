import app from "./app.js";
import { pingDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { runExpiryJob } from "./services/creditPointsExpiry.js";

const EXPIRY_INTERVAL_MS = 24 * 60 * 60 * 1000; // run daily

async function runExpiry() {
  try {
    const result = await runExpiryJob();
    if (result.processed > 0) {
      console.log(`[CreditExpiry] ${new Date().toISOString()} — ${result.processed} customer(s), ${result.pointsExpired} pts expired`);
    }
    if (result.errors.length) {
      console.warn(`[CreditExpiry] ${result.errors.length} error(s):`, result.errors);
    }
  } catch (err) {
    console.error("[CreditExpiry] Job failed:", err.message);
  }
}

async function startServer() {
  try {
    await pingDatabase();
    console.log("MySQL connection established");
  } catch (error) {
    console.warn(`MySQL connection not ready: ${error.message}`);
  }

  app.listen(env.port, () => {
    console.log(`Avyona backend listening on http://localhost:${env.port}`);
  });

  // Run once 15 s after startup, then every 24 hours
  setTimeout(runExpiry, 15_000);
  setInterval(runExpiry, EXPIRY_INTERVAL_MS);
}

startServer();
