import express from "express";

import healthRouter from "./health.js";
import accountRouter from "./account.js";
import marketRouter from "./market.js";
import portfolioRouter from "./portfolio.js";
import tradingRouter from "./trading.js";
import paymentsRouter from "./payments.js";
import openaiRouter from "./openai.js";
import adminRouter from "./admin.js";

const router: any = express.Router();

router.use(healthRouter);
router.use("/account", accountRouter);
router.use("/market", marketRouter);
router.use("/portfolio", portfolioRouter);
router.use("/trading", tradingRouter);
router.use("/payments", paymentsRouter);
router.use("/openai", openaiRouter);
router.use("/admin", adminRouter);

export default router;