import mysql from "mysql2/promise";
import { env } from "./env.js";

const pool = mysql.createPool({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true
});

export async function query(sql, values = []) {
  const [rows] = await pool.query(sql, values);
  return rows;
}

export async function pingDatabase() {
  await pool.query("SELECT 1");
}

export { pool };
