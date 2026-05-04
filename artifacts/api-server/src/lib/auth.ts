import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { createAccountWithSeed } from "./seedPortfolio.js";

export type AuthedRequest = any;

const DEV_USER_ID = "dev-user";
const DEV_EMAIL = "dev@example.com";
const DEV_NAME = "Dev Admin";

function asAuthed(req: any): AuthedRequest {
  return req as AuthedRequest;
}

function getHeader(req: any, name: string) {
  return req.headers?.[name] || req.headers?.[name.toLowerCase()];
}

export function userIdOf(req: any): string {
  const userId =
    asAuthed(req).userId ||
    asAuthed(req).auth?.userId ||
    getHeader(req, "x-clerk-user-id") ||
    req.body?.userId ||
    req.body?.clerkUserId;

  if (userId) return String(userId);

  if (process.env.NODE_ENV !== "production") return DEV_USER_ID;

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

  try {
    await createAccountWithSeed(userId, displayName ?? DEV_NAME);

    await db
      .update(accounts)
      .set({
        ...(email ? { email } : {}),
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
    console.error("[ensureAccount] seeded creation failed; using flat fallback", err);

    const [created] = await db
      .insert(accounts)
      .values({
        userId,
        displayName: displayName ?? DEV_NAME,
        email: email ?? null,
        cashBalance: "100000.00",
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
    const account = await ensureAccount(userId, req.body?.displayName, req.body?.email);

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