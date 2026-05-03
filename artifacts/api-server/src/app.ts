import express, { Request, Response, NextFunction } from "express";
import { createRequire } from "node:module";
import { logger } from "./lib/logger.js";

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http");

const app = express();

app.disable("x-powered-by");
app.set("etag", false);

const allowedOrigins = new Set<string>([
  "http://localhost:5173",
  "http://localhost:5000",
  "https://www.investmentorion.com",
  "https://investmentorion.com",
  "https://latest-orion-api-server.vercel.app",
]);

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return false;

  if (allowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  res.setHeader("X-Debug-Cors", "working");
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");

  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin as string);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader(
    "Access-Control-Allow-Headers",
    [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-Admin-Pin-Token",
      "x-admin-pin-token",
    ].join(", "),
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
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

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: "latest-orion-api-server",
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: "latest-orion-api-server",
  });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: "latest-orion-api-server",
  });
});

/**
 * Lazy-load routes so /health and /api/health do not crash
 * if one route file has a DB/env/import error.
 */
app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
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

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Server Error:", err);

  if (res.headersSent) return;

  res.status(500).json({
    error: err instanceof Error ? err.message : "Internal Server Error",
  });
});

export default app;