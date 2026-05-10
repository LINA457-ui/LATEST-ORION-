import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { createAccountWithSeed } from "./seedPortfolio.js";
function asAuthed(req) {
    return req;
}
function generateAccountNumber() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}
async function generateUniqueAccountNumber() {
    for (let attempt = 0; attempt < 10; attempt++) {
        const accountNumber = generateAccountNumber();
        const existing = await db
            .select()
            .from(accounts)
            .where(eq(accounts.accountNumber, accountNumber))
            .limit(1);
        if (!existing[0]) {
            return accountNumber;
        }
    }
    throw new Error("Failed to generate unique account number");
}
export function userIdOf(req) {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new Error("Unauthorized");
    }
    return userId;
}
export async function ensureAccount(userId, displayName, email) {
    const existing = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId))
        .limit(1);
    if (existing[0]) {
        if (!existing[0].accountNumber) {
            const accountNumber = await generateUniqueAccountNumber();
            const [updated] = await db
                .update(accounts)
                .set({ accountNumber })
                .where(eq(accounts.userId, userId))
                .returning();
            return updated ?? existing[0];
        }
        return existing[0];
    }
    const [{ count }] = await db
        .select({ count: sql `count(*)::int` })
        .from(accounts);
    const isFirstUser = Number(count) === 0;
    const safeDisplayName = displayName?.trim() || email?.split("@")[0] || "Investor";
    const accountNumber = await generateUniqueAccountNumber();
    try {
        await createAccountWithSeed(userId, safeDisplayName);
        const [updated] = await db
            .update(accounts)
            .set({
            accountNumber,
            displayName: safeDisplayName,
            email: email ?? null,
            isAdmin: isFirstUser,
        })
            .where(eq(accounts.userId, userId))
            .returning();
        if (updated)
            return updated;
        const [final] = await db
            .select()
            .from(accounts)
            .where(eq(accounts.userId, userId))
            .limit(1);
        return final;
    }
    catch (err) {
        console.error("[ensureAccount] creation failed; using flat fallback", err);
        const [created] = await db
            .insert(accounts)
            .values({
            userId,
            accountNumber,
            displayName: safeDisplayName,
            email: email ?? null,
            cashBalance: "0.00",
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
        if (afterConflict && !afterConflict.accountNumber) {
            const newAccountNumber = await generateUniqueAccountNumber();
            const [updated] = await db
                .update(accounts)
                .set({ accountNumber: newAccountNumber })
                .where(eq(accounts.userId, userId))
                .returning();
            return updated ?? afterConflict;
        }
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
