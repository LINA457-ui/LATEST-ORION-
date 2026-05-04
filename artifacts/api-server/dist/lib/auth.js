import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { createAccountWithSeed } from "./seedPortfolio.js";
function asAuthed(req) {
    return req;
}
function getHeader(req, name) {
    return req.headers?.[name] || req.headers?.[name.toLowerCase()];
}
export function userIdOf(req) {
    const userId = asAuthed(req).userId ||
        asAuthed(req).auth?.userId ||
        getHeader(req, "x-clerk-user-id") ||
        req.body?.userId ||
        req.body?.clerkUserId;
    if (userId)
        return String(userId);
    throw new Error("Unauthorized: missing Clerk user id");
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
    const safeDisplayName = displayName?.trim() || email?.split("@")[0] || "Investor";
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
    }
    catch (err) {
        console.error("[ensureAccount] seeded creation failed; using flat fallback", err);
        const [created] = await db
            .insert(accounts)
            .values({
            userId,
            displayName: safeDisplayName,
            email: email ?? null,
            cashBalance: "100000.00",
            isAdmin: isFirstUser,
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
export function requireAuth(req, res, next) {
    try {
        asAuthed(req).userId = userIdOf(req);
        next();
    }
    catch {
        res.status(401).json({ error: "Unauthorized" });
    }
}
export async function requireAdmin(req, res, next) {
    try {
        const userId = userIdOf(req);
        const account = await ensureAccount(userId, req.body?.displayName, req.body?.email);
        if (!account || !account.isAdmin) {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
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
