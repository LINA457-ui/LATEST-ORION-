import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import { ensureDefaultPin } from "./lib/adminPin.js";
let pinSeedStarted = false;
if (!pinSeedStarted) {
    pinSeedStarted = true;
    ensureDefaultPin().catch((err) => {
        console.error("Failed to seed default admin PIN", err);
    });
}
if (!process.env.VERCEL) {
    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => {
        console.log(`API server running on http://localhost:${port}`);
    });
}
export default app;
