import express from "express";

const router: any = express.Router();

router.get("/healthz", (_req: any, res: any) => {
  res.status(200).json({
    status: "ok",
  });
});

export default router;