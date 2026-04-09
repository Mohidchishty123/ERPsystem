import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, departmentsTable } from "../db";
import { eq } from "drizzle-orm";
import { LoginBody, ChangePasswordBody } from "../api-zod";
import { signToken, requireAuth } from "../lib/auth";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.employmentStatus === "inactive") {
    res.status(401).json({ error: "Account is deactivated" });
    return;
  }
  const token = signToken({ userId: user.id, role: user.role, email: user.email });

  let deptName: string | null = null;
  if (user.departmentId) {
    const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, user.departmentId));
    deptName = dept?.name ?? null;
  }

  res.json({
    user: {
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
    },
    token,
  });
});

router.post("/auth/logout", requireAuth, async (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  let deptName: string | null = null;
  if (dbUser.departmentId) {
    const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, dbUser.departmentId));
    deptName = dept?.name ?? null;
  }
  res.json({
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.fullName,
    role: dbUser.role,
    departmentId: dbUser.departmentId,
    departmentName: deptName,
    position: dbUser.position,
    phone: dbUser.phone,
    emergencyContact: dbUser.emergencyContact,
    avatarUrl: dbUser.avatarUrl,
    employmentStatus: dbUser.employmentStatus,
    joinDate: dbUser.joinDate,
    createdAt: dbUser.createdAt.toISOString(),
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const valid = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password changed successfully" });
});

export default router;
