import { db } from "../../../../lib/db/dist/index.js";
import { accounts } from "../../../../lib/db/dist/schema/index.js";
import { eq } from "drizzle-orm";

export async function syncClerkUserToDb(userId: string) {
  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(accounts)
    .values({
      userId,
      displayName: "User",
      email: "user@email.com",
      avatarUrl: null,
      cashBalance: "100000.00",
      isAdmin: false,
      isSuspended: false,
    })
    .returning();

  return created;
}