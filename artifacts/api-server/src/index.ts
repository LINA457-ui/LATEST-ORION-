import app from "./app";
import { logger } from "./lib/logger";
import { ensureDefaultPin } from "./lib/adminPin";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed the default admin PIN (1805) on first boot. Idempotent — only
  // inserts if the admin_pins table is empty.
  ensureDefaultPin().catch((e: unknown) => {
    logger.error({ err: e }, "Failed to seed default admin PIN");
  });
});
