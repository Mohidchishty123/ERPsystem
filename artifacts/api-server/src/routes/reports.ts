import { Router } from "express";
import {
  db, usersTable, attendanceTable, leaveApplicationsTable, complaintsTable,
  requestsTable, payrollRecordsTable, tasksTable, departmentsTable, notificationsTable
} from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/reports/dashboard", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const today = new Date().toISOString().slice(0, 10);

  const allUsers = await db.select().from(usersTable).where(eq(usersTable.employmentStatus, "active"));
  const todayAttendance = await db.select().from(attendanceTable).where(eq(attendanceTable.date, today));
  const presentToday = user.role === "employee"
    ? todayAttendance.filter((a) => a.userId === user.id).length
    : todayAttendance.length;

  const onLeaveToday = await db.select().from(leaveApplicationsTable);
  const onLeaveTodayCount = onLeaveToday.filter((l) => l.status === "approved" && l.startDate <= today && l.endDate >= today).length;

  const pendingLeave = await db.select().from(leaveApplicationsTable);
  const pendingLeaveCount = user.role === "super_admin"
    ? pendingLeave.filter((l) => l.status === "pending").length
    : pendingLeave.filter((l) => l.status === "pending" && l.departmentId === user.departmentId).length;

  const allComplaints = await db.select().from(complaintsTable);
  const pendingComplaints = user.role === "super_admin"
    ? allComplaints.filter((c) => c.status === "submitted" || c.status === "under_review").length
    : allComplaints.filter((c) => (c.status === "submitted" || c.status === "under_review") && c.departmentId === user.departmentId).length;

  const allRequests = await db.select().from(requestsTable);
  const pendingRequests = user.role === "super_admin"
    ? allRequests.filter((r) => r.status === "pending").length
    : allRequests.filter((r) => r.status === "pending" && r.departmentId === user.departmentId).length;

  const allTasks = await db.select().from(tasksTable);
  const openTasks = user.role === "employee"
    ? allTasks.filter((t) => t.assignedTo === user.id && t.status !== "done").length
    : allTasks.filter((t) => t.status !== "done").length;

  const allPayroll = await db.select().from(payrollRecordsTable);
  const payrollDue = allPayroll.filter((p) => p.status === "draft").length;

  // Recent activity: last 10 audit-like entries from various tables
  const recentLeaves = pendingLeave.slice(0, 3).map((l) => ({
    id: l.id,
    type: "leave",
    description: `Leave application submitted`,
    actorName: "Employee",
    createdAt: l.createdAt.toISOString(),
  }));

  const recentComplaints = allComplaints.slice(0, 3).map((c) => ({
    id: c.id,
    type: "complaint",
    description: `Complaint: ${c.title}`,
    actorName: c.isAnonymous ? "Anonymous" : "Employee",
    createdAt: c.createdAt.toISOString(),
  }));

  const recentActivity = [...recentLeaves, ...recentComplaints]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  res.json({
    totalEmployees: allUsers.length,
    presentToday,
    onLeaveToday: onLeaveTodayCount,
    pendingLeaveRequests: pendingLeaveCount,
    pendingComplaints,
    pendingRequests,
    openTasks,
    payrollDue,
    recentActivity,
  });
});

router.get("/reports/attendance", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const { startDate, endDate, departmentId } = req.query as Record<string, string>;

  const depts = await db.select().from(departmentsTable);
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));

  let records = await db.select().from(attendanceTable).where(
    and(gte(attendanceTable.date, startDate), lte(attendanceTable.date, endDate))
  );

  if (departmentId) {
    const deptUsers = await db.select().from(usersTable).where(eq(usersTable.departmentId, parseInt(departmentId, 10)));
    const deptUserIds = new Set(deptUsers.map((u) => u.id));
    records = records.filter((r) => deptUserIds.has(r.userId));
  }

  const allUsers = await db.select().from(usersTable);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const byDepartment = depts.map((d) => {
    const deptUserIds = allUsers.filter((u) => u.departmentId === d.id).map((u) => u.id);
    const deptRecords = records.filter((r) => deptUserIds.includes(r.userId));
    return {
      departmentName: d.name,
      present: deptRecords.length,
      absent: Math.max(0, deptUserIds.length - deptRecords.length),
      late: deptRecords.filter((r) => r.isLate).length,
    };
  });

  res.json({
    totalPresent: records.length,
    totalAbsent: Math.max(0, allUsers.length - records.length),
    totalLate: records.filter((r) => r.isLate).length,
    byDepartment,
  });
});

router.get("/reports/leave", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const { year, departmentId } = req.query as Record<string, string>;

  let leaves = await db.select().from(leaveApplicationsTable);

  if (departmentId) {
    leaves = leaves.filter((l) => l.departmentId === parseInt(departmentId, 10));
  }

  const yearNum = parseInt(year, 10);
  leaves = leaves.filter((l) => new Date(l.startDate).getFullYear() === yearNum);

  const leaveTypes = ["annual", "sick", "emergency", "unpaid", "maternity", "paternity"];
  const byType = leaveTypes.map((t) => {
    const filtered = leaves.filter((l) => l.leaveType === t);
    return {
      leaveType: t,
      count: filtered.length,
      totalDays: filtered.reduce((sum, l) => sum + l.daysCount, 0),
    };
  }).filter((t) => t.count > 0);

  res.json({
    totalApplications: leaves.length,
    approved: leaves.filter((l) => l.status === "approved").length,
    rejected: leaves.filter((l) => l.status === "rejected").length,
    pending: leaves.filter((l) => l.status === "pending").length,
    byType,
  });
});

router.get("/reports/payroll", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const { month, year } = req.query as Record<string, string>;

  const records = await db.select().from(payrollRecordsTable).where(
    and(eq(payrollRecordsTable.month, parseInt(month, 10)), eq(payrollRecordsTable.year, parseInt(year, 10)))
  );

  const totals = records.reduce((acc, r) => ({
    totalBaseSalary: acc.totalBaseSalary + parseFloat(r.baseSalary),
    totalBonuses: acc.totalBonuses + parseFloat(r.bonuses),
    totalDeductions: acc.totalDeductions + parseFloat(r.deductions),
    totalNetSalary: acc.totalNetSalary + parseFloat(r.netSalary),
  }), { totalBaseSalary: 0, totalBonuses: 0, totalDeductions: 0, totalNetSalary: 0 });

  res.json({
    ...totals,
    employeeCount: records.length,
    approvedCount: records.filter((r) => r.status === "approved" || r.status === "paid").length,
  });
});

export default router;
