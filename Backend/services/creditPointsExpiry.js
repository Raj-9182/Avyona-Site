import { pool, query } from "../config/db.js";

/**
 * Process all expired credit transactions.
 * Safe to call multiple times — idempotent (only touches 'active' rows).
 *
 * Returns: { processed: number, pointsExpired: number, errors: Array }
 */
export async function runExpiryJob() {
  const expiredGroups = await query(
    `SELECT customer_id,
            SUM(points)      AS total_pts,
            GROUP_CONCAT(id) AS tx_ids
     FROM credit_transactions
     WHERE status = 'active'
       AND points > 0
       AND expiry_date IS NOT NULL
       AND expiry_date < CURDATE()
     GROUP BY customer_id`
  );

  let processed    = 0;
  let pointsExpired = 0;
  const errors     = [];

  for (const group of expiredGroups) {
    try {
      const txIds      = String(group.tx_ids).split(",").map(Number).filter(Boolean);
      const customerId = Number(group.customer_id);
      const confirmed  = await _expireCustomerPoints(customerId, txIds);
      if (confirmed > 0) {
        processed++;
        pointsExpired += confirmed;
      }
    } catch (err) {
      errors.push({ customerId: group.customer_id, error: err?.message || "unknown" });
    }
  }

  return { processed, pointsExpired, errors };
}

async function _expireCustomerPoints(customerId, txIds) {
  if (!txIds.length) return 0;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Re-lock rows inside transaction — handles concurrent runs safely
    const placeholders = txIds.map(() => "?").join(",");
    const [rows] = await connection.execute(
      `SELECT id, points FROM credit_transactions
       WHERE id IN (${placeholders})
         AND status = 'active'
         AND points > 0
       FOR UPDATE`,
      txIds
    );

    if (!rows.length) {
      await connection.rollback();
      return 0; // Already processed by a concurrent run
    }

    const rawConfirmedPts = rows.reduce((sum, r) => sum + Number(r.points), 0);
    const [walletRows] = await connection.execute(
      "SELECT available_points AS availablePoints FROM customer_credit_wallets WHERE customer_id = ? FOR UPDATE",
      [customerId]
    );
    const confirmedPts = Math.min(rawConfirmedPts, Number(walletRows[0]?.availablePoints || 0));
    const confirmedIds = rows.map(r => r.id);
    const confirmPH    = confirmedIds.map(() => "?").join(",");

    // Mark originals as expired
    await connection.execute(
      `UPDATE credit_transactions SET status = 'expired'
       WHERE id IN (${confirmPH})`,
      confirmedIds
    );

    if (confirmedPts > 0) {
      // Insert one negative expiry record (audit trail)
      await connection.execute(
        `INSERT INTO credit_transactions
           (customer_id, transaction_type, points, cashback_value,
            reference_type, note, status)
         VALUES (?, 'expiry', ?, 0, 'system', 'Points expired', 'expired')`,
        [customerId, -confirmedPts]
      );
    }

    // Deduct from available, add to expired counter
    await connection.execute(
      `UPDATE customer_credit_wallets
       SET available_points = GREATEST(0, available_points - ?),
           expired_points   = expired_points + ?
       WHERE customer_id = ?`,
      [confirmedPts, confirmedPts, customerId]
    );

    await connection.commit();
    return confirmedPts;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Returns upcoming expirations grouped by date (used by the dashboard Expiry tab).
 * @param {number} withinDays
 */
export async function getUpcomingExpirations(withinDays = 30) {
  const rows = await query(
    `SELECT
       expiry_date                   AS expiryDate,
       COUNT(*)                      AS transactionCount,
       SUM(points)                   AS totalPoints,
       COUNT(DISTINCT customer_id)   AS customerCount
     FROM credit_transactions
     WHERE status = 'active'
       AND points > 0
       AND expiry_date IS NOT NULL
       AND expiry_date >= CURDATE()
       AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
     GROUP BY expiry_date
     ORDER BY expiry_date ASC`,
    [withinDays]
  );

  return rows.map(r => ({
    expiryDate:       r.expiryDate,
    transactionCount: Number(r.transactionCount),
    totalPoints:      Number(r.totalPoints),
    customerCount:    Number(r.customerCount)
  }));
}
