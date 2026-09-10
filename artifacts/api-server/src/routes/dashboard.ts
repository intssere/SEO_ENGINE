import { Router, type IRouter } from "express";
import { GetDashboardResponse } from "@workspace/api-zod";
import { loadDashboardData } from "../lib/dashboard-data";

const router: IRouter = Router();

router.get("/dashboard", async (req, res) => {
  const data = GetDashboardResponse.parse(await loadDashboardData());
  req.log.info({ state: data.state }, "Dashboard snapshot loaded");
  res.json(data);
});

export default router;