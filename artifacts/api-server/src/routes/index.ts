import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import operationalRouter from "./operational";
import connectionsRouter from "./connections";
import pilotRouter from "./pilot";
import executionRouter from "./execution";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(operationalRouter);
router.use(connectionsRouter);
router.use(pilotRouter);
router.use(executionRouter);

export default router;
