import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import departmentsRouter from "./departments";
import attendanceRouter from "./attendance";
import leaveRouter from "./leave";
import complaintsRouter from "./complaints";
import requestsRouter from "./requests";
import payrollRouter from "./payroll";
import projectsRouter from "./projects";
import notificationsRouter from "./notifications";
import reportsRouter from "./reports";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(departmentsRouter);
router.use(attendanceRouter);
router.use(leaveRouter);
router.use(complaintsRouter);
router.use(requestsRouter);
router.use(payrollRouter);
router.use(projectsRouter);
router.use(notificationsRouter);
router.use(reportsRouter);
router.use(settingsRouter);

export default router;
