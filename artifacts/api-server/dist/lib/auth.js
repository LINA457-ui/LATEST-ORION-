import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { createAccountWithSeed } from "./seedPortfolio.js";
const DEV_USER_ID = "dev-user";
const DEV_EMAIL = "dev@example.com";
const DEV_NAME = "Dev Admin";
function asAuthed(req) {
    return req;
}
export function userIdOf(req) {
    return asAuthed(req).userId || DEV_USER_ID;
}
export async function ensureAccount(userId, displayName, email) {
    const existing = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .limit(1);
    if (existing[0])
        return existing[0];
    const [{ count }] = await db
        .select({ count: sql `count(*)::int` })
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
    }
    catch (err) {
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
        if (created)
            return created;
        const [afterConflict] = await db
            .select()
            .from(accounts)
            .where(eq(accounts.userId, userId))
            .limit(1);
        return afterConflict;
    }
}
export function requireAuth(req, _res, next) {
    asAuthed(req).userId = DEV_USER_ID;
    next();
}
export async function requireAdmin(req, res, next) {
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
    }
    catch (err) {
        next(err);
    }
}
export function requirePinVerified(_req, _res, next) {
    next();
}
