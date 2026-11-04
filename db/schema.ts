import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(), number: text("number").notNull().unique(), title: text("title").notNull(),
  program: text("program").notNull(), category: text("category").notNull(), priority: text("priority").notNull(),
  status: text("status").notNull().default("new"), reporter: text("reporter").notNull(), office: text("office").notNull(),
  email: text("email").notNull(), description: text("description").notNull(), assignee: text("assignee").notNull().default(""),
  createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(), events: text("events").notNull(),
  attachments: text("attachments").notNull().default("[]"), creatorId: text("creator_id").notNull()
});