import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
export const adminPins = pgTable("admin_pins", {
    id: serial("id").primaryKey(),
    pinHash: text("pin_hash").notNull(),
    label: text("label"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => ({
    pinHashUnique: uniqueIndex("admin_pins_pin_hash_unique").on(table.pinHash),
}));
