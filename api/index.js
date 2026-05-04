export default async function handler(req, res) {
  try {
    const mod = await import("../artifacts/api-server/dist/app.js");
    const app = mod.default;

    return app(req, res);
  } catch (err) {
    console.error("API handler crashed:", err);

    return res.status(500).json({
      error: "API handler crashed",
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
    });
  }
}
