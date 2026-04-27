# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/fidelis run dev` — run the Fidelis web app

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Fidelis Investments (`artifacts/fidelis`)
A Fidelity-style investment banking website at root path `/` with:
- Public marketing landing page (deep institutional green theme).
- Clerk auth (`@clerk/react` v6, managed by Replit). Routes: `/sign-in/*?`, `/sign-up/*?`.
- Protected pages (wrapped in `ProtectedRoute` + `Shell`): dashboard, portfolio, markets, markets/:symbol, trade, watchlist, transactions, advisor, funding, funding/success, profile.
- AI advisor with OpenAI streaming SSE (custom fetch-based stream helper at `src/lib/openaiStream.ts` — the generated codegen hook is unused for that endpoint).
- Stripe paper-trading deposits via Checkout.

### API Server (`artifacts/api-server`)
- Express 5 + Drizzle, mounted at `/api` via Replit proxy.
- Auth: Clerk middleware. `requireAuth` + `ensureAccount` ($100k cash for new users) in `src/lib/auth.ts`.
- Simulated market data (20-symbol universe) in `src/lib/marketData.ts`.
- Routes: `account`, `market`, `portfolio`, `trading`, `payments`, `openai` (with SSE).

## Important Notes

- **API client base URL**: The codegen output already includes `/api/...` in every path, so `setBaseUrl` should be set to `import.meta.env.BASE_URL.replace(/\/$/, "")` (NOT `${BASE_URL}/api`) — otherwise paths double to `/api/api/...`.
- **No emojis in UI** — this is a deliberate brand requirement for Fidelis.
- **Stripe is OPTIONAL**: the user dismissed the Stripe integration. The `/api/payments/*` routes return HTTP 503 when `STRIPE_SECRET_KEY` is not set, and the funding pages display a "not configured" notice gracefully. To enable real deposits later, add the Stripe integration (or set `STRIPE_SECRET_KEY` directly).
