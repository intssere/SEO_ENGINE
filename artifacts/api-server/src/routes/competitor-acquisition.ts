import { Router, type IRouter, type Request, type Response } from "express";
import {
  competitorAcquisitionCapability,
  runConfiguredCompetitorAcquisition,
  type AcquisitionRunResult,
} from "../lib/competitor-acquisition.js";
import {
  createSecureCompetitorRuntimeDependencies,
  secureCompetitorTransportCapability,
} from "../lib/secure-competitor-transport.js";

const router: IRouter = Router();
const secureRuntimeDeps = createSecureCompetitorRuntimeDependencies();

function statusForResult(result: AcquisitionRunResult): number {
  if (result.ok) return 200;
  if (result.reason === "competitor_target_not_allowlisted") return 404;
  if (result.reason === "competitor_collection_disabled" || result.reason === "competitor_persistence_disabled") return 403;
  if (result.reason === "competitor_acquisition_configuration_invalid" || result.reason === "operational_site_unavailable" || result.reason === "database_unavailable") return 503;
  return 422;
}

function targetId(req: Request): string | null {
  const candidate = typeof req.body?.targetId === "string" ? req.body.targetId.trim() : "";
  return /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(candidate) ? candidate : null;
}

router.get("/competitor-acquisition/capability", (_req: Request, res: Response) => {
  res.json({
    ...competitorAcquisitionCapability(),
    transport: secureCompetitorTransportCapability(),
  });
});

router.post("/competitor-acquisition/dry-run", async (req: Request, res: Response) => {
  const id = targetId(req);
  if (!id) return res.status(400).json({ error: "invalid_competitor_target_id" });
  const result = await runConfiguredCompetitorAcquisition({
    targetId: id,
    mode: "dry_run",
    deps: secureRuntimeDeps,
  });
  return res.status(statusForResult(result)).json(result.ok ? result : { error: result.reason });
});

router.post("/competitor-acquisition/persist", async (req: Request, res: Response) => {
  const id = targetId(req);
  if (!id) return res.status(400).json({ error: "invalid_competitor_target_id" });
  const result = await runConfiguredCompetitorAcquisition({
    targetId: id,
    mode: "persist",
    deps: secureRuntimeDeps,
  });
  return res.status(statusForResult(result)).json(result.ok ? result : { error: result.reason });
});

export default router;
