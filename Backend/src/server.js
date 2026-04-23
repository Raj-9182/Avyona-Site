import app from "./app.js";
import { pingDatabase } from "./config/db.js";
import { env } from "./config/env.js";

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
}

startServer();
