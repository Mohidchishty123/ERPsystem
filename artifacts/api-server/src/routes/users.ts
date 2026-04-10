import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, departmentsTable, leaveBalancesTable } from "@workspace/db";
import { eq, ilike, sql, and, neq } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { logger } from "../lib/logger";

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

router.get("/users/stats", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const user = req.user!;
  let allUsers = await db.select().from(usersTable).where(eq(usersTable.employmentStatus, "active"));
  const depts = await db.select().from(departmentsTable);

  if (user.role === "admin" && user.departmentId) {
    allUsers = allUsers.filter((u) => u.departmentId === user.departmentId);
  }

  const byDepartment = depts
    .filter((d) => user.role === "super_admin" || d.id === user.departmentId)
    .map((d) => ({
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
  let allUsersAll = await db.select().from(usersTable);
  if (user.role === "admin" && user.departmentId) {
    allUsersAll = allUsersAll.filter((u) => u.departmentId === user.departmentId);
  }
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
  const user = req.user!;
  const { departmentId, role, status, search } = req.query as Record<string, string | undefined>;
  let query = db.select().from(usersTable).$dynamic();

  const conditions = [];
  if (role) conditions.push(eq(usersTable.role, role));
  if (status) conditions.push(eq(usersTable.employmentStatus, status));
  if (search) conditions.push(ilike(usersTable.fullName, `%${search}%`));

  // Department filtering and admin scope
  if (user.role === "admin") {
    conditions.push(neq(usersTable.role, "super_admin"));
    if (user.departmentId) {
      conditions.push(eq(usersTable.departmentId, user.departmentId));
    }
  } else if (departmentId) {
    conditions.push(eq(usersTable.departmentId, parseInt(departmentId)));
  }

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

  const userRole = role ?? "employee";
  let finalDepartmentId = departmentId ?? null;

  if (userRole === "super_admin") {
    finalDepartmentId = null;
  } else if (!finalDepartmentId) {
    res.status(400).json({ error: "Department is required for Admins and Employees" });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const [createdUser] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash: hash,
    fullName,
    role: userRole,
    departmentId: finalDepartmentId,
    position: position ?? null,
    phone: phone ?? null,
    joinDate: joinDate ?? null,
  }).returning();

  // Seed leave balances for new employee
  if ((createdUser as any).role === "employee") {
    const year = new Date().getFullYear();
    const types = [
      { leaveType: "annual", allocated: 14 },
      { leaveType: "sick", allocated: 7 },
      { leaveType: "emergency", allocated: 3 },
      { leaveType: "unpaid", allocated: 30 },
    ];
    for (const t of types) {
      await db.insert(leaveBalancesTable).values({ userId: (createdUser as any).id, leaveType: t.leaveType, allocated: t.allocated, used: 0, year });
    }
  }

  const formatted = await formatUser(createdUser);
  res.status(201).json(formatted);
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const currentUser = req.user!;
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!foundUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (currentUser.role === "admin" && foundUser.role === "super_admin") {
    res.status(403).json({ error: "Forbidden: You cannot view super admin profiles" });
    return;
  }

  const formatted = await formatUser(foundUser);
  res.json(formatted);
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const currentUser = req.user!;

  const results = await db.select().from(usersTable).where(eq(usersTable.id, id));
  const targetUser = results[0] as any;
  if (!targetUser) { res.status(404).json({ error: "User not found" }); return; }

  // 1. Permission Checks
  if (currentUser.role === "employee" && currentUser.id !== id) {
    res.status(403).json({ error: "Forbidden: Employees can only edit themselves" });
    return;
  }

  if (currentUser.role === "admin") {
    // Admins can only edit users in their own department
    if (targetUser.departmentId !== currentUser.departmentId) {
      res.status(403).json({ error: "Forbidden: You can only edit users in your department" });
      return;
    }
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  // 1. Permission Checks (Already done: Admin dept-lock and Employee self-edit lock)

  // 2. Resolve Role and Department
  const roleToApply = (currentUser.role === "super_admin" && (data as any).role) ? (data as any).role : targetUser.role;
  let departmentIdToApply = data.departmentId !== undefined ? data.departmentId : targetUser.departmentId;

  if (roleToApply === "super_admin") {
    departmentIdToApply = null;
  } else if (!departmentIdToApply) {
    res.status(400).json({ error: "Department is required for Admins and Employees" });
    return;
  }

  // 3. Construct Update Set (Explicitly)
  const [updatedRecord] = await db.update(usersTable)
    .set({
      fullName: (data.fullName as any) ?? undefined,
      position: (data.position as any) ?? undefined,
      phone: (data.phone as any) ?? undefined,
      emergencyContact: (data.emergencyContact as any) ?? undefined,
      avatarUrl: (data.avatarUrl as any) ?? undefined,
      joinDate: (data.joinDate as any) ?? undefined,
      role: (currentUser.role === "super_admin" && (data as any).role) ? (data as any).role : undefined,
      departmentId: departmentIdToApply as any,
      employmentStatus: ((currentUser.role === "super_admin" || currentUser.role === "admin") && data.employmentStatus)
        ? (data.employmentStatus as any)
        : undefined,
    } as any)
    .where(eq(usersTable.id, id))
    .returning();

  if (!updatedRecord) {
    res.status(500).json({ error: "Failed to update user record" });
    return;
  }

  // Double Check (Safety)
  if (data.employmentStatus && updatedRecord.employmentStatus !== data.employmentStatus && currentUser.role !== "employee") {
    // This should theoretically not happen if the update succeeded
    logger.error({ expected: data.employmentStatus, actual: updatedRecord.employmentStatus }, "Status mismatch after update");
  }

  res.json(await formatUser(updatedRecord));
});

router.delete("/users/:id", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [updated] = await db.update(usersTable).set({ employmentStatus: "inactive" }).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ message: "User deactivated successfully" });
});

export default router;
