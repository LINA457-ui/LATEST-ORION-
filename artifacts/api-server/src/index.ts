import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { logger } from "./lib/logger";
import { ensureDefaultPin } from "./lib/adminPin";

const port = Number(process.env.PORT || 5000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  ensureDefaultPin().catch((e: unknown) => {
    logger.error({ err: e }, "Failed to seed default admin PIN");
  });
});