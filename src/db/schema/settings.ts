import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companySettingsTable = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("My Company"),
  logoUrl: text("logo_url"),
  timezone: text("timezone").notNull().default("UTC"),
  workStartTime: text("work_start_time").notNull().default("09:00"),
  workEndTime: text("work_end_time").notNull().default("18:00"),
  payrollCycleDay: integer("payroll_cycle_day").notNull().default(25),
  lateThresholdMinutes: integer("late_threshold_minutes").notNull().default(15),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").notNull(),
  action: text("action").notNull(), // create | update | delete
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, createdAt: true } as any);
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
