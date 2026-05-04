import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { createAccountWithSeed } from "./seedPortfolio.js";

export type AuthedRequest = any;

function asAuthed(req: any): AuthedRequest {
  return req as AuthedRequest;
}

export function userIdOf(req: any): string {
  const { userId } = getAuth(req);

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
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