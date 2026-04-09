import { Router } from "express";
import { db, attendanceTable, usersTable, companySettingsTable, departmentsTable } from "../db";
import { eq, and, gte, lte, between } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function formatRecord(r: typeof attendanceTable.$inferSelect) {
  let userName: string | null = null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId));
  userName = user?.fullName ?? null;
  return {
    id: r.id,
    userId: r.userId,
    userFullName: userName,
    date: r.date,
    clockInAt: r.clockInAt?.toISOString() ?? null,
    clockOutAt: r.clockOutAt?.toISOString() ?? null,
    isLate: r.isLate,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/attendance/today", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const today = todayStr();
  const [record] = await db.select().from(attendanceTable).where(
    and(eq(attendanceTable.userId, userId), eq(attendanceTable.date, today))
  );
  if (!record) {
    res.status(404).json({ error: "No attendance record for today" });
    return;
  }
  res.json(await formatRecord(record));
});

router.post("/attendance/clock-in", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const today = todayStr();
  const [existing] = await db.select().from(attendanceTable).where(
    and(eq(attendanceTable.userId, userId), eq(attendanceTable.date, today))
  );
  if (existing) {
    res.status(400).json({ error: "Already clocked in today" });
    return;
  }

  // Check if late
  const [settings] = await db.select().from(companySettingsTable);
  const workStart = settings?.workStartTime ?? "09:00";
  const [sh, sm] = workStart.split(":").map(Number);
  const threshold = settings?.lateThresholdMinutes ?? 15;
  const now = new Date();
  const workStartMs = sh * 60 + sm;
  const nowMs = now.getHours() * 60 + now.getMinutes();
  const isLate = nowMs > workStartMs + threshold;

  const [record] = await db.insert(attendanceTable).values({
    userId,
    date: today,
    clockInAt: now,
    isLate,
  }).returning();

  res.status(201).json(await formatRecord(record));
});

router.post("/attendance/clock-out", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const today = todayStr();
  const [existing] = await db.select().from(attendanceTable).where(
    and(eq(attendanceTable.userId, userId), eq(attendanceTable.date, today))
  );
  if (!existing) {
    res.status(400).json({ error: "Not clocked in today" });
    return;
  }
  if (existing.clockOutAt) {
    res.status(400).json({ error: "Already clocked out today" });
    return;
  }
  const [updated] = await db.update(attendanceTable).set({ clockOutAt: new Date() })
    .where(eq(attendanceTable.id, existing.id)).returning();
  res.json(await formatRecord(updated));
});

router.get("/attendance/summary", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const { month, year, departmentId } = req.query as Record<string, string>;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  let users = await db.select().from(usersTable).where(eq(usersTable.employmentStatus, "active"));
  const user = req.user!;
  
  if (user.role === "admin" && user.departmentId) {
    users = users.filter((u) => u.departmentId === user.departmentId);
  } else if (departmentId) {
    users = users.filter((u) => u.departmentId === parseInt(departmentId, 10));
  }

  // Get working days count (approx: days in month minus weekends)
  const daysInMonth = new Date(y, m, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(y, m - 1, d).getDay();
    if (day !== 0 && day !== 6) workingDays++;
  }

  const allDepts = await db.select().from(departmentsTable);
  const deptMap = new Map(allDepts.map((d) => [d.id, d.name]));

  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const allAttendance = await db.select().from(attendanceTable).where(
    and(gte(attendanceTable.date, startDate), lte(attendanceTable.date, endDate))
  );

  const summaries = users.map((u) => {
    const records = allAttendance.filter((a) => a.userId === u.id);
    return {
      userId: u.id,
      userFullName: u.fullName,
      departmentName: u.departmentId ? (deptMap.get(u.departmentId) ?? "N/A") : "N/A",
      presentDays: records.length,
      absentDays: Math.max(0, workingDays - records.length),
      lateDays: records.filter((r) => r.isLate).length,
      workingDays,
    };
  });

  res.json(summaries);
});

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const { userId, departmentId, startDate, endDate } = req.query as Record<string, string | undefined>;
  const user = req.user!;

  let records = await db.select().from(attendanceTable);

  // Access control
  if (user.role === "employee") {
    records = records.filter((r) => r.userId === user.id);
  } else if (user.role === "admin" && user.departmentId) {
    const deptUsers = await db.select().from(usersTable).where(eq(usersTable.departmentId, user.departmentId));
    const deptUserIds = new Set(deptUsers.map((u) => u.id));
    records = records.filter((r) => deptUserIds.has(r.userId));
  } else if (userId) {
    records = records.filter((r) => r.userId === parseInt(userId, 10));
  } else if (departmentId) {
    const deptUsers = await db.select().from(usersTable).where(eq(usersTable.departmentId, parseInt(departmentId, 10)));
    const deptUserIds = new Set(deptUsers.map((u) => u.id));
    records = records.filter((r) => deptUserIds.has(r.userId));
  }

  if (startDate) records = records.filter((r) => r.date >= startDate);
  if (endDate) records = records.filter((r) => r.date <= endDate);

  records.sort((a, b) => b.date.localeCompare(a.date));
  const formatted = await Promise.all(records.map(formatRecord));
  res.json(formatted);
});

export default router;
