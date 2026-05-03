import express from "express";
import { createRequire } from "node:module";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http");

const app: any = express();

app.set("etag", false);

const allowedOrigins = new Set<string>([
  "http://localhost:5173",
  "http://localhost:5000",
  "https://orion-2026-fidelis.vercel.app",
  "https://orion-2026-fidelis-linas-projects-3515e4d1.vercel.app",
  "https://www.investmentorion.com",
  "https://investmentorion.com",
]);

app.use((req: any, res: any, next: any) => {
  const origin = req.headers?.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Pin-Token, x-admin-pin-token",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (_req: any, res: any) => {
  res.status(200).json({
    ok: true,
    service: "latest-orion-api-server",
  });
});

app.get("/health", (_req: any, res: any) => {
  res.status(200).json({
    ok: true,
    service: "latest-orion-api-server",
  });
});

app.use("/api", router);

app.use((err: unknown, _req: any, res: any, _next: any) => {
  console.error("🔥 Server Error:", err);

  if (res.headersSent) return;

  res.status(500).json({
    error: err instanceof Error ? err.message : "Internal Server Error",
  });
});

export default app;