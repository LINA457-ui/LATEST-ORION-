import express, { Request, Response, NextFunction } from "express";
import { createRequire } from "node:module";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http");

const app = express();

app.disable("x-powered-by");
app.set("etag", false);

/**
 * Allowed origins
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "https://www.investmentorion.com",
  "https://investmentorion.com",
];

/**
 * CORS Middleware (FIXED)
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // 🔥 ALWAYS allow your frontend (fixes production issue)
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (origin?.includes(".vercel.app")) {
    // allow preview deployments
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // fallback (VERY IMPORTANT for debugging)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Pin-Token"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  // 🔥 MUST respond to preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/**
 * Logger
 */
app.use(
  pinoHttp({
    logger,
  })
);

/**
 * Body parsers
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * Health routes
 */
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "latest-orion-api-server" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * API
 */
app.use("/api", router);

/**
 * 404
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

/**
 * Error handler
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Server Error:", err);

  res.status(500).json({
    error: err?.message || "Internal Server Error",
  });
});

export default app;