import { Router } from "express";
import { db, projectsTable, tasksTable, taskCommentsTable, usersTable, departmentsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { CreateProjectBody, UpdateProjectBody, CreateTaskBody, UpdateTaskBody, CreateTaskCommentBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

async function formatProject(p: typeof projectsTable.$inferSelect) {
  let deptName: string | null = null;
  if (p.departmentId) {
    const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, p.departmentId));
    deptName = dept?.name ?? null;
  }
  const [taskCountResult] = await db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.projectId, p.id));
  const [completedResult] = await db.select({ count: count() }).from(tasksTable).where(and(eq(tasksTable.projectId, p.id), eq(tasksTable.status, "done")));
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    departmentId: p.departmentId,
    departmentName: deptName,
    status: p.status,
    createdBy: p.createdBy,
    startDate: p.startDate,
    endDate: p.endDate,
    taskCount: Number(taskCountResult?.count ?? 0),
    completedTaskCount: Number(completedResult?.count ?? 0),
    createdAt: p.createdAt.toISOString(),
  };
}

async function formatTask(t: typeof tasksTable.$inferSelect) {
  let projectName: string | null = null;
  if (t.projectId) {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, t.projectId));
    projectName = project?.name ?? null;
  }
  let assignedToName: string | null = null;
  if (t.assignedTo) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, t.assignedTo));
    assignedToName = user?.fullName ?? null;
  }
  const [commentCount] = await db.select({ count: count() }).from(taskCommentsTable).where(eq(taskCommentsTable.taskId, t.id));
  return {
    id: t.id,
    projectId: t.projectId,
    projectName,
    title: t.title,
    description: t.description,
    assignedTo: t.assignedTo,
    assignedToName,
    createdBy: t.createdBy,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    commentCount: Number(commentCount?.count ?? 0),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

// Projects
router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const { departmentId, status } = req.query as Record<string, string | undefined>;
  let projects = await db.select().from(projectsTable);
  if (departmentId) projects = projects.filter((p) => p.departmentId === parseInt(departmentId, 10));
  if (status) projects = projects.filter((p) => p.status === status);
  projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const formatted = await Promise.all(projects.map(formatProject));
  res.json(formatted);
});

router.post("/projects", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db.insert(projectsTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    departmentId: parsed.data.departmentId ?? null,
    startDate: parsed.data.startDate ?? null,
    endDate: parsed.data.endDate ?? null,
    status: "active",
    createdBy: req.user!.id,
  }).returning();
  res.status(201).json(await formatProject(project));
});

router.get("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(await formatProject(project));
});

router.patch("/projects/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.name != null) updates["name"] = d.name;
  if (d.description != null) updates["description"] = d.description;
  if (d.status != null) updates["status"] = d.status;
  if (d.startDate != null) updates["startDate"] = d.startDate;
  if (d.endDate != null) updates["endDate"] = d.endDate;
  const [updated] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(await formatProject(updated));
});

router.delete("/projects/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.sendStatus(204);
});

// Tasks
router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const { projectId, assignedTo, status, priority } = req.query as Record<string, string | undefined>;
  const user = req.user!;

  let tasks = await db.select().from(tasksTable);

  if (user.role === "employee") {
    tasks = tasks.filter((t) => t.assignedTo === user.id);
  }

  if (projectId) tasks = tasks.filter((t) => t.projectId === parseInt(projectId, 10));
  if (assignedTo) tasks = tasks.filter((t) => t.assignedTo === parseInt(assignedTo, 10));
  if (status) tasks = tasks.filter((t) => t.status === status);
  if (priority) tasks = tasks.filter((t) => t.priority === priority);

  tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const formatted = await Promise.all(tasks.map(formatTask));
  res.json(formatted);
});

router.post("/tasks", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db.insert(tasksTable).values({
    projectId: parsed.data.projectId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    assignedTo: parsed.data.assignedTo ?? null,
    priority: parsed.data.priority,
    status: "todo",
    dueDate: parsed.data.dueDate ?? null,
    createdBy: req.user!.id,
  }).returning();
  res.status(201).json(await formatTask(task));
});

router.get("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(await formatTask(task));
});

router.patch("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.title != null) updates["title"] = d.title;
  if (d.description != null) updates["description"] = d.description;
  if (d.assignedTo !== undefined) updates["assignedTo"] = d.assignedTo;
  if (d.priority != null) updates["priority"] = d.priority;
  if (d.status != null) updates["status"] = d.status;
  if (d.dueDate !== undefined) updates["dueDate"] = d.dueDate;
  const [updated] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(await formatTask(updated));
});

router.delete("/tasks/:id", requireAuth, requireRole("super_admin", "admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.sendStatus(204);
});

// Task Comments
router.get("/tasks/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const comments = await db.select().from(taskCommentsTable).where(eq(taskCommentsTable.taskId, id));
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const formatted = comments.map((c) => {
    const user = userMap.get(c.userId);
    return {
      id: c.id,
      taskId: c.taskId,
      userId: c.userId,
      userFullName: user?.fullName ?? "Unknown",
      avatarUrl: user?.avatarUrl ?? null,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    };
  });
  res.json(formatted);
});

router.post("/tasks/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(raw, 10);
  const parsed = CreateTaskCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [comment] = await db.insert(taskCommentsTable).values({
    taskId: id,
    userId: req.user!.id,
    body: parsed.data.body,
  }).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
  res.status(201).json({
    id: comment.id,
    taskId: comment.taskId,
    userId: comment.userId,
    userFullName: user?.fullName ?? "Unknown",
    avatarUrl: user?.avatarUrl ?? null,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  });
});

export default router;
