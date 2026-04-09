import bcrypt from "bcryptjs";
import { db, usersTable, departmentsTable, leaveBalancesTable, companySettingsTable } from "./db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Seed departments
  const existingDepts = await db.select().from(departmentsTable);
  let webDept = existingDepts.find((d) => d.slug === "web");
  let ecommDept = existingDepts.find((d) => d.slug === "ecommerce");

  if (!webDept) {
    [webDept] = await db.insert(departmentsTable).values({ name: "Web", slug: "web" }).returning();
    console.log("Created Web department");
  }

  if (!ecommDept) {
    [ecommDept] = await db.insert(departmentsTable).values({ name: "E-Commerce", slug: "ecommerce" }).returning();
    console.log("Created E-Commerce department");
  }

  // Seed company settings
  const [existingSettings] = await db.select().from(companySettingsTable);
  if (!existingSettings) {
    await db.insert(companySettingsTable).values({
      companyName: "CoreHR",
      timezone: "UTC",
      workStartTime: "09:00",
      workEndTime: "18:00",
      payrollCycleDay: 25,
      lateThresholdMinutes: 15,
    });
    console.log("Created company settings");
  }

  const hash = await bcrypt.hash("Admin@1234", 10);

  // Seed Super Admin
  const [existingSuperAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, "superadmin@gmail.com"));
  if (!existingSuperAdmin) {
    await db.insert(usersTable).values({
      email: "superadmin@gmail.com",
      passwordHash: hash,
      fullName: "Super Admin",
      role: "super_admin",
      employmentStatus: "active",
      position: "Super Administrator",
      joinDate: "2020-01-01",
    });
    console.log("Created Super Admin");
  }

  // Seed Admin
  const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@gmail.com"));
  if (!existingAdmin) {
    const [admin] = await db.insert(usersTable).values({
      email: "admin@gmail.com",
      passwordHash: hash,
      fullName: "Department Admin",
      role: "admin",
      departmentId: webDept.id,
      employmentStatus: "active",
      position: "Admin Manager",
      joinDate: "2021-01-01",
    }).returning();
    console.log("Created Admin", admin.id);
  }

  // Seed a sample employee
  const [existingEmp] = await db.select().from(usersTable).where(eq(usersTable.email, "employee@gmail.com"));
  if (!existingEmp) {
    const [emp] = await db.insert(usersTable).values({
      email: "employee@gmail.com",
      passwordHash: hash,
      fullName: "Jane Smith",
      role: "employee",
      departmentId: webDept.id,
      employmentStatus: "active",
      position: "Frontend Developer",
      phone: "+1-555-0101",
      joinDate: "2022-06-15",
    }).returning();

    // Seed leave balances for employee
    const year = new Date().getFullYear();
    const leaveTypes = [
      { leaveType: "annual", allocated: 14 },
      { leaveType: "sick", allocated: 7 },
      { leaveType: "emergency", allocated: 3 },
      { leaveType: "unpaid", allocated: 30 },
    ];
    for (const t of leaveTypes) {
      await db.insert(leaveBalancesTable).values({ userId: emp.id, leaveType: t.leaveType, allocated: t.allocated, used: 0, year });
    }
    console.log("Created sample employee");
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
