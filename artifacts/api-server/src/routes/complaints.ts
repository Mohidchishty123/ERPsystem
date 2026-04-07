import { Router } from "express";
import { db, complaintsTable, usersTable, departmentsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateComplaintBody, UpdateComplaintBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

async function formatComplaint(c: typeof complaintsTable.$inferSelect) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, c.userId));
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, c.departmentId));
  let assignedToName: string | null = null;
  if (c.assignedTo) {
    const [a] = await db.select().from(usersTable).where(eq(usersTable.id, c.assignedTo));
    assignedToName = a?.fullName ?? null;
  }
  return {
    id: c.id,
    userId: c.userId,
    userFullName: c.isAnonymous ? "Anonymous" : (user?.fullName ?? null),
    departmentId: c.departmentId,
    departmentName: dept?.name ?? null,
    category: c.category,
    title: c.title,
    description: c.description,
    isAnonymous: c.isAnonymous,
    status: c.status,
    assignedTo: c.assignedTo,
    assignedToName,
    response: c.response,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/complaints", requireAuth, async (req, res): Promise<void> => {
  const { departmentId, status } = req.query as Record<string, string | undefined>;
  const user = req.user!;

  let complaints = await db.select().from(complaintsTable);

  if (user.role === "employee") {
    complaints = complaints.filter((c) => c.userId === user.id);
  } else if (user.role === "admin" && user.departmentId) {
    complaints = complaints.filter((c) => c.departmentId === user.departmentId);
  }

  if (departmentId) complaints = complaints.filter((c) => c.departmentId === parseInt(departmentId, 10));
  if (status) complaints = complaints.filter((c) => c.status === status);

  complaints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const formatted = await Promise.all(complaints.map(formatComplaint));
  res.json(formatted);
});

router.post("/complaints", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;
  if (!user.departmentId) {
    res.status(400).json({ error: "You must be assigned to a department" });
    return;
  }
  const [complaint] = await db.insert(complaintsTable).values({
    userId: user.id,
    departmentId: user.departmentId,
    category: parsed.data.category,
    title: parsed.data.title,
    description: parsed.data.description,
    isAnonymous: parsed.data.isAnonymous,
    status: "submitted",
  }).returning();
  res.status(201).json(await formatComplaint(complaint));
});

router.get("/complaints/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!complaint) { res.status(404).json({ error: "Complaint not found" }); return; }
  res.json(await formatComplaint(complaint));
});

router.patch("/complaints/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const parsed = UpdateComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!complaint) { res.status(404).json({ error: "Complaint not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status != null) updates["status"] = parsed.data.status;
  if (parsed.data.response != null) updates["response"] = parsed.data.response;
  if (parsed.data.assignedTo != null) updates["assignedTo"] = parsed.data.assignedTo;

  const [updated] = await db.update(complaintsTable).set(updates).where(eq(complaintsTable.id, id)).returning();

  // Notify the submitter if status changed
  if (parsed.data.status) {
    await db.insert(notificationsTable).values({
      userId: complaint.userId,
      type: "complaint_update",
      title: "Complaint Update",
      body: `Your complaint "${complaint.title}" status has been updated to ${parsed.data.status}.`,
      entityType: "complaint",
      entityId: complaint.id,
      isRead: false,
    });
  }

  res.json(await formatComplaint(updated));
});

export default router;
