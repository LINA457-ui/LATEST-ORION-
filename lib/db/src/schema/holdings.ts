import {
  index,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const holdings = pgTable(
  "holdings",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    symbol: text("symbol").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 6 })
      .notNull()
      .default("0"),
    averageCost: numeric("average_cost", { precision: 18, scale: 4 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("holdings_user_idx").on(table.userId),
    userSymbolUnique: uniqueIndex("holdings_user_symbol_unique").on(
      table.userId,
      table.symbol,
    ),
  }),
);

export type Holding = typeof holdings.$inferSelect;
