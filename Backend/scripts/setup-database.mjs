import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const rootDir = path.resolve(process.cwd());
const schemaPath = path.join(rootDir, "sql", "schema.sql");
const seedPath = path.join(rootDir, "sql", "seed.sql");

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true
};

function readSql(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .replace(/\r\n/g, "\n")
    .split(/;\s*\n/g)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runStatements(connection, label, statements) {
  let executed = 0;

  for (const statement of statements) {
    try {
      await connection.query(statement);
      executed += 1;
    } catch (error) {
      const ignorableCodes = new Set([
        "ER_DUP_KEYNAME",
        "ER_DUP_FIELDNAME"
      ]);

      if (!ignorableCodes.has(error.code)) {
        throw error;
      }

      console.log(`${label}: skipped already-applied statement (${error.code}).`);
    }
  }

  console.log(`${label}: ${executed} statement(s) applied.`);
}

async function main() {
  const connection = await mysql.createConnection(config);

  try {
    await runStatements(connection, "Schema", readSql(schemaPath));
    await runStatements(connection, "Seed", readSql(seedPath));

    const [healthRows] = await connection.query("SELECT DATABASE() AS activeDatabase");
    console.log(`Database setup complete. Active database: ${healthRows[0]?.activeDatabase || process.env.DB_NAME || "avyona_admin"}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Database setup failed:");
  console.error(error.message || error.code || String(error));
  if (error.cause?.message) {
    console.error(error.cause.message);
  }
  process.exitCode = 1;
});
