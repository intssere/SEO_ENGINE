import { Router, type IRouter } from "express";
import { isSameOriginRequest } from "../lib/pilot-authorization";
import { authorizeApprovedProposal, ExecutionAuthorizationError, loadExecutionFoundation } from "../lib/execution-store.js";
import { task52OperatorStates } from "../lib/shopify-write-foundation.js";

const router: IRouter = Router();

router.get("/execution", async (_req, res) => {
  const foundation = await loadExecutionFoundation();
  return res.json({
    ...foundation,
    task52: {
      version: "shopify_write_verification_rollback_dry_run_v1",
      mode: "dry_run_only",
      provider: "shopify",
      provider_write_dispatch_enabled: false,
      public_site_write_required_for_live_dispatch: true,
      independent_read_after_write: true,
      rollback_from_pre_write_snapshot: true,
      operator_states: task52OperatorStates,
    },
  });
});

router.post("/execution/:id/authorize", async (req, res) => {
  if (!isSameOriginRequest(req.get("origin"), req.get("host"))) {
    return res.status(403).json({ error: "same_origin_execution_authorization_required" });
  }
  const proposalFingerprint = typeof req.body?.proposalFingerprint === "string" ? req.body.proposalFingerprint.trim() : "";
  const confirmation = typeof req.body?.confirmation === "string" ? req.body.confirmation : "";
  if (!proposalFingerprint || !confirmation) return res.status(400).json({ error: "invalid_execution_authorization_request" });
  try {
    return res.json(await authorizeApprovedProposal(req.params.id, { proposalFingerprint, confirmation }));
  } catch (error) {
    if (error instanceof ExecutionAuthorizationError) return res.status(error.status).json({ error: error.category });
    return res.status(500).json({ error: "execution_authorization_failed" });
  }
});

export default router;
