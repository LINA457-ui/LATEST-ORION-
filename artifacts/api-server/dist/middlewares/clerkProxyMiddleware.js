import { createProxyMiddleware } from "http-proxy-middleware";
const CLERK_FAPI = "https://frontend-api.clerk.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";
function noopMiddleware(_req, _res, next) {
    next();
}
export function clerkProxyMiddleware() {
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
        pathRewrite: (path) => {
            return path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), "");
        },
        on: {
            proxyReq: (proxyReq, req) => {
                const protocol = req.headers["x-forwarded-proto"] ||
                    req.protocol ||
                    "https";
                const host = req.headers.host || "";
                const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;
                proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
                proxyReq.setHeader("Clerk-Secret-Key", secretKey);
                const forwardedFor = req.headers["x-forwarded-for"];
                const clientIp = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
                    ?.split(",")[0]
                    ?.trim() ||
                    req.socket?.remoteAddress ||
                    "";
                if (clientIp) {
                    proxyReq.setHeader("X-Forwarded-For", clientIp);
                }
            },
            error: (err, _req, res) => {
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
    });
}
