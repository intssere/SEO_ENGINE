import { Router, type IRouter } from "express";
import { loadAuthorityDashboardData } from "../lib/authority-dashboard-data.js";

const router: IRouter = Router();

router.get("/authority/dashboard", async (req, res) => {
  const data = await loadAuthorityDashboardData();
  req.log.info(
    {
      state: data.state,
      evidence: data.readiness.evidence,
      trend: data.readiness.trend,
      competitorGap: data.readiness.competitorGap,
    },
    "Authority dashboard loaded",
  );
  res.json(data);
});

export default router;
