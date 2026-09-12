import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import operationalRouter from "./operational";
import task53WriteScopeRouter from "./task53-write-scope";
import connectionsRouter from "./connections";
import pilotRouter from "./pilot";
import executionRouter from "./execution";
import { requireApiAuthentication, sensitiveMutationRateLimit } from "../middlewares/auth-security.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requireApiAuthentication);
router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase())) {
    return sensitiveMutationRateLimit(req, res, next);
  }
  return next();
});
router.use(dashboardRouter);
router.use(operationalRouter);
router.use(task53WriteScopeRouter);
router.use(connectionsRouter);
router.use(pilotRouter);
router.use(executionRouter);

export default router;
