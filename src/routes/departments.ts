import { Router } from "express";
import { db, departmentsTable, usersTable } from "../db";
import { eq, count } from "drizzle-orm";
import { CreateDepartmentBody, UpdateDepartmentBody } from "../api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

async function formatDept(d: typeof departmentsTable.$inferSelect) {
  const [countResult] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.departmentId, d.id));
  let headName: string | null = null;
  if (d.headUserId) {
    const [head] = await db.select().from(usersTable).where(eq(usersTable.id, d.headUserId));
    headName = head?.fullName ?? null;
  }
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    headUserId: d.headUserId,
    headUserName: headName,
    employeeCount: Number(countResult?.count ?? 0),
    createdAt: d.createdAt.toISOString(),
  };
}

router.get("/departments", requireAuth, async (_req, res): Promise<void> => {
  const depts = await db.select().from(departmentsTable);
  const formatted = await Promise.all(depts.map(formatDept));
  res.json(formatted);
});

router.post("/departments", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [dept] = await db.insert(departmentsTable).values({
    name: parsed.data.name,
    slug: parsed.data.slug,
    headUserId: parsed.data.headUserId ?? null,
  }).returning();
  res.status(201).json(await formatDept(dept));
});

router.get("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id));
  if (!dept) { res.status(404).json({ error: "Department not found" }); return; }
  res.json(await formatDept(dept));
});

router.patch("/departments/:id", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const parsed = UpdateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates["name"] = parsed.data.name;
  if (parsed.data.headUserId !== undefined) updates["headUserId"] = parsed.data.headUserId;
  const [updated] = await db.update(departmentsTable).set(updates).where(eq(departmentsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Department not found" }); return; }
  res.json(await formatDept(updated));
});

export default router;
