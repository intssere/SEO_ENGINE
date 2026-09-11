import { createHash } from "node:crypto";

export type ControlledActionType = "metadata.title" | "metadata.description" | "image.alt";
export type ControlledOptimizationState = "prepared" | "authorized" | "executed" | "verified" | "rollback_required" | "rolled_back";

export interface ControlledOptimizationRequest {
  siteId: string;
  siteDomain: string;
  opportunityId: string;
  actionPlanId: string;
  actionId: string;
  actionType: ControlledActionType;
  target: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  expectedState: Record<string, unknown>;
  safetyDisposition: "auto" | "approval";
}

export interface ExplicitProductionAuthorization {
  siteDomain: string;
  actionId: string;
  actionType: ControlledActionType;
  approvedBy: string;
  authorizationRef: string;
}

export interface ControlledOptimizationPermit {
  state: "authorized";
  siteId: string;
  siteDomain: string;
  actionId: string;
  actionType: ControlledActionType;
  target: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  expectedState: Record<string, unknown>;
  approvedBy: string;
  authorizationRef: string;
  permitFingerprint: string;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function validateControlledOptimizationRequest(request: ControlledOptimizationRequest): string[] {
  const blockers: string[] = [];
  if (!request.siteId.trim()) blockers.push("siteId is required");
  if (!request.opportunityId.trim()) blockers.push("opportunityId is required");
  if (!request.actionPlanId.trim()) blockers.push("actionPlanId is required");
  if (!request.actionId.trim()) blockers.push("actionId is required");
  if (normalizeDomain(request.siteDomain) !== "diamondshelf.us") blockers.push("Task #27 is locked to diamondshelf.us");
  if (Object.keys(request.beforeState).length === 0) blockers.push("Captured before-state is required before production authorization");
  if (Object.keys(request.proposedChange).length === 0) blockers.push("Proposed change is required");
  if (Object.keys(request.expectedState).length === 0) blockers.push("Expected verification state is required");
  if (!(["metadata.title", "metadata.description", "image.alt"] as string[]).includes(request.actionType)) blockers.push("Action type is outside the Task #27 low-risk allowlist");
  return blockers;
}

export function issueControlledOptimizationPermit(
  request: ControlledOptimizationRequest,
  authorization: ExplicitProductionAuthorization,
): ControlledOptimizationPermit {
  const blockers = validateControlledOptimizationRequest(request);
  if (blockers.length) throw new Error(blockers.join("; "));
  if (process.env.PUBLIC_SITE_WRITES_ENABLED !== "true") {
    throw new Error("Global public-site write kill switch is disabled.");
  }
  if (normalizeDomain(authorization.siteDomain) !== normalizeDomain(request.siteDomain)) {
    throw new Error("Production authorization site does not match the requested site.");
  }
  if (authorization.actionId !== request.actionId) {
    throw new Error("Production authorization actionId does not match the requested action.");
  }
  if (authorization.actionType !== request.actionType) {
    throw new Error("Production authorization action type does not match the requested action.");
  }
  if (!authorization.approvedBy.trim() || !authorization.authorizationRef.trim()) {
    throw new Error("Explicit production authorization identity and reference are required.");
  }

  const permitFingerprint = hash([
    request.siteId,
    normalizeDomain(request.siteDomain),
    request.opportunityId,
    request.actionPlanId,
    request.actionId,
    request.actionType,
    request.target,
    request.beforeState,
    request.proposedChange,
    request.expectedState,
    authorization.approvedBy,
    authorization.authorizationRef,
  ]);

  return {
    state: "authorized",
    siteId: request.siteId,
    siteDomain: normalizeDomain(request.siteDomain),
    actionId: request.actionId,
    actionType: request.actionType,
    target: stable(request.target) as Record<string, unknown>,
    beforeState: stable(request.beforeState) as Record<string, unknown>,
    proposedChange: stable(request.proposedChange) as Record<string, unknown>,
    expectedState: stable(request.expectedState) as Record<string, unknown>,
    approvedBy: authorization.approvedBy.trim(),
    authorizationRef: authorization.authorizationRef.trim(),
    permitFingerprint,
  };
}

export function assertSingleActionPermit(permit: ControlledOptimizationPermit): void {
  if (permit.state !== "authorized") throw new Error("Controlled optimization permit is not authorized.");
  if (normalizeDomain(permit.siteDomain) !== "diamondshelf.us") throw new Error("Permit is not for Diamond Shelf.");
  if (!permit.actionId.trim() || !permit.permitFingerprint.trim()) throw new Error("Permit identity is incomplete.");
}

export function verificationOutcome(status: "verified" | "failed" | "regressed"): ControlledOptimizationState {
  return status === "verified" ? "verified" : "rollback_required";
}
