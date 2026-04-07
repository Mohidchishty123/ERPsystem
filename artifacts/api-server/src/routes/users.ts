import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, departmentsTable, leaveBalancesTable } from "@workspace/db";
import { eq, ilike, sql, and } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

async function formatUser(user: typeof usersTable.$inferSelect) {
  let deptName: string | null = null;
  if (user.departmentId) {
    const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, user.departmentId));
    deptName = dept?.name ?? null;
  }
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    departmentId: user.departmentId,
    departmentName: deptName,
    position: user.position,
    phone: user.phone,
    emergencyContact: user.emergencyContact,
    avatarUrl: user.avatarUrl,
    employmentStatus: user.employmentStatus,
    joinDate: user.joinDate,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/users/stats", requireAuth, requireRole("super_admin", "admin"), async (_req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable).where(eq(usersTable.employmentStatus, "active"));
  const depts = await db.select().from(departmentsTable);

  const byDepartment = depts.map((d) => ({
    departmentId: d.id,
    departmentName: d.name,
    count: allUsers.filter((u) => u.departmentId === d.id).length,
  }));

  const roles = ["super_admin", "admin", "employee"];
  const byRole = roles.map((r) => ({
    role: r,
    count: allUsers.filter((u) => u.role === r).length,
  }));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const allUsersAll = await db.select().from(usersTable);
  const newThisMonth = allUsersAll.filter((u) => u.createdAt >= monthStart).length;

  res.json({
    total: allUsers.length,
    byDepartment,
    byRole,
    activeCount: allUsers.length,
    newThisMonth,
  });
});

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const { departmentId, role, status, search } = req.query as Record<string, string | undefined>;
  let query = db.select().from(usersTable).$dynamic();

  const conditions = [];
  if (departmentId) conditions.push(eq(usersTable.departmentId, parseInt(departmentId)));
  if (role) conditions.push(eq(usersTable.role, role));
  if (status) conditions.push(eq(usersTable.employmentStatus, status));
  if (search) conditions.push(ilike(usersTable.fullName, `%${search}%`));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const users = await query;
  const formatted = await Promise.all(users.map(formatUser));
  res.json(formatted);
});

router.post("/users", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, fullName, role, departmentId, position, phone, joinDate, password } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash: hash,
    fullName,
    role: role ?? "employee",
    departmentId: departmentId ?? null,
    position: position ?? null,
    phone: phone ?? null,
    joinDate: joinDate ?? null,
  }).returning();

  // Seed leave balances for new employee
  if (user.role === "employee") {
    const year = new Date().getFullYear();
    const types = [
      { leaveType: "annual", allocated: 14 },
      { leaveType: "sick", allocated: 7 },
      { leaveType: "emergency", allocated: 3 },
      { leaveType: "unpaid", allocated: 30 },
    ];
    for (const t of types) {
      await db.insert(leaveBalancesTable).values({ userId: user.id, leaveType: t.leaveType, allocated: t.allocated, used: 0, year });
    }
  }

  const formatted = await formatUser(user);
  res.status(201).json(formatted);
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const formatted = await formatUser(user);
  res.json(formatted);
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const user = req.user!;

  // Employees can only edit themselves
  if (user.role === "employee" && user.id !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.fullName != null) updates["fullName"] = data.fullName;
  if (data.departmentId !== undefined) updates["departmentId"] = data.departmentId;
  if (data.position != null) updates["position"] = data.position;
  if (data.phone != null) updates["phone"] = data.phone;
  if (data.emergencyContact != null) updates["emergencyContact"] = data.emergencyContact;
  if (data.avatarUrl != null) updates["avatarUrl"] = data.avatarUrl;
  if (data.joinDate != null) updates["joinDate"] = data.joinDate;
  if (data.employmentStatus != null && user.role !== "employee") updates["employmentStatus"] = data.employmentStatus;

  if (Object.keys(updates).length === 0) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!existing) { res.status(404).json({ error: "User not found" }); return; }
    res.json(await formatUser(existing));
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(await formatUser(updated));
});

router.delete("/users/:id", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [updated] = await db.update(usersTable).set({ employmentStatus: "inactive" }).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ message: "User deactivated successfully" });
});

export default router;
