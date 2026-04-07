import { Router } from "express";
import { db, leaveApplicationsTable, leaveBalancesTable, usersTable, departmentsTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateLeaveBody, UpdateLeaveBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

async function formatLeave(l: typeof leaveApplicationsTable.$inferSelect) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, l.userId));
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, l.departmentId));
  let reviewerName: string | null = null;
  if (l.reviewedBy) {
    const [r] = await db.select().from(usersTable).where(eq(usersTable.id, l.reviewedBy));
    reviewerName = r?.fullName ?? null;
  }
  return {
    id: l.id,
    userId: l.userId,
    userFullName: user?.fullName ?? null,
    departmentId: l.departmentId,
    departmentName: dept?.name ?? null,
    leaveType: l.leaveType,
    startDate: l.startDate,
    endDate: l.endDate,
    daysCount: l.daysCount,
    reason: l.reason,
    status: l.status,
    reviewedBy: l.reviewedBy,
    reviewerName,
    reviewerRemarks: l.reviewerRemarks,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

router.get("/leave/balances/:userId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["userId"]) ? req.params["userId"][0] : req.params["userId"];
  const userId = parseInt(raw, 10);
  const year = new Date().getFullYear();
  const balances = await db.select().from(leaveBalancesTable).where(
    and(eq(leaveBalancesTable.userId, userId), eq(leaveBalancesTable.year, year))
  );
  res.json(balances.map((b) => ({
    id: b.id,
    userId: b.userId,
    leaveType: b.leaveType,
    allocated: b.allocated,
    used: b.used,
    remaining: b.allocated - b.used,
    year: b.year,
  })));
});

router.get("/leave", requireAuth, async (req, res): Promise<void> => {
  const { userId, departmentId, status } = req.query as Record<string, string | undefined>;
  const user = req.user!;

  let leaves = await db.select().from(leaveApplicationsTable);

  if (user.role === "employee") {
    leaves = leaves.filter((l) => l.userId === user.id);
  } else if (userId) {
    leaves = leaves.filter((l) => l.userId === parseInt(userId, 10));
  } else if (user.role === "admin" && user.departmentId) {
    leaves = leaves.filter((l) => l.departmentId === user.departmentId);
  }

  if (departmentId) leaves = leaves.filter((l) => l.departmentId === parseInt(departmentId, 10));
  if (status) leaves = leaves.filter((l) => l.status === status);

  leaves.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const formatted = await Promise.all(leaves.map(formatLeave));
  res.json(formatted);
});

router.post("/leave", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLeaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;
  if (!user.departmentId) {
    res.status(400).json({ error: "You must be assigned to a department to apply for leave" });
    return;
  }

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const [leave] = await db.insert(leaveApplicationsTable).values({
    userId: user.id,
    departmentId: user.departmentId,
    leaveType: parsed.data.leaveType,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    daysCount,
    reason: parsed.data.reason,
    status: "pending",
  }).returning();

  res.status(201).json(await formatLeave(leave));
});

router.get("/leave/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [leave] = await db.select().from(leaveApplicationsTable).where(eq(leaveApplicationsTable.id, id));
  if (!leave) { res.status(404).json({ error: "Leave not found" }); return; }
  res.json(await formatLeave(leave));
});

router.patch("/leave/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const parsed = UpdateLeaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [leave] = await db.select().from(leaveApplicationsTable).where(eq(leaveApplicationsTable.id, id));
  if (!leave) { res.status(404).json({ error: "Leave not found" }); return; }

  const [updated] = await db.update(leaveApplicationsTable).set({
    status: parsed.data.status,
    reviewedBy: req.user!.id,
    reviewerRemarks: parsed.data.reviewerRemarks ?? null,
  }).where(eq(leaveApplicationsTable.id, id)).returning();

  // Update leave balance if approved
  if (parsed.data.status === "approved") {
    const year = new Date(leave.startDate).getFullYear();
    const [balance] = await db.select().from(leaveBalancesTable).where(
      and(eq(leaveBalancesTable.userId, leave.userId), eq(leaveBalancesTable.leaveType, leave.leaveType), eq(leaveBalancesTable.year, year))
    );
    if (balance) {
      await db.update(leaveBalancesTable).set({ used: balance.used + leave.daysCount }).where(eq(leaveBalancesTable.id, balance.id));
    }
  }

  // Notify the employee
  await db.insert(notificationsTable).values({
    userId: leave.userId,
    type: "leave_status",
    title: `Leave ${parsed.data.status === "approved" ? "Approved" : "Rejected"}`,
    body: `Your leave application from ${leave.startDate} to ${leave.endDate} has been ${parsed.data.status}.`,
    entityType: "leave",
    entityId: leave.id,
    isRead: false,
  });

  res.json(await formatLeave(updated));
});

export default router;
