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

- DB schemas:
  - `accounts`: `email`, `avatar_url`, `is_admin`, `is_suspended`, plus admin-controlled display overrides: `equity_override`, `market_value_override`, `buying_power_override`, `day_change_override`, `day_change_percent_override` (all numeric, nullable). When non-null, these are returned in the account snapshot so dashboards stay stable across deploys/market-simulator restarts.
  - `admin_pins`: `id`, `pin_hash` (SHA-256 of `${SESSION_SECRET}:${pin}`, with a unique index), `label`, `created_by`, `created_at`. Max 3 PINs (`MAX_PINS` in `src/lib/adminPin.ts`); default `1805` is seeded at server boot via `ensureDefaultPin()`.
- PIN security (`src/lib/adminPin.ts`):
  - `SESSION_SECRET` is REQUIRED at server import (>= 16 chars) — the server fails fast if missing because the secret is the HMAC key for PIN tokens.
  - `POST /api/admin/pin/verify` accepts a PIN and returns a 4-hour HMAC-signed token (`exp.sig`). Token is stored client-side in `sessionStorage["orion_admin_pin_token"]` and sent as `X-Admin-Pin` header on subsequent admin requests.
  - `requirePinVerified` middleware (in `src/lib/auth.ts`) gates ALL admin data endpoints AND PIN management endpoints (so a forgotten PIN actually requires recovery, not just a logout).
- Backend (`src/routes/admin.ts`, behind `requireAuth` + `requireAdmin` + `requirePinVerified`): overview stats, list/detail users (incl. avatarUrl + override values), PATCH user (display name / email / role / suspended; refuses to demote the last admin), PATCH cash (atomic transaction with audit row), PATCH overrides (set/clear any combination of the 5 display overrides), POST/DELETE holding (atomic upsert), DELETE user (atomic cascade; refuses to delete the last admin), POST custom transactions (with arbitrary `createdAt`/type/desc/amount/symbol), PATCH/DELETE transactions, full PIN CRUD with atomic `MAX_PINS` enforcement and DB unique-index uniqueness.
- Avatar upload: `POST /api/account/avatar` accepts `{avatarUrl: string|null}` — accepted format is strict `data:image/(jpeg|png|webp);base64,...` only (no http/https/javascript) and capped at 600KB. Client resizes to 256×256 JPEG via `src/lib/avatarUtils.ts` before upload.
- Frontend (`artifacts/fidelis/src/pages/admin/*`):
  - Pages: overview, users list, user detail (overrides editor + cash + holdings + custom transaction editor + delete-tx + role/suspend + danger-zone delete), system orders, system transactions, **`pins`** (PIN CRUD).
  - `PinGate` modal (`src/components/admin/PinGate.tsx`) intercepts the Admin sidebar link and the `AdminRoute` wrapper. Uses sessionStorage helper `adminPinSession` exported from `src/lib/adminApi.ts`.
  - `adminApi` fetch helper sends Bearer token (Clerk) + `X-Admin-Pin` header. Pass `{withPin:false}` for endpoints that should NOT include the PIN token (`/admin/check`, `/admin/pin/verify`, `/account/sync`, `/account/avatar`). On 401 with `code: "PIN_REQUIRED"` it clears the token and throws `PinRequiredError`.
  - Trash icon buttons across the user-detail page have unique `aria-label`s (`Remove holding <SYM>`, `Delete transaction <id>`, `Permanently delete user account`) so they're unambiguous.
- `useSyncProfile` in `App.tsx` POSTs the signed-in user's Clerk email + full name to `/api/account/sync` once per session, then invalidates the admin-check query so first-user promotion is visible immediately.
- `AdminRoute` wraps admin pages → redirects non-admins to `/dashboard` and shows the PIN gate if a token isn't present in sessionStorage. `useAdminCheck` is cache-keyed by Clerk `user.id`.

## Important Notes

- **API client base URL**: The codegen output already includes `/api/...` in every path, so `setBaseUrl` should be set to `import.meta.env.BASE_URL.replace(/\/$/, "")` (NOT `${BASE_URL}/api`) — otherwise paths double to `/api/api/...`.
- **No emojis in UI** — this is a deliberate brand requirement for Fidelis.
- **Stripe is OPTIONAL**: the user dismissed the Stripe integration. The `/api/payments/*` routes return HTTP 503 when `STRIPE_SECRET_KEY` is not set, and the funding pages display a "not configured" notice gracefully. To enable real deposits later, add the Stripe integration (or set `STRIPE_SECRET_KEY` directly).
