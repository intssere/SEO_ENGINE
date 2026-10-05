import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachWorkspaceIntegrity,
  buildAuthorityOutreachWorkspace,
  UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION,
  type AuthorityOutreachReviewDecision,
  type AuthorityOutreachReviewInput,
  type AuthorityOutreachReviewReason,
} from "./authority-outreach-workspace.js";
import type { AuthorityProspectQualificationResult } from "./authority-prospect-qualification.js";

export const UGP_AUTHORITY_OUTREACH_REVIEW_PERSISTENCE_CONTRACT_VERSION =
  "ugp-10-3-outreach-review-persistence-contract-v1" as const;

export type AuthorityOutreachReviewMutationRequest = Readonly<{
  workspaceFingerprint: string;
  workspaceItemId: string;
  workspaceItemFingerprint: string;
  qualificationFingerprint: string;
  prospectFingerprint: string;
  expectedLatestReviewFingerprint: string | null;
  decision: AuthorityOutreachReviewDecision;
  reasonCode: AuthorityOutreachReviewReason;
  confirmation: string;
}>;

export type AuthorityOutreachReviewAuditEvent = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_REVIEW_PERSISTENCE_CONTRACT_VERSION;
  eventId: string;
  eventFingerprint: string;
  sequence: number;
  previousEventFingerprint: string | null;
  workspaceVersion: typeof UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION;
  workspaceFingerprint: string;
  workspaceItemId: string;
  workspaceItemFingerprint: string;
  qualificationFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  targetDomain: string;
  sourceDomain: string;
  targetUrl: string | null;
  qualificationStatus:
    | "qualified_for_review"
    | "needs_review"
    | "insufficient_evidence"
    | "disqualified";
  decision: AuthorityOutreachReviewDecision;
  reasonCode: AuthorityOutreachReviewReason;
  reviewerId: string;
  reviewedAt: string;
  reviewFingerprint: string;
  requestFingerprint: string;
  semantics: Readonly<{
    humanDecision: true;
    appendOnlyAuditRequired: true;
    immutableAuditRequired: true;
    persistenceRequired: true;
    approvalForDraftOnly: true;
    contactDiscoveryAuthorized: false;
    outreachDraftingAuthorized: false;
    outreachSendingAuthorized: false;
    liveProviderExecutionAuthorized: false;
    publicSiteWrites: false;
  }>;
}>;

export type AuthorityOutreachPreparedReviewDecision = Readonly<{
  review: AuthorityOutreachReviewInput;
  auditEvent: AuthorityOutreachReviewAuditEvent;
  nextWorkspaceFingerprint: string;
  nextWorkspaceItemFingerprint: string;
  resultingState: string;
  semantics: Readonly<{
    deterministicPreparation: true;
    performsPersistence: false;
    requiresAuthenticatedOperator: true;
    requiresCsrf: true;
    requiresSameOrigin: true;
    transactionRequired: true;
    staleWriteRejectionRequired: true;
    appendOnlyAuditRequired: true;
    immutableAuditRequired: true;
    contactDiscoveryAuthorized: false;
    outreachDraftingAuthorized: false;
    outreachSendingAuthorized: false;
  }>;
}>;

const HEX64 = /^[0-9a-f]{64}$/;
const EXACT_ID = /^[A-Za-z0-9][A-Za-z0-9._:@+\/-]{0,511}$/;

const EVENT_SEMANTICS = Object.freeze({
  humanDecision: true as const,
  appendOnlyAuditRequired: true as const,
  immutableAuditRequired: true as const,
  persistenceRequired: true as const,
  approvalForDraftOnly: true as const,
  contactDiscoveryAuthorized: false as const,
  outreachDraftingAuthorized: false as const,
  outreachSendingAuthorized: false as const,
  liveProviderExecutionAuthorized: false as const,
  publicSiteWrites: false as const,
});

