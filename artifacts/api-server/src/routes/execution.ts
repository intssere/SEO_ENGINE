import { Router, type IRouter, type Response } from "express";
import { isSameOriginRequest } from "../lib/pilot-authorization";
import { authorizeApprovedProposal, ExecutionAuthorizationError, loadExecutionFoundation } from "../lib/execution-store.js";
import { task52OperatorStates } from "../lib/shopify-write-foundation.js";
import { runTask52RuntimeSelfTest } from "../lib/task52-runtime-self-test.js";
import { inspectTask53ShopifyCapability, Task53CredentialError } from "../lib/task53-shopify-credential.js";
import { executeTask53ProductionPilot, getTask53Preflight, Task53ExecutionError } from "../lib/task53-store.js";
import { TASK53_VERSION, Task53ProviderError, type Task53Resource } from "../lib/task53-production-pilot.js";

const router: IRouter = Router();

function task53Resource(body: unknown): Task53Resource | null {
  const row = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const kind = row.resourceKind;
  const gid = typeof row.resourceGid === "string" ? row.resourceGid.trim() : "";
  if ((kind !== "product" && kind !== "collection") || !gid) return null;
  return { kind, gid };
}

function task53Error(res: Response, error: unknown) {
  if (error instanceof Task53ExecutionError) return res.status(error.status).json({ error: error.category });
  if (error instanceof Task53CredentialError) return res.status(409).json({ error: error.category });
  if (error instanceof Task53ProviderError) return res.status(error.httpStatus && error.httpStatus >= 400 && error.httpStatus < 600 ? 502 : 409).json({ error: error.category });
  return res.status(500).json({ error: "task53_execution_failed" });
}

router.get("/execution", async (_req, res) => {
  const foundation = await loadExecutionFoundation();
  let task53Capability = { connected: false, writeProductsScopePresent: false, credentialAvailable: false };
  try {
    const capability = await inspectTask53ShopifyCapability();
    task53Capability = {
      connected: capability.connected,
      writeProductsScopePresent: capability.writeProductsScopePresent,
      credentialAvailable: capability.credentialAvailable,
    };
  } catch {
    // Public execution status remains available even if capability inspection is temporarily unavailable.
  }
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
      runtime_self_test: "/api/execution/task52/self-test",
      operator_states: task52OperatorStates,
    },
    task53: {
      version: TASK53_VERSION,
      mode: "single_action_production_pilot",
      provider: "shopify",
      provider_write_dispatch_enabled: process.env.PUBLIC_SITE_WRITES_ENABLED?.trim().toLowerCase() === "true",
      global_public_write_gate_required: true,
      same_origin_required: true,
      explicit_execute_and_rollback_confirmation_required: true,
      isolated_write_credential_required: true,
      required_scope: "write_products",
      resource_kinds: ["product", "collection"],
      fields: ["title", "meta_description"],
      independent_provider_read_after_write: true,
      independent_storefront_verification: true,
      deterministic_rollback_required: true,
      automatic_scheduler_enabled: false,
      capability: task53Capability,
    },
  });
});

router.get("/execution/task52/self-test", (_req, res) => {
  const result = runTask52RuntimeSelfTest();
  return res.status(result.status === "passed" ? 200 : 503).json(result);
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

router.post("/execution/:id/task53/preflight", async (req, res) => {
  if (!isSameOriginRequest(req.get("origin"), req.get("host"))) return res.status(403).json({ error: "same_origin_task53_preflight_required" });
  const resource = task53Resource(req.body);
  if (!resource) return res.status(400).json({ error: "invalid_task53_resource" });
  try {
    return res.json(await getTask53Preflight(req.params.id, resource));
  } catch (error) {
    return task53Error(res, error);
  }
});

router.post("/execution/:id/task53/execute", async (req, res) => {
  if (!isSameOriginRequest(req.get("origin"), req.get("host"))) return res.status(403).json({ error: "same_origin_task53_execution_required" });
  const resource = task53Resource(req.body);
  const preflightFingerprint = typeof req.body?.preflightFingerprint === "string" ? req.body.preflightFingerprint.trim() : "";
  const confirmation = typeof req.body?.confirmation === "string" ? req.body.confirmation : "";
  if (!resource || !preflightFingerprint || !confirmation) return res.status(400).json({ error: "invalid_task53_execution_request" });
  try {
    return res.json(await executeTask53ProductionPilot(req.params.id, { resource, preflightFingerprint, confirmation }));
  } catch (error) {
    return task53Error(res, error);
  }
});

export default router;