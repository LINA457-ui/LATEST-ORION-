import { index, numeric, pgTable, serial, text, timestamp, } from "drizzle-orm/pg-core";
export const transactions = pgTable("transactions", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(), // deposit | buy | sell | dividend | fee
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    symbol: text("symbol"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => ({
    userIdx: index("transactions_user_idx").on(table.userId),
}));
