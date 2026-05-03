import type { NextFunction, Request, Response } from "express";
import { db } from "../../../../lib/db/src/index.js";
import { accounts } from "../../../../lib/db/src/schema/index.js";
import { eq, sql } from "drizzle-orm";
import { createAccountWithSeed } from "./seedPortfolio.js";

export type AuthedRequest = Request & { userId: string };

const DEV_USER_ID = "dev-user";
const DEV_EMAIL = "dev@example.com";
const DEV_NAME = "Dev Admin";

function asAuthed(req: Request): AuthedRequest {
  return req as AuthedRequest;
}

export function userIdOf(req: Request): string {
  return asAuthed(req).userId || DEV_USER_ID;
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
        isAdmin: true,
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
        isAdmin: isFirstUser || true,
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
  _res: Response,
  next: NextFunction,
) {
  asAuthed(req).userId = DEV_USER_ID;
  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = userIdOf(req);
    const account = await ensureAccount(userId, DEV_NAME, DEV_EMAIL);

    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await db
      .update(accounts)
      .set({ isAdmin: true })
      .where(eq(accounts.userId, userId));

    asAuthed(req).userId = userId;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePinVerified(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  next();
}