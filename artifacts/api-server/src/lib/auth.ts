import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { db, accounts } from "@workspace/db";
import { eq } from "drizzle-orm";

export type AuthedRequest = Request & { userId: string };

function asAuthed(req: Request): AuthedRequest {
  return req as AuthedRequest;
}

export function userIdOf(req: Request): string {
  const r = asAuthed(req);
  return r.userId;
}

export async function ensureAccount(userId: string, displayName?: string) {
  const existing = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(accounts)
    .values({
      userId,
      displayName: displayName ?? "Investor",
      cashBalance: "100000.00",
    })
    .returning();
  return created;
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
