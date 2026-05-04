import {
  boolean,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").primaryKey(),

    displayName: text("display_name").notNull().default("Investor"),
    email: text("email"),
    avatarUrl: text("avatar_url"),

    phoneNumber: text("phone_number"),
    homeAddress: text("home_address"),
    mothersMaidenName: text("mothers_maiden_name"),

    cashBalance: numeric("cash_balance", { precision: 18, scale: 2 })
      .notNull()
      .default("100000.00"),

    equityOverride: numeric("equity_override", { precision: 18, scale: 2 }),
    marketValueOverride: numeric("market_value_override", {
      precision: 18,
      scale: 2,
    }),
    buyingPowerOverride: numeric("buying_power_override", {
      precision: 18,
      scale: 2,
    }),
    dayChangeOverride: numeric("day_change_override", {
      precision: 18,
      scale: 2,
    }),
    dayChangePercentOverride: numeric("day_change_percent_override", {
      precision: 8,
      scale: 4,
    }),

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