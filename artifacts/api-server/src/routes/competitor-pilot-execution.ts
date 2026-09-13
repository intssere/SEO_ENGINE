import { Router, type IRouter, type Request, type Response } from "express";
import {
  competitorPilotExecutionCapability,
  executeAuthorizedCompetitorPilotDryRun,
} from "../lib/competitor-pilot-execution.js";
import type { OneTargetPilotPlan } from "../lib/competitor-pilot-readiness.js";
import type { TargetRegistrationProposal } from "../lib/competitor-target-registration.js";
import { verifiedActorId } from "../middlewares/auth-security.js";

const router: IRouter = Router();

function statusForFailure(reason: string): number {
  if (reason === "competitor_pilot_execution_disabled") return 403;
  if (reason === "competitor_pilot_authorization_already_consumed"
    || reason === "competitor_pilot_execution_identity_collision"
    || reason === "competitor_pilot_claim_failed") return 409;
  if (reason === "operational_site_unavailable" || reason === "database_unavailable") return 503;
  if (reason === "competitor_pilot_manual_intervention_required" || reason === "competitor_pilot_execution_store_failed") return 500;
  if (reason === "competitor_pilot_acquisition_failed") return 502;
  return 422;
}

function objectValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

router.get("/competitor-pilot-execution/capability", (_req: Request, res: Response) => {
  res.json(competitorPilotExecutionCapability());
});

router.post("/competitor-pilot-execution/dry-run", async (req: Request, res: Response) => {
  const body = objectValue(req.body) ? req.body : null;
  if (!body) return res.status(400).json({ error: "invalid_competitor_pilot_request" });
  const plan = body.plan;
  const sourceProposal = body.sourceProposal;
  const authorization = typeof body.authorization === "string" ? body.authorization.trim() : "";
  const registrationReviewDecision = body.registrationReviewDecision;
  if (!objectValue(plan)
    || !objectValue(sourceProposal)
    || !authorization
    || registrationReviewDecision !== "approved") {
    return res.status(400).json({ error: "invalid_competitor_pilot_request" });
  }

  const result = await executeAuthorizedCompetitorPilotDryRun({
    plan: plan as unknown as OneTargetPilotPlan,
    sourceProposal: sourceProposal as unknown as TargetRegistrationProposal,
    registrationReviewDecision: "approved",
    authorization,
    actorId: verifiedActorId(req),
  });
  if (!result.ok) {
    return res.status(statusForFailure(result.reason)).json({
      error: result.reason,
      jobId: result.jobId,
      consumed: result.consumed,
      ...(result.receipt ? { receipt: result.receipt } : {}),
    });
  }
  return res.status(200).json(result);
});

export default router;
