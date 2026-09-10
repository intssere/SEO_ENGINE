import { Router, type IRouter } from "express";
import { GetDashboardResponse } from "@workspace/api-zod";
import { loadDashboardData } from "../lib/dashboard-data";
import { parsePerformanceFilters } from "../lib/operational-data";

const router: IRouter = Router();

router.get("/dashboard", async (req, res) => {
  const data = GetDashboardResponse.parse(await loadDashboardData(parsePerformanceFilters(req.query)));
  req.log.info({ state: data.state }, "Dashboard snapshot loaded");
  res.json(data);
});

export default router;