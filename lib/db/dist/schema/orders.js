import { index, numeric, pgTable, serial, text, timestamp, } from "drizzle-orm/pg-core";
export const orders = pgTable("orders", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    symbol: text("symbol").notNull(),
    side: text("side").notNull(), // buy | sell
    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),
    price: numeric("price", { precision: 18, scale: 4 }).notNull(),
    total: numeric("total", { precision: 18, scale: 2 }).notNull(),
    status: text("status").notNull().default("filled"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => ({
    userIdx: index("orders_user_idx").on(table.userId),
}));
