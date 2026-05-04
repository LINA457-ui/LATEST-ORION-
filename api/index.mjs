export default async function handler(req, res) {
  const mod = await import("../artifacts/api-server/dist/app.js");
  const app = mod.default;

  return app(req, res);
}
