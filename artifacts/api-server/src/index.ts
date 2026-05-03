import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { ensureDefaultPin } from "./lib/adminPin.js";

let pinSeedStarted = false;

if (!pinSeedStarted) {
  pinSeedStarted = true;

  ensureDefaultPin().catch((err: unknown) => {
    console.error("Failed to seed default admin PIN", err);
  });
}

export default app;