import {
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const watchlist = pgTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    symbol: text("symbol").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("watchlist_user_idx").on(table.userId),
    userSymbolUnique: uniqueIndex("watchlist_user_symbol_unique").on(
      table.userId,
      table.symbol,
    ),
  }),
);

export type WatchlistEntry = typeof watchlist.$inferSelect;
