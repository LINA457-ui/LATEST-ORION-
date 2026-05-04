export default async function handler(req, res) {
  const origin = req.headers.origin;

  const allowedOrigins = [
    "https://www.investmentorion.com",
    "https://investmentorion.com",
    "http://localhost:5173",
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Vary", "Origin");

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Pin, x-admin-pin, X-Admin-Pin-Token, x-admin-pin-token"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const mod = await import("../artifacts/api-server/dist/index.js");
    const app = mod.default;

    return app(req, res);
  } catch (err) {
    console.error("API handler crashed:", err);

    return res.status(500).json({
      error: "API handler crashed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}