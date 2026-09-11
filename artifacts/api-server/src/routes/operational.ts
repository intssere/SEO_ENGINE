import { Router, type IRouter } from "express";
import { answerOperationalQuestion, getRuntimeReadiness, loadOperationalList, loadOpportunities, loadPerformance, parsePerformanceFilters } from "../lib/operational-data";

const router: IRouter = Router();
for (const section of ["ai-visibility", "learning", "impact", "verification", "policies"]) {
  router.get(`/${section}`, async (_req, res) => res.json({ readiness: await getRuntimeReadiness(), rows: [] }));
}
router.get("/technical-seo", async (_req, res) => res.json(await loadOperationalList("findings")));
router.get("/technical-seo/findings", async (_req, res) => res.json(await loadOperationalList("findings")));
router.get("/opportunities", async (_req, res) => res.json(await loadOpportunities()));
const listKinds = ["actions", "approvals", "deployments", "findings"] as const;
for (const kind of listKinds) {
  router.get(`/${kind}`, async (_req, res) => res.json(await loadOperationalList(kind)));
  router.get(`/${kind}/:id`, async (req, res) => {
    const data = await loadOperationalList(kind);
    const row = data.rows.find((item) => item.id === req.params.id);
    if (!row) return res.status(404).json({ error: "Record not found." });
    return res.json({ readiness: data.readiness, row });
  });
}
router.get("/performance", async (req, res) => res.json(await loadPerformance(parsePerformanceFilters(req.query))));
router.post("/command", async (req, res) => {
  if (typeof req.body?.question !== "string" || req.body.question.trim().length < 2 || req.body.question.length > 500) return res.status(400).json({ answer: "Enter a short operational SEO question." });
  try { return res.json({ answer: await answerOperationalQuestion(req.body.question) }); } catch { return res.status(500).json({ answer: "SEO ENGINE could not process that read-only query." }); }
});
export default router;