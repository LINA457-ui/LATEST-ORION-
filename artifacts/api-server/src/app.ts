import express from "express";
import { createRequire } from "node:module";
import { logger } from "./lib/logger.js";

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http");

const app: any = express();

app.disable("x-powered-by");
app.set("etag", false);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5000",
  "https://www.investmentorion.com",
  "https://investmentorion.com",
  "https://latest-orion-api-server.vercel.app",
]);

function getCorsOrigin(origin?: string) {
  if (!origin) return "*";

  if (allowedOrigins.has(origin)) return origin;

  try {
    const url = new URL(origin);
    if (url.protocol === "https:" && url.hostname.endsWith(".vercel.app")) {
      return origin;
    }
  } catch {}

  return "";
}

app.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin as string | undefined;
  const corsOrigin = getCorsOrigin(origin);

  if (corsOrigin) {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  res.setHeader(
    "Access-Control-Allow-Headers",
    [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-Admin-Pin",
      "x-admin-pin",
      "X-Admin-Pin-Token",
      "x-admin-pin-token",
    ].join(", ")
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
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

app.get("/api/health", (_req: any, res: any) => {
  res.status(200).json({
    ok: true,
    service: "latest-orion-api-server",
  });
});

app.use("/api", async (req: any, res: any, next: any) => {
  try {
    const mod = await import("./routes/index.js");
    return mod.default(req, res, next);
  } catch (err) {
    console.error("🔥 Failed to load API router:", err);

    return res.status(500).json({
      error: "API router failed to load",
      message: err instanceof Error ? err.message : "Unknown router error",
    });
  }
});

app.use((_req: any, res: any) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use((err: unknown, _req: any, res: any, _next: any) => {
  console.error("🔥 Server Error:", err);

  if (res.headersSent) return;

  res.status(500).json({
    error: err instanceof Error ? err.message : "Internal Server Error",
  });
});

export default app;