import { Router } from "express";
import { db, requestsTable, usersTable, departmentsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateRequestBody, UpdateRequestBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

async function formatRequest(r: typeof requestsTable.$inferSelect) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId));
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, r.departmentId));
  let reviewerName: string | null = null;
  if (r.reviewedBy) {
    const [rev] = await db.select().from(usersTable).where(eq(usersTable.id, r.reviewedBy));
    reviewerName = rev?.fullName ?? null;
  }
  return {
    id: r.id,
    userId: r.userId,
    userFullName: user?.fullName ?? null,
    departmentId: r.departmentId,
    departmentName: dept?.name ?? null,
    requestType: r.requestType,
    title: r.title,
    description: r.description,
    status: r.status,
    reviewedBy: r.reviewedBy,
    reviewerName,
    reviewerRemarks: r.reviewerRemarks,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/requests", requireAuth, async (req, res): Promise<void> => {
  const { departmentId, status, userId } = req.query as Record<string, string | undefined>;
  const user = req.user!;

  let reqs = await db.select().from(requestsTable);

  if (user.role === "employee") {
    reqs = reqs.filter((r) => r.userId === user.id);
  } else if (userId) {
    reqs = reqs.filter((r) => r.userId === parseInt(userId, 10));
  } else if (user.role === "admin" && user.departmentId) {
    reqs = reqs.filter((r) => r.departmentId === user.departmentId);
  }

  if (departmentId) reqs = reqs.filter((r) => r.departmentId === parseInt(departmentId, 10));
  if (status) reqs = reqs.filter((r) => r.status === status);

  reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const formatted = await Promise.all(reqs.map(formatRequest));
  res.json(formatted);
});

router.post("/requests", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;
  if (!user.departmentId) {
    res.status(400).json({ error: "You must be assigned to a department" });
    return;
  }
  const [request] = await db.insert(requestsTable).values({
    userId: user.id,
    departmentId: user.departmentId,
    requestType: parsed.data.requestType,
    title: parsed.data.title,
    description: parsed.data.description,
    status: "pending",
  }).returning();
  res.status(201).json(await formatRequest(request));
});

router.get("/requests/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, id));
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }
  res.json(await formatRequest(request));
});

router.patch("/requests/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const parsed = UpdateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, id));
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }

  const [updated] = await db.update(requestsTable).set({
    status: parsed.data.status,
    reviewedBy: req.user!.id,
    reviewerRemarks: parsed.data.reviewerRemarks ?? null,
  }).where(eq(requestsTable.id, id)).returning();

  // Notify requester
  await db.insert(notificationsTable).values({
    userId: request.userId,
    type: "request_update",
    title: "Request Update",
    body: `Your request "${request.title}" has been ${parsed.data.status}.`,
    entityType: "request",
    entityId: request.id,
    isRead: false,
  });

  res.json(await formatRequest(updated));
});

export default router;
