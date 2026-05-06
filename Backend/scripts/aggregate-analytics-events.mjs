import { pool } from "../config/db.js";
import { aggregateRawAnalyticsEvents, detectAbandonedCarts } from "../services/analyticsPipeline.js";

const limit = Number(process.env.ANALYTICS_AGGREGATE_LIMIT || 5000);
const intervalMs = Number(process.env.ANALYTICS_AGGREGATE_INTERVAL_MS || 5 * 60 * 1000);
const abandonedWindowMinutes = Number(process.env.ABANDONED_CART_WINDOW_MINUTES || 45);
const watch = process.argv.includes("--watch") || process.env.ANALYTICS_AGGREGATE_WATCH === "true";

async function runOnce() {
  const result = await aggregateRawAnalyticsEvents({ limit });
  const abandonedResult = await detectAbandonedCarts({ windowMinutes: abandonedWindowMinutes });

  if (result.skipped) {
    console.log(`Analytics aggregation skipped: ${result.reason}`);
    return;
  }

  console.log(
    `Analytics aggregation complete. Processed ${result.processed} raw event(s), range ${result.fromEventId}-${result.toEventId}. Abandoned carts marked: ${abandonedResult.marked}.`
  );
}

try {
  await runOnce();

  if (watch) {
    setInterval(() => {
      runOnce().catch((error) => {
        console.error("Scheduled analytics aggregation failed:");
        console.error(error.message || error);
      });
    }, intervalMs);
  } else {
    await pool.end();
  }
} catch (error) {
  console.error("Analytics aggregation failed:");
  console.error(error.message || error);
  await pool.end();
  process.exitCode = 1;
}
