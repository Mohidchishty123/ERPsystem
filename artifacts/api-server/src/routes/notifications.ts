import { Router } from "express";
import { db, notificationsTable, usersTable, departmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateNotificationBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { isRead } = req.query as Record<string, string | undefined>;
  const user = req.user!;

  let notifications = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, user.id));

  if (isRead !== undefined) {
    const readBool = isRead === "true";
    notifications = notifications.filter((n) => n.isRead === readBool);
  }

  notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json(notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    entityType: n.entityType,
    entityId: n.entityId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.post("/notifications", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const parsed = CreateNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, departmentId, broadcast, type, title, body } = parsed.data;

  let targetUserIds: number[] = [];

  if (broadcast) {
    const allUsers = await db.select().from(usersTable).where(eq(usersTable.employmentStatus, "active"));
    targetUserIds = allUsers.map((u) => u.id);
  } else if (departmentId) {
    const deptUsers = await db.select().from(usersTable).where(eq(usersTable.departmentId, departmentId));
    targetUserIds = deptUsers.map((u) => u.id);
  } else if (userId) {
    targetUserIds = [userId];
  }

  let lastNotification = null;
  for (const uid of targetUserIds) {
    const [n] = await db.insert(notificationsTable).values({
      userId: uid,
      type,
      title,
      body,
      isRead: false,
    }).returning();
    lastNotification = n;
  }

  res.status(201).json(lastNotification ? {
    id: lastNotification.id,
    userId: lastNotification.userId,
    type: lastNotification.type,
    title: lastNotification.title,
    body: lastNotification.body,
    entityType: lastNotification.entityType,
    entityId: lastNotification.entityId,
    isRead: lastNotification.isRead,
    createdAt: lastNotification.createdAt.toISOString(),
  } : { message: "No users found" });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [updated] = await db.update(notificationsTable).set({ isRead: true }).where(
    and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.user!.id))
  ).returning();
  if (!updated) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json({
    id: updated.id,
    userId: updated.userId,
    type: updated.type,
    title: updated.title,
    body: updated.body,
    entityType: updated.entityType,
    entityId: updated.entityId,
    isRead: updated.isRead,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.patch("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.user!.id));
  res.json({ message: "All notifications marked as read" });
});

export default router;
