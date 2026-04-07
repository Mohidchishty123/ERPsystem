import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaveApplicationsTable = pgTable("leave_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  departmentId: integer("department_id").notNull(),
  leaveType: text("leave_type").notNull(), // annual | sick | emergency | unpaid | maternity | paternity
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  daysCount: integer("days_count").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  reviewedBy: integer("reviewed_by"),
  reviewerRemarks: text("reviewer_remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const leaveBalancesTable = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  leaveType: text("leave_type").notNull(),
  allocated: integer("allocated").notNull().default(0),
  used: integer("used").notNull().default(0),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeaveApplicationSchema = createInsertSchema(leaveApplicationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeaveApplication = z.infer<typeof insertLeaveApplicationSchema>;
export type LeaveApplication = typeof leaveApplicationsTable.$inferSelect;

export const insertLeaveBalanceSchema = createInsertSchema(leaveBalancesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;
export type LeaveBalance = typeof leaveBalancesTable.$inferSelect;
