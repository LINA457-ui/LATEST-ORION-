import { createProxyMiddleware } from "http-proxy-middleware";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ClientRequest } from "node:http";

const CLERK_FAPI = "https://frontend-api.clerk.dev";

export const CLERK_PROXY_PATH = "/api/__clerk";

function noopMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next();
}

export function clerkProxyMiddleware(): RequestHandler {
  const isProduction = process.env.NODE_ENV === "production";
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!isProduction) {
    return noopMiddleware;
  }

  if (!secretKey) {
    console.warn("[Clerk Proxy] CLERK_SECRET_KEY is missing. Clerk proxy disabled.");
    return noopMiddleware;
  }

  return createProxyMiddleware({
    target: CLERK_FAPI,
    changeOrigin: true,

    pathRewrite: (path: string) => {
      return path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), "");
    },

    on: {
      proxyReq: (proxyReq: ClientRequest, req: Request) => {
        const protocol =
          (req.headers["x-forwarded-proto"] as string) ||
          req.protocol ||
          "https";

        const host = req.headers.host || "";
        const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

        proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
        proxyReq.setHeader("Clerk-Secret-Key", secretKey);

        const forwardedFor = req.headers["x-forwarded-for"];

        const clientIp =
          (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
            ?.split(",")[0]
            ?.trim() ||
          req.socket?.remoteAddress ||
          "";

        if (clientIp) {
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
      },

      error: (err: Error, _req: Request, res: Response) => {
        console.error("[Clerk Proxy] Proxy error:", err);

        if (!res.headersSent) {
          res.status(502).json({
            error: "Clerk proxy failed",
          });
          return;
        }

        res.end();
      },
    },
  }) as RequestHandler;
}