const PREPARATION_SEMANTICS = Object.freeze({
  deterministicPreparation: true as const,
  performsPersistence: false as const,
  requiresAuthenticatedOperator: true as const,
  requiresCsrf: true as const,
  requiresSameOrigin: true as const,
  transactionRequired: true as const,
  staleWriteRejectionRequired: true as const,
  appendOnlyAuditRequired: true as const,
  immutableAuditRequired: true as const,
  contactDiscoveryAuthorized: false as const,
  outreachDraftingAuthorized: false as const,
  outreachSendingAuthorized: false as const,
});

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function fingerprint(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) throw new Error(code);
  return value;
}

function nullableFingerprint(value: unknown, code: string): string | null {
  if (value === null) return null;
  return fingerprint(value, code);
}

function exactId(value: unknown, code: string): string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    !EXACT_ID.test(value)
  ) {
    throw new Error(code);
  }
  return value;
}

function reviewerId(value: unknown): string {
  return exactId(value, "ugp_outreach_review_invalid_reviewer");
}

function canonicalTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("ugp_outreach_review_invalid_reviewed_at");
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error("ugp_outreach_review_invalid_reviewed_at");
  }
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) {
    throw new Error("ugp_outreach_review_invalid_reviewed_at");
  }
  return canonical;
}

function expectedConfirmation(
  request: AuthorityOutreachReviewMutationRequest,
): string {
  return [
    "REVIEW_OUTREACH",
    request.decision,
    request.prospectFingerprint,
    request.workspaceFingerprint,
  ].join(":");
}

function eventFingerprintPayload(
  event: Omit<AuthorityOutreachReviewAuditEvent, "eventId" | "eventFingerprint">,
) {
  return {
    purpose: "ugp_authority_outreach_review_audit_event",
    ...event,
  };
}

function assertEventIntegrity(
  event: AuthorityOutreachReviewAuditEvent,
  expectedSequence: number,
  previousEventFingerprint: string | null,
): void {
  if (
    event.version !== UGP_AUTHORITY_OUTREACH_REVIEW_PERSISTENCE_CONTRACT_VERSION
  ) {
    throw new Error("ugp_outreach_review_audit_version_invalid");
  }
  if (event.sequence !== expectedSequence) {
    throw new Error("ugp_outreach_review_audit_sequence_invalid");
  }
  if (event.previousEventFingerprint !== previousEventFingerprint) {
    throw new Error("ugp_outreach_review_audit_chain_invalid");
  }
  fingerprint(event.workspaceFingerprint, "ugp_outreach_review_audit_workspace_invalid");
  fingerprint(
    event.workspaceItemFingerprint,
    "ugp_outreach_review_audit_workspace_item_invalid",
  );
  fingerprint(
    event.qualificationFingerprint,
    "ugp_outreach_review_audit_qualification_invalid",
  );
  fingerprint(
    event.prospectFingerprint,
    "ugp_outreach_review_audit_prospect_invalid",
  );
  fingerprint(
    event.opportunityFingerprint,
    "ugp_outreach_review_audit_opportunity_invalid",
  );
  fingerprint(
    event.reviewFingerprint,
    "ugp_outreach_review_audit_review_invalid",
  );
  fingerprint(
    event.requestFingerprint,
    "ugp_outreach_review_audit_request_invalid",
  );
  const supplied = fingerprint(
    event.eventFingerprint,
    "ugp_outreach_review_audit_event_invalid",
  );
  const { eventId: _eventId, eventFingerprint: _eventFingerprint, ...withoutIdentity } =
    event;
  const expected = hash(eventFingerprintPayload(withoutIdentity));
  if (supplied !== expected) {
    throw new Error("ugp_outreach_review_audit_fingerprint_mismatch");
  }
  if (event.eventId !== "uaoe-" + expected.slice(0, 24)) {
    throw new Error("ugp_outreach_review_audit_id_mismatch");
  }
  if (
    event.semantics.humanDecision !== true ||
    event.semantics.appendOnlyAuditRequired !== true ||
    event.semantics.immutableAuditRequired !== true ||
    event.semantics.persistenceRequired !== true ||
    event.semantics.approvalForDraftOnly !== true ||
    event.semantics.contactDiscoveryAuthorized !== false ||
    event.semantics.outreachDraftingAuthorized !== false ||
    event.semantics.outreachSendingAuthorized !== false ||
    event.semantics.liveProviderExecutionAuthorized !== false ||
    event.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_outreach_review_audit_unsafe_semantics");
  }
}

