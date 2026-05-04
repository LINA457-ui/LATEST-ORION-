import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const conversations = pgTable("conversations", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => ({
    userIdx: index("conversations_user_idx").on(table.userId),
}));
export const insertConversationSchema = createInsertSchema(conversations).omit({
    id: true,
    createdAt: true,
});
