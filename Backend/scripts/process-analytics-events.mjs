import { pool } from "../config/db.js";
import { aggregateRawAnalyticsEvents } from "../services/analyticsPipeline.js";

const limit = Number(process.env.ANALYTICS_PROCESS_LIMIT || process.env.ANALYTICS_AGGREGATE_LIMIT || 5000);

try {
  const result = await aggregateRawAnalyticsEvents({ limit });
  console.log(`Analytics processor complete. Processed raw events: ${result.processed}.`);
} catch (error) {
  console.error("Analytics processor failed:");
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
