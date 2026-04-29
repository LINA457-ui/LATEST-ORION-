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

### Orion Investment (`artifacts/fidelis`)
NOTE: directory and pnpm package name remain `fidelis` (do not rename — it would force re-registering the artifact). User-facing brand is "Orion Investment".

A Fidelity-style investment banking website at root path `/` with:
- Public marketing landing page (deep institutional green theme).
- Clerk auth (`@clerk/react` v6, managed by Replit). Routes: `/sign-in/*?`, `/sign-up/*?`.
- Protected pages (wrapped in `ProtectedRoute` + `Shell`): dashboard, portfolio, markets, markets/:symbol, trade, watchlist, transactions, advisor, funding, funding/success, profile.
- AI advisor with OpenAI streaming SSE (custom fetch-based stream helper at `src/lib/openaiStream.ts` — the generated codegen hook is unused for that endpoint).
- Stripe paper-trading deposits via Checkout.

### API Server (`artifacts/api-server`)
- Express 5 + Drizzle, mounted at `/api` via Replit proxy.
- Auth: Clerk middleware. `requireAuth` + `ensureAccount` ($100k cash for new users) in `src/lib/auth.ts`. The very first account created in the DB is auto-promoted to admin.
- Simulated market data (20-symbol universe) in `src/lib/marketData.ts`.
- Routes: `account` (incl. `POST /account/sync` to push Clerk email/name into the DB), `market`, `portfolio`, `trading` (blocks suspended accounts with HTTP 403), `payments`, `openai` (with SSE), `admin`.

### Admin section
Full admin tooling at `/admin/*` (web) and `/api/admin/*` (server). Sidebar shows an "Admin" link conditionally via `useAdminCheck()`.

- DB: `accounts` schema has `email`, `is_admin`, `is_suspended` columns.
- Backend (`artifacts/api-server/src/routes/admin.ts`, gated by `requireAdmin`): overview stats, list users, user detail (with current positions/orders/transactions), PATCH user (display name / email / isAdmin / isSuspended — refuses to demote the last admin), PATCH cash (atomic `db.transaction` writing both the new balance AND an audit row in `transactions`), POST/DELETE holding (atomic `onConflictDoUpdate` upsert keyed on the unique `(user_id, symbol)` index), DELETE user (atomic transactional cascade — refuses to delete the last admin), system-wide orders and transactions log (joined via Drizzle `inArray`).
- Frontend (`artifacts/fidelis/src/pages/admin/*`): overview, users list, user detail (cash + holdings + role + suspend + danger-zone delete), system orders log, system transactions log. Uses a small fetch helper at `src/lib/adminApi.ts` with the Clerk session token (no openapi codegen for admin to keep iteration fast).
- `useSyncProfile` in `App.tsx` POSTs the signed-in user's Clerk email + full name to `/api/account/sync` once per session, then invalidates the admin-check query so first-user promotion is visible immediately.
- `AdminRoute` wraps admin pages → redirects non-admins to `/dashboard`. `useAdminCheck` is cache-keyed by Clerk `user.id` to avoid stale state across account switches.

## Important Notes

- **API client base URL**: The codegen output already includes `/api/...` in every path, so `setBaseUrl` should be set to `import.meta.env.BASE_URL.replace(/\/$/, "")` (NOT `${BASE_URL}/api`) — otherwise paths double to `/api/api/...`.
- **No emojis in UI** — this is a deliberate brand requirement for Fidelis.
- **Stripe is OPTIONAL**: the user dismissed the Stripe integration. The `/api/payments/*` routes return HTTP 503 when `STRIPE_SECRET_KEY` is not set, and the funding pages display a "not configured" notice gracefully. To enable real deposits later, add the Stripe integration (or set `STRIPE_SECRET_KEY` directly).
