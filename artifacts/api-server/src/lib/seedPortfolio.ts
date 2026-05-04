import { db } from "@workspace/db";
import { accounts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function createAccountWithSeed(
  userId: string,
  displayName: string,
) {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1);

    if (existing[0]) return existing[0];

    const insertedAccounts = await tx
      .insert(accounts)
      .values({
        userId,
        displayName,
        cashBalance: "0.00",
      })
      .onConflictDoNothing()
      .returning();

    if (insertedAccounts[0]) return insertedAccounts[0];

    const [existingAfterRace] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .limit(1);

    return existingAfterRace;
  });
}