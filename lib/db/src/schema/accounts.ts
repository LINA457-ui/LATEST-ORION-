import { boolean, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").primaryKey(),
    displayName: text("display_name").notNull().default("Investor"),
    email: text("email"),
    cashBalance: numeric("cash_balance", { precision: 18, scale: 2 })
      .notNull()
      .default("100000.00"),
    isAdmin: boolean("is_admin").notNull().default(false),
    isSuspended: boolean("is_suspended").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userUnique: uniqueIndex("accounts_user_unique").on(table.userId),
  }),
);

export type Account = typeof accounts.$inferSelect;
