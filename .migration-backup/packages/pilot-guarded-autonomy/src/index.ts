import { createHash } from "node:crypto";

export const DIAMOND_SHELF_DOMAIN = "diamondshelf.us" as const;
export const GUARDED_AUTONOMY_MAX_BATCH = 25 as const;

export type GuardedActionType = "metadata.title" | "metadata.description" | "image.alt";
export type GuardedPilotStatus = "blocked" | "ready" | "halted";

export interface GuardedActionCandidate {
  opportunityId: string;
  planId: string;
  actionId: string;
  pageId: string;
  actionType: GuardedActionType;
  disposition: "auto" | "approval" | "blocked";
  confidence: number;
  reversible: boolean;
  beforeStateCaptured: boolean;
  expectedStateCaptured: boolean;
  targetRef: string;
}

export interface GuardedAutonomyPilotInput {
  siteDomain: string;
  baselineCertified: boolean;
  controlledOptimizationVerified: boolean;
  measurementEvidenceReady: boolean;
  algorithmUpdateMode?: boolean;
  unresolvedRegressions?: number;
  pendingVerifications?: number;
  requestedBatchSize?: number;
  candidates: GuardedActionCandidate[];
}

export interface RejectedCandidate {
  actionId: string;
  reasons: string[];
}

export interface GuardedAutonomyPilotPlan {
  status: GuardedPilotStatus;
  blockers: string[];
  haltReasons: string[];
  admitted: GuardedActionCandidate[];
  rejected: RejectedCandidate[];
  batchLimit: number;
  executionAuthorized: false;
  permitFingerprint: string;
}

export interface GuardedBatchAuthorization {
  siteDomain: string;
  actionIds: string[];
  actorId: string;
  authorizationRef: string;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clean(value: string): string {
  return value.trim();
}

function validCandidate(candidate: GuardedActionCandidate): string[] {
  const reasons: string[] = [];
  if (!clean(candidate.opportunityId)) reasons.push("opportunityId is required");
  if (!clean(candidate.planId)) reasons.push("planId is required");
  if (!clean(candidate.actionId)) reasons.push("actionId is required");
  if (!clean(candidate.pageId)) reasons.push("pageId is required");
  if (!clean(candidate.targetRef)) reasons.push("targetRef is required");
  if (candidate.disposition !== "auto") reasons.push("only low-risk AUTO actions are eligible for guarded autonomy");
  if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0.8 || candidate.confidence > 1) {
    reasons.push("candidate confidence must be between 0.8 and 1.0");
  }
  if (!candidate.reversible) reasons.push("candidate must be reversible");
  if (!candidate.beforeStateCaptured) reasons.push("before-state must be captured");
  if (!candidate.expectedStateCaptured) reasons.push("expected verification state must be captured");
  return reasons;
}

export function planGuardedAutonomyPilot(input: GuardedAutonomyPilotInput): GuardedAutonomyPilotPlan {
  const blockers: string[] = [];
  const haltReasons: string[] = [];
  const siteDomain = clean(input.siteDomain).toLowerCase();

  if (siteDomain !== DIAMOND_SHELF_DOMAIN) blockers.push("Task #29 pilot is locked to diamondshelf.us");
  if (!input.baselineCertified) blockers.push("real Diamond Shelf baseline must be certified");
  if (!input.controlledOptimizationVerified) blockers.push("Task #27 controlled optimization must be verified first");
  if (!input.measurementEvidenceReady) blockers.push("Task #28 measurement evidence must be ready first");

  const unresolvedRegressions = input.unresolvedRegressions ?? 0;
  const pendingVerifications = input.pendingVerifications ?? 0;
  if (!Number.isInteger(unresolvedRegressions) || unresolvedRegressions < 0) blockers.push("unresolvedRegressions must be a non-negative integer");
  if (!Number.isInteger(pendingVerifications) || pendingVerifications < 0) blockers.push("pendingVerifications must be a non-negative integer");

  if (input.algorithmUpdateMode) haltReasons.push("Algorithm Update Mode is active");
  if (unresolvedRegressions > 0) haltReasons.push("unresolved regression exists");
  if (pendingVerifications > 0) haltReasons.push("previous production actions are still awaiting verification");

  const requestedBatchSize = input.requestedBatchSize ?? 10;
  if (!Number.isInteger(requestedBatchSize) || requestedBatchSize < 1 || requestedBatchSize > GUARDED_AUTONOMY_MAX_BATCH) {
    blockers.push(`requestedBatchSize must be between 1 and ${GUARDED_AUTONOMY_MAX_BATCH}`);
  }
  const batchLimit = Number.isInteger(requestedBatchSize)
    ? Math.max(1, Math.min(GUARDED_AUTONOMY_MAX_BATCH, requestedBatchSize))
    : 1;

  const rejected: RejectedCandidate[] = [];
  const eligible: GuardedActionCandidate[] = [];
  const seen = new Set<string>();
  for (const candidate of input.candidates) {
    const actionId = clean(candidate.actionId);
    const reasons = validCandidate(candidate);
    if (seen.has(actionId)) reasons.push("duplicate actionId");
    if (actionId) seen.add(actionId);
    if (reasons.length) rejected.push({ actionId, reasons });
    else eligible.push({ ...candidate, opportunityId: clean(candidate.opportunityId), planId: clean(candidate.planId), actionId, pageId: clean(candidate.pageId), targetRef: clean(candidate.targetRef) });
  }

  eligible.sort((a, b) => b.confidence - a.confidence || a.actionId.localeCompare(b.actionId));
  const admitted = blockers.length || haltReasons.length ? [] : eligible.slice(0, batchLimit);
  if (!blockers.length && !haltReasons.length && admitted.length === 0) blockers.push("no eligible guarded-autonomy actions are available");

  const status: GuardedPilotStatus = blockers.length ? "blocked" : haltReasons.length ? "halted" : "ready";
  return {
    status,
    blockers,
    haltReasons,
    admitted,
    rejected,
    batchLimit,
    executionAuthorized: false,
    permitFingerprint: hash([siteDomain, status, batchLimit, admitted.map((item) => [item.actionId, item.actionType, item.targetRef, item.confidence])]),
  };
}

export function assertGuardedBatchExecutionAuthorized(
  plan: GuardedAutonomyPilotPlan,
  authorization: GuardedBatchAuthorization,
): void {
  if (plan.status !== "ready") throw new Error("Guarded autonomy plan is not ready for execution.");
  if (process.env.PUBLIC_SITE_WRITES_ENABLED !== "true") throw new Error("Public site writes are disabled by the global kill switch.");
  if (clean(authorization.siteDomain).toLowerCase() !== DIAMOND_SHELF_DOMAIN) throw new Error("Authorization site does not match Diamond Shelf.");
  if (!clean(authorization.actorId) || !clean(authorization.authorizationRef)) throw new Error("Explicit actor and authorization reference are required.");

  const expected = [...plan.admitted.map((item) => item.actionId)].sort();
  const authorized = [...authorization.actionIds.map(clean)].sort();
  if (JSON.stringify(expected) !== JSON.stringify(authorized)) {
    throw new Error("Authorization must match the exact admitted action set.");
  }
}

export function shouldAutoHaltAfterVerification(results: Array<{ status: "verified" | "failed" | "regressed" | "pending" }>): boolean {
  return results.some((result) => result.status === "failed" || result.status === "regressed" || result.status === "pending");
}
