import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  departmentId: integer("department_id").notNull(),
  category: text("category").notNull(), // hr | department | payroll | interpersonal | other
  title: text("title").notNull(),
  description: text("description").notNull(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: text("status").notNull().default("submitted"), // submitted | under_review | resolved | escalated
  assignedTo: integer("assigned_to"),
  response: text("response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({ id: true, createdAt: true, updatedAt: true } as any);
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
