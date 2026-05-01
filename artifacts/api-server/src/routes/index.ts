import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accountRouter from "./account";
import marketRouter from "./market";
import portfolioRouter from "./portfolio";
import tradingRouter from "./trading";
import paymentsRouter from "./payments";
import openaiRouter from "./openai";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/account", accountRouter);
router.use("/market", marketRouter);
router.use("/portfolio", portfolioRouter);
router.use("/trading", tradingRouter);
router.use("/payments", paymentsRouter);
router.use("/openai", openaiRouter);
router.use("/admin", adminRouter);

export default router;