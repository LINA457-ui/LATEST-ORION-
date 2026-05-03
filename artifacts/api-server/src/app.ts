import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors, { type CorsOptions } from "cors";
import { createRequire } from "node:module";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http") as any;

const app: Express = express();

app.set("etag", false);

const corsOptions: CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Admin-Pin-Token",
    "x-admin-pin-token",
  ],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (origin) {
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
      req(req: Request & { id?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: Response) {
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

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Server Error:", err);

  if (res.headersSent) return;

  res.status(500).json({
    error: err instanceof Error ? err.message : "Internal Server Error",
  });
});

export default app;