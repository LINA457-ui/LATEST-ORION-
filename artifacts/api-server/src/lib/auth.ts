import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { createAccountWithSeed } from "./seedPortfolio.js";

export type AuthedRequest = any;

function asAuthed(req: any): AuthedRequest {
  return req as AuthedRequest;
}

function getHeader(req: any, name: string) {
  return req.headers?.[name] || req.headers?.[name.toLowerCase()];
}

function getUserIdFromBearerToken(req: any): string | null {
  const authHeader = getHeader(req, "authorization");

  if (!authHeader || !String(authHeader).startsWith("Bearer ")) {
    return null;
  }

  const token = String(authHeader).replace("Bearer ", "").trim();
  const payloadPart = token.split(".")[1];

  if (!payloadPart) return null;

  try {
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      Buffer.from(normalized, "base64").toString("utf8"),
    );

    return payload?.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

export function userIdOf(req: any): string {
  // 1. Direct header (dev / fallback)
  const headerUserId =
    getHeader(req, "x-clerk-user-id") ||
    getHeader(req, "X-Clerk-User-Id");

  if (headerUserId) return String(headerUserId);

  // 2. Authorization token (Clerk JWT)
  const authHeader = getHeader(req, "authorization");

  if (authHeader && String(authHeader).startsWith("Bearer ")) {
    const token = String(authHeader).replace("Bearer ", "");

    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("Invalid JWT");

      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf8"),
      );

      if (payload?.sub) {
        return payload.sub;
      }
    } catch (err) {
      console.error("[AUTH ERROR] Failed to parse token:", err);
    }
  }

  throw new Error("Unauthorized: missing Clerk user id");
}
export async function ensureAccount(
  userId: string,
  displayName?: string,
  email?: string,
) {
  const existing = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(accounts);

  const isFirstUser = Number(count) === 0;
  const safeDisplayName =
    displayName?.trim() || email?.split("@")[0] || "Investor";

  try {
    await createAccountWithSeed(userId, safeDisplayName);

    await db
      .update(accounts)
      .set({
        displayName: safeDisplayName,
        email: email ?? null,
        isAdmin: isFirstUser,
      })
      .where(eq(accounts.userId, userId));

    const [final] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1);

    return final;
  } catch (err) {
    console.error("[ensureAccount] creation failed; using flat fallback", err);

    const [created] = await db
      .insert(accounts)
      .values({
        userId,
        displayName: safeDisplayName,
        email: email ?? null,
        cashBalance: "0.00",
        isAdmin: isFirstUser,
      })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    const [afterConflict] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1);

    return afterConflict;
  }
}

export function requireAuth(req: any, res: any, next: any) {
  try {
    asAuthed(req).userId = userIdOf(req);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export async function requireAdmin(req: any, res: any, next: any) {
  try {
    const userId = userIdOf(req);
    const account = await ensureAccount(
      userId,
      req.body?.displayName,
      req.body?.email,
    );

    if (!account || !account.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    asAuthed(req).userId = userId;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePinVerified(_req: any, _res: any, next: any) {
  next();
}