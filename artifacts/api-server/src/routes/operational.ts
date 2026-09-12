import { Router, type IRouter } from "express";
import { DecideApprovalBody, DecideApprovalResponse, EditApprovalDraftBody, EditApprovalDraftResponse } from "@workspace/api-zod";
import { isSameOriginRequest } from "../lib/pilot-authorization";
import { verifiedActorId } from "../middlewares/auth-security.js";
import { answerOperationalQuestion, decideProposalReview, editProposalDraft, getRuntimeReadiness, loadOperationalList, loadOpportunities, loadPerformance, parsePerformanceFilters, ProposalDecisionError } from "../lib/operational-data";

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
router.post("/approvals/:id/decision", async (req, res) => {
  if (!isSameOriginRequest(req.get("origin"), req.get("host"))) return res.status(403).json({ error: "same_origin_review_required" });
  const body = DecideApprovalBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_approval_decision" });
  try {
    const actorId = verifiedActorId(req);
    return res.json(DecideApprovalResponse.parse(await decideProposalReview(req.params.id, body.data, actorId)));
  } catch (error) {
    if (error instanceof ProposalDecisionError) return res.status(error.status).json({ error: error.category });
    if (error instanceof Error && error.message === "verified_actor_missing") return res.status(401).json({ error: "authentication_required" });
    return res.status(500).json({ error: "approval_decision_failed" });
  }
});
router.patch("/approvals/:id/draft", async (req, res) => {
  if (!isSameOriginRequest(req.get("origin"), req.get("host"))) return res.status(403).json({ error: "same_origin_review_required" });
  const body = EditApprovalDraftBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_draft_request" });
  try {
    const actorId = verifiedActorId(req);
    return res.json(EditApprovalDraftResponse.parse(await editProposalDraft(req.params.id, body.data, actorId)));
  } catch (error) {
    if (error instanceof ProposalDecisionError) return res.status(error.status).json({ error: error.category });
    if (error instanceof Error && error.message === "verified_actor_missing") return res.status(401).json({ error: "authentication_required" });
    return res.status(500).json({ error: "proposal_draft_failed" });
  }
});
router.get("/performance", async (req, res) => res.json(await loadPerformance(parsePerformanceFilters(req.query))));
router.post("/command", async (req, res) => {
  if (typeof req.body?.question !== "string" || req.body.question.trim().length < 2 || req.body.question.length > 500) return res.status(400).json({ answer: "Enter a short operational SEO question." });
  try { return res.json({ answer: await answerOperationalQuestion(req.body.question) }); } catch { return res.status(500).json({ answer: "SEO ENGINE could not process that read-only query." }); }
});
export default router;