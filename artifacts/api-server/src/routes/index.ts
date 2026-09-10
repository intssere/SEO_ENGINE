import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import operationalRouter from "./operational";
import connectionsRouter from "./connections";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(operationalRouter);
router.use(connectionsRouter);

export default router;