export function assertAuthorityOutreachReviewAuditHistoryIntegrity(
  events: readonly AuthorityOutreachReviewAuditEvent[],
): void {
  let previous: string | null = null;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    assertEventIntegrity(event, index + 1, previous);
    if (
      index > 0 &&
      (
        event.qualificationFingerprint !== events[0]!.qualificationFingerprint ||
        event.prospectFingerprint !== events[0]!.prospectFingerprint ||
        event.targetDomain !== events[0]!.targetDomain
      )
    ) {
      throw new Error("ugp_outreach_review_audit_lineage_mismatch");
    }
    previous = event.eventFingerprint;
  }
}

export function prepareAuthorityOutreachReviewDecision(input: Readonly<{
  qualification: AuthorityProspectQualificationResult;
  existingReviews?: readonly AuthorityOutreachReviewInput[];
  existingAuditEvents?: readonly AuthorityOutreachReviewAuditEvent[];
  request: AuthorityOutreachReviewMutationRequest;
  reviewerId: string;
  reviewedAt: string;
}>): AuthorityOutreachPreparedReviewDecision {
  const existingReviews = input.existingReviews ?? [];
  const auditEvents = input.existingAuditEvents ?? [];
  assertAuthorityOutreachReviewAuditHistoryIntegrity(auditEvents);

  const workspaceInput = {
    qualification: input.qualification,
    reviews: existingReviews,
  };
  const workspace = buildAuthorityOutreachWorkspace(workspaceInput);
  assertAuthorityOutreachWorkspaceIntegrity(workspace, workspaceInput);

  const request = input.request;
  if (request.workspaceFingerprint !== workspace.workspaceFingerprint) {
    throw new Error("ugp_outreach_review_stale_workspace");
  }
  if (request.qualificationFingerprint !== workspace.qualificationFingerprint) {
    throw new Error("ugp_outreach_review_stale_qualification");
  }

  const item = workspace.items.find(
    (candidate) => candidate.workspaceItemId === request.workspaceItemId,
  );
  if (!item) throw new Error("ugp_outreach_review_workspace_item_not_found");
  if (item.workspaceItemFingerprint !== request.workspaceItemFingerprint) {
    throw new Error("ugp_outreach_review_stale_workspace_item");
  }
  if (item.prospectFingerprint !== request.prospectFingerprint) {
    throw new Error("ugp_outreach_review_prospect_mismatch");
  }

  const expectedLatest = item.latestReview?.reviewFingerprint ?? null;
  if (
    nullableFingerprint(
      request.expectedLatestReviewFingerprint,
      "ugp_outreach_review_expected_latest_invalid",
    ) !== expectedLatest
  ) {
    throw new Error("ugp_outreach_review_concurrent_change");
  }
  if (
    item.latestReview?.decision === "approved_for_draft" ||
    item.latestReview?.decision === "rejected"
  ) {
    throw new Error("ugp_outreach_review_decision_terminal");
  }
  if (request.confirmation !== expectedConfirmation(request)) {
    throw new Error("ugp_outreach_review_explicit_confirmation_required");
  }

  const review: AuthorityOutreachReviewInput = Object.freeze({
    qualificationFingerprint: fingerprint(
      request.qualificationFingerprint,
      "ugp_outreach_review_qualification_invalid",
    ),
    prospectFingerprint: fingerprint(
      request.prospectFingerprint,
      "ugp_outreach_review_prospect_invalid",
    ),
    decision: request.decision,
    reasonCode: request.reasonCode,
    reviewerId: reviewerId(input.reviewerId),
    reviewedAt: canonicalTimestamp(input.reviewedAt),
  });

  const nextInput = {
    qualification: input.qualification,
    reviews: [...existingReviews, review],
  };
  const nextWorkspace = buildAuthorityOutreachWorkspace(nextInput);
  assertAuthorityOutreachWorkspaceIntegrity(nextWorkspace, nextInput);
  const nextItem = nextWorkspace.items.find(
    (candidate) => candidate.prospectFingerprint === item.prospectFingerprint,
  );
  if (!nextItem?.latestReview) {
    throw new Error("ugp_outreach_review_materialization_failed");
  }

  if (auditEvents.length !== item.reviewHistory.length) {
    throw new Error("ugp_outreach_review_audit_history_count_mismatch");
  }
  for (let index = 0; index < auditEvents.length; index += 1) {
    if (
      auditEvents[index]!.reviewFingerprint !==
      item.reviewHistory[index]!.reviewFingerprint
    ) {
      throw new Error("ugp_outreach_review_audit_review_mismatch");
    }
  }

  const sequence = auditEvents.length + 1;
  const previousEventFingerprint =
    auditEvents.at(-1)?.eventFingerprint ?? null;
  const requestFingerprint = hash({
    purpose: "ugp_authority_outreach_review_request",
    version: UGP_AUTHORITY_OUTREACH_REVIEW_PERSISTENCE_CONTRACT_VERSION,
    workspaceFingerprint: request.workspaceFingerprint,
    workspaceItemId: request.workspaceItemId,
    workspaceItemFingerprint: request.workspaceItemFingerprint,
    qualificationFingerprint: request.qualificationFingerprint,
    prospectFingerprint: request.prospectFingerprint,
    expectedLatestReviewFingerprint: request.expectedLatestReviewFingerprint,
    decision: request.decision,
    reasonCode: request.reasonCode,
    reviewerId: review.reviewerId,
  });
  const eventBase = Object.freeze({
    version: UGP_AUTHORITY_OUTREACH_REVIEW_PERSISTENCE_CONTRACT_VERSION,
    sequence,
    previousEventFingerprint,
    workspaceVersion: workspace.version,
    workspaceFingerprint: workspace.workspaceFingerprint,
    workspaceItemId: exactId(
      item.workspaceItemId,
      "ugp_outreach_review_workspace_item_id_invalid",
    ),
    workspaceItemFingerprint: fingerprint(
      item.workspaceItemFingerprint,
      "ugp_outreach_review_workspace_item_invalid",
    ),
    qualificationFingerprint: workspace.qualificationFingerprint,
    prospectFingerprint: item.prospectFingerprint,
    opportunityFingerprint: item.opportunityFingerprint,
    targetDomain: workspace.targetDomain,
    sourceDomain: item.sourceDomain,
    targetUrl: item.targetUrl,
    qualificationStatus: item.qualificationStatus,
    decision: request.decision,
    reasonCode: request.reasonCode,
    reviewerId: review.reviewerId,
    reviewedAt: review.reviewedAt,
    reviewFingerprint: nextItem.latestReview.reviewFingerprint,
    requestFingerprint,
    semantics: EVENT_SEMANTICS,
  });
  const eventFingerprint = hash(eventFingerprintPayload(eventBase));
  const auditEvent: AuthorityOutreachReviewAuditEvent = Object.freeze({
    ...eventBase,
    eventId: "uaoe-" + eventFingerprint.slice(0, 24),
    eventFingerprint,
  });
  assertEventIntegrity(auditEvent, sequence, previousEventFingerprint);

  return Object.freeze({
    review,
    auditEvent,
    nextWorkspaceFingerprint: nextWorkspace.workspaceFingerprint,
    nextWorkspaceItemFingerprint: nextItem.workspaceItemFingerprint,
    resultingState: nextItem.state,
    semantics: PREPARATION_SEMANTICS,
  });
}
