import express from "express";
import apiRouter from "./routes/index.js";
import { createRequire } from "node:module";
import { clerkMiddleware } from "@clerk/express";
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
  if (!origin) return "";

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
    "origin, x-requested-with, content-type, accept, authorization, x-clerk-user-id, x-admin-pin, x-admin-pin-token",
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );

  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
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

app.use(
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }),
);

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

app.use("/api", apiRouter);

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