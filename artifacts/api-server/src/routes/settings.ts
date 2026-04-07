import { Router } from "express";
import { db, companySettingsTable, auditLogsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(companySettingsTable);
  if (!settings) {
    [settings] = await db.insert(companySettingsTable).values({}).returning();
  }
  res.json({
    id: settings.id,
    companyName: settings.companyName,
    logoUrl: settings.logoUrl,
    timezone: settings.timezone,
    workStartTime: settings.workStartTime,
    workEndTime: settings.workEndTime,
    payrollCycleDay: settings.payrollCycleDay,
    lateThresholdMinutes: settings.lateThresholdMinutes,
    updatedAt: settings.updatedAt.toISOString(),
  });
});

router.patch("/settings", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let [existing] = await db.select().from(companySettingsTable);
  if (!existing) {
    [existing] = await db.insert(companySettingsTable).values({}).returning();
  }

  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.companyName != null) updates["companyName"] = d.companyName;
  if (d.logoUrl != null) updates["logoUrl"] = d.logoUrl;
  if (d.timezone != null) updates["timezone"] = d.timezone;
  if (d.workStartTime != null) updates["workStartTime"] = d.workStartTime;
  if (d.workEndTime != null) updates["workEndTime"] = d.workEndTime;
  if (d.payrollCycleDay != null) updates["payrollCycleDay"] = d.payrollCycleDay;
  if (d.lateThresholdMinutes != null) updates["lateThresholdMinutes"] = d.lateThresholdMinutes;

  const [updated] = await db.update(companySettingsTable).set(updates).where(eq(companySettingsTable.id, existing.id)).returning();
  res.json({
    id: updated.id,
    companyName: updated.companyName,
    logoUrl: updated.logoUrl,
    timezone: updated.timezone,
    workStartTime: updated.workStartTime,
    workEndTime: updated.workEndTime,
    payrollCycleDay: updated.payrollCycleDay,
    lateThresholdMinutes: updated.lateThresholdMinutes,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.get("/audit", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const { actorId, entityType, startDate, endDate } = req.query as Record<string, string | undefined>;

  let logs = await db.select().from(auditLogsTable);

  if (actorId) logs = logs.filter((l) => l.actorId === parseInt(actorId, 10));
  if (entityType) logs = logs.filter((l) => l.entityType === entityType);
  if (startDate) logs = logs.filter((l) => l.createdAt >= new Date(startDate));
  if (endDate) logs = logs.filter((l) => l.createdAt <= new Date(endDate));

  logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const formatted = logs.map((l) => ({
    id: l.id,
    actorId: l.actorId,
    actorName: userMap.get(l.actorId)?.fullName ?? null,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt.toISOString(),
  }));

  res.json(formatted);
});

export default router;
