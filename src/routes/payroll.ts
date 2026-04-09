import { Router } from "express";
import { db, payrollRecordsTable, usersTable, departmentsTable, notificationsTable } from "../db";
import { eq, and } from "drizzle-orm";
import { CreatePayrollBody, UpdatePayrollBody } from "../api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

async function formatPayroll(p: typeof payrollRecordsTable.$inferSelect) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId));
  let deptName: string | null = null;
  if (user?.departmentId) {
    const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, user.departmentId));
    deptName = dept?.name ?? null;
  }
  let approvedByName: string | null = null;
  if (p.approvedBy) {
    const [approver] = await db.select().from(usersTable).where(eq(usersTable.id, p.approvedBy));
    approvedByName = approver?.fullName ?? null;
  }
  return {
    id: p.id,
    userId: p.userId,
    userFullName: user?.fullName ?? null,
    departmentName: deptName,
    month: p.month,
    year: p.year,
    baseSalary: parseFloat(p.baseSalary),
    allowances: parseFloat(p.allowances),
    bonuses: parseFloat(p.bonuses),
    deductions: parseFloat(p.deductions),
    netSalary: parseFloat(p.netSalary),
    status: p.status,
    approvedBy: p.approvedBy,
    approvedByName,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/payroll/summary", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const { month, year } = req.query as Record<string, string>;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  const records = await db.select().from(payrollRecordsTable).where(
    and(eq(payrollRecordsTable.month, m), eq(payrollRecordsTable.year, y))
  );

  const users = await db.select().from(usersTable);
  const depts = await db.select().from(departmentsTable);

  const deptMap = new Map(depts.map((d) => [d.id, d]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  const summaryMap = new Map<number, { departmentId: number; departmentName: string; totalNetSalary: number; employeeCount: number; approvedCount: number; pendingCount: number }>();

  for (const r of records) {
    const user = userMap.get(r.userId);
    if (!user?.departmentId) continue;
    
    // Admin filtering
    if (req.user!.role === "admin" && user.departmentId !== req.user!.departmentId) continue;
    
    const dept = deptMap.get(user.departmentId);
    if (!dept) continue;
    const existing = summaryMap.get(dept.id) ?? { departmentId: dept.id, departmentName: dept.name, totalNetSalary: 0, employeeCount: 0, approvedCount: 0, pendingCount: 0 };
    existing.totalNetSalary += parseFloat(r.netSalary);
    existing.employeeCount++;
    if (r.status === "approved" || r.status === "paid") existing.approvedCount++;
    else existing.pendingCount++;
    summaryMap.set(dept.id, existing);
  }

  res.json(Array.from(summaryMap.values()));
});

router.get("/payroll", requireAuth, async (req, res): Promise<void> => {
  const { userId, departmentId, month, year, status } = req.query as Record<string, string | undefined>;
  const user = req.user!;

  let records = await db.select().from(payrollRecordsTable);

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

  if (month) records = records.filter((r) => r.month === parseInt(month, 10));
  if (year) records = records.filter((r) => r.year === parseInt(year, 10));
  if (status) records = records.filter((r) => r.status === status);

  records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const formatted = await Promise.all(records.map(formatPayroll));
  res.json(formatted);
});

router.post("/payroll", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const parsed = CreatePayrollBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, month, year, baseSalary, allowances, bonuses, deductions } = parsed.data;
  const netSalary = baseSalary + allowances + bonuses - deductions;

  const [record] = await db.insert(payrollRecordsTable).values({
    userId,
    month,
    year,
    baseSalary: String(baseSalary),
    allowances: String(allowances),
    bonuses: String(bonuses),
    deductions: String(deductions),
    netSalary: String(netSalary),
    status: "draft",
  }).returning();

  res.status(201).json(await formatPayroll(record));
});

router.get("/payroll/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [record] = await db.select().from(payrollRecordsTable).where(eq(payrollRecordsTable.id, id));
  if (!record) { res.status(404).json({ error: "Payroll record not found" }); return; }
  res.json(await formatPayroll(record));
});

router.patch("/payroll/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const parsed = UpdatePayrollBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(payrollRecordsTable).where(eq(payrollRecordsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Payroll record not found" }); return; }

  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  const base = d.baseSalary != null ? d.baseSalary : parseFloat(existing.baseSalary);
  const allow = d.allowances != null ? d.allowances : parseFloat(existing.allowances);
  const bon = d.bonuses != null ? d.bonuses : parseFloat(existing.bonuses);
  const ded = d.deductions != null ? d.deductions : parseFloat(existing.deductions);

  if (d.baseSalary != null) updates["baseSalary"] = String(d.baseSalary);
  if (d.allowances != null) updates["allowances"] = String(d.allowances);
  if (d.bonuses != null) updates["bonuses"] = String(d.bonuses);
  if (d.deductions != null) updates["deductions"] = String(d.deductions);
  if (d.status != null) updates["status"] = d.status;
  updates["netSalary"] = String(base + allow + bon - ded);

  const [updated] = await db.update(payrollRecordsTable).set(updates).where(eq(payrollRecordsTable.id, id)).returning();
  res.json(await formatPayroll(updated));
});

router.post("/payroll/:id/approve", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);

  const [existing] = await db.select().from(payrollRecordsTable).where(eq(payrollRecordsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Payroll record not found" }); return; }

  const [updated] = await db.update(payrollRecordsTable).set({ status: "approved", approvedBy: req.user!.id })
    .where(eq(payrollRecordsTable.id, id)).returning();

  // Notify employee
  await db.insert(notificationsTable).values({
    userId: existing.userId,
    type: "payroll_ready",
    title: "Payslip Ready",
    body: `Your payslip for ${existing.month}/${existing.year} has been approved.`,
    entityType: "payroll",
    entityId: existing.id,
    isRead: false,
  });

  res.json(await formatPayroll(updated));
});

export default router;
