import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import {
  executeAuthorizedSignalCollectionJob,
  signalCollectionExecutionCapability,
} from "../lib/signal-collection-execution.js";
import type { SourceAdapterRequest } from "../lib/signal-observation-normalization.js";
import type { SignalCollectionJobPacket } from "../lib/signal-collection-job-planning.js";
import type { RefreshPlan, SignalSourceDescriptor } from "../lib/signal-source-registry.js";
import { verifiedActorId } from "../middlewares/auth-security.js";

const router: IRouter = Router();

function objectValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireTask70Admin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ error: "authentication_required" });
  if (req.auth.role !== "admin") return res.status(403).json({ error: "insufficient_role", requiredRole: "admin" });
  return next();
}

function statusForFailure(reason: string): number {
  if (reason === "signal_collection_execution_disabled") return 403;
  if (reason === "signal_collection_authorization_already_consumed"
    || reason === "signal_collection_execution_identity_collision"
    || reason === "signal_collection_claim_failed") return 409;
  if (reason === "signal_collection_runner_unavailable"
    || reason === "operational_site_unavailable"
    || reason === "database_unavailable") return 503;
  if (reason === "signal_collection_runner_failed" || reason === "signal_collection_normalization_failed") return 502;
  if (reason === "signal_collection_manual_intervention_required") return 500;
  return 422;
}

router.use(requireTask70Admin);

router.get("/signal-collection-execution/capability", (_req: Request, res: Response) => {
  res.json(signalCollectionExecutionCapability());
});

router.post("/signal-collection-execution/run", async (req: Request, res: Response) => {
  const body = objectValue(req.body) ? req.body : null;
  if (!body) return res.status(400).json({ error: "invalid_signal_collection_execution_request" });

  const packet = body.packet;
  const source = body.source;
  const plan = body.plan;
  const request = body.request;
  const authorization = typeof body.authorization === "string" ? body.authorization.trim() : "";
  if (!objectValue(packet)
    || !objectValue(source)
    || !objectValue(plan)
    || !objectValue(request)
    || !authorization) {
    return res.status(400).json({ error: "invalid_signal_collection_execution_request" });
  }

  const result = await executeAuthorizedSignalCollectionJob({
    packet: packet as unknown as SignalCollectionJobPacket,
    source: source as unknown as SignalSourceDescriptor,
    plan: plan as unknown as RefreshPlan,
    request: request as unknown as SourceAdapterRequest,
    authorization,
    actorId: verifiedActorId(req),
  });

  if (!result.ok) {
    return res.status(statusForFailure(result.reason)).json({
      error: result.reason,
      executionJobId: result.executionJobId,
      consumed: result.consumed,
      ...(result.receipt ? { receipt: result.receipt } : {}),
    });
  }
  return res.status(200).json(result);
});

export default router;
