import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { db, accounts } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createAccountWithSeed } from "./seedPortfolio";

export type AuthedRequest = Request & { userId: string };

function asAuthed(req: Request): AuthedRequest {
  return req as AuthedRequest;
}

export function userIdOf(req: Request): string {
  const r = asAuthed(req);
  return r.userId;
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

  if (existing[0]) {
    const updates: Partial<typeof accounts.$inferInsert> = {};
    if (email && existing[0].email !== email) updates.email = email;
    if (
      displayName &&
      displayName !== "Investor" &&
      (existing[0].displayName === "Investor" || !existing[0].displayName)
    ) {
      updates.displayName = displayName;
    }
    if (Object.keys(updates).length > 0) {
      const [updated] = await db
        .update(accounts)
        .set(updates)
        .where(eq(accounts.userId, userId))
        .returning();
      return updated || existing[0];
    }
    return existing[0];
  }

  // First user automatically becomes admin
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(accounts);
  const isFirstUser = Number(count) === 0;

  try {
    await createAccountWithSeed(userId, displayName ?? "Investor");
    if (email || isFirstUser) {
      await db
        .update(accounts)
        .set({
          ...(email ? { email } : {}),
          ...(isFirstUser ? { isAdmin: true } : {}),
        })
        .where(eq(accounts.userId, userId));
    }
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
        displayName: displayName ?? "Investor",
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

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  asAuthed(req).userId = String(userId);
  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = userIdOf(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (!account?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
