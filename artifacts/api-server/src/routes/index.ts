import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import operationalRouter from "./operational";
import task53WriteScopeRouter from "./task53-write-scope";
import connectionsRouter from "./connections";
import pilotRouter from "./pilot";
import executionRouter from "./execution";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(operationalRouter);
router.use(task53WriteScopeRouter);
router.use(connectionsRouter);
router.use(pilotRouter);
router.use(executionRouter);

export default router;
