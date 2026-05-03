import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { logger } from "./lib/logger.js";
import { ensureDefaultPin } from "./lib/adminPin.js";

const port = Number(process.env.PORT || 5000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");

  ensureDefaultPin().catch((err: unknown) => {
    logger.error({ err }, "Failed to seed default admin PIN");
  });
});