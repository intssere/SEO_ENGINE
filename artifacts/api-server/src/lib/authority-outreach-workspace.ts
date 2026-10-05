import { createHash } from "node:crypto";
import {
  UGP_AUTHORITY_PROSPECT_QUALIFICATION_VERSION,
  type AuthorityProspectQualification,
  type AuthorityProspectQualificationResult,
} from "./authority-prospect-qualification.js";

export const UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION =
  "ugp-10-1-outreach-review-workspace-v1" as const;

export type AuthorityOutreachReviewDecision =
  | "approved_for_draft"
  | "rejected"
  | "deferred";

export type AuthorityOutreachReviewReason =
  | "editorial_fit_confirmed"
  | "needs_more_context"
  | "relationship_conflict"
  | "target_not_appropriate"
  | "timing_not_right"
  | "policy_or_reputation_risk";

export type AuthorityOutreachReviewInput = Readonly<{
  qualificationFingerprint: string;
  prospectFingerprint: string;
  decision: AuthorityOutreachReviewDecision;
  reasonCode: AuthorityOutreachReviewReason;
  reviewerId: string;
  reviewedAt: string;
}>;

export type AuthorityOutreachReviewRecord = AuthorityOutreachReviewInput & Readonly<{
  reviewId: string;
  reviewFingerprint: string;
}>;

export type AuthorityOutreachWorkspaceState =
  | "awaiting_human_review"
  | "qualification_review_required"
  | "insufficient_evidence"
  | "blocked"
  | "approved_for_draft"
  | "rejected"
  | "deferred";

export type AuthorityOutreachWorkspaceItem = Readonly<{
  workspaceItemId: string;
  workspaceItemFingerprint: string;
  qualificationFingerprint: string;
  prospectId: string;
  prospectFingerprint: string;
  opportunityId: string;
  opportunityFingerprint: string;
  kind: AuthorityProspectQualification["kind"];
  sourceDomain: string;
  sourceUrl: string | null;
  targetUrl: string | null;
  qualificationStatus: AuthorityProspectQualification["status"];
  qualificationScore: number;
  evidenceCoverage: number;
  riskClass: AuthorityProspectQualification["riskClass"];
  evidenceFingerprints: readonly string[];
  state: AuthorityOutreachWorkspaceState;
  latestReview: AuthorityOutreachReviewRecord | null;
  reviewHistory: readonly AuthorityOutreachReviewRecord[];
}>;

export type AuthorityOutreachWorkspace = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION;
  targetDomain: string;
  qualificationFingerprint: string;
  items: readonly AuthorityOutreachWorkspaceItem[];
  summary: Readonly<{
    total: number;
    awaitingHumanReview: number;
    qualificationReviewRequired: number;
    insufficientEvidence: number;
    blocked: number;
    approvedForDraft: number;
    rejected: number;
    deferred: number;
  }>;
  semantics: Readonly<{
    deterministic: true;
    evidenceBound: true;
    humanReviewRequired: true;
    approvalForDraftOnly: true;
    contactDiscoveryPerformed: false;
    outreachDraftingPerformed: false;
    outreachSendingPerformed: false;
    outreachSendingAuthorized: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    schedulerEnabled: false;
    automaticTransition: false;
    providerWrites: false;
    publicSiteWrites: false;
    linkSchemeAutomationAuthorized: false;
  }>;
  workspaceFingerprint: string;
}>;

const HEX64 = /^[0-9a-f]{64}$/;
const REVIEWER = /^[A-Za-z0-9_.:@-]{1,120}$/;
const DECISIONS = new Set<AuthorityOutreachReviewDecision>([
  "approved_for_draft",
  "rejected",
  "deferred",
]);
const REASONS = new Set<AuthorityOutreachReviewReason>([
  "editorial_fit_confirmed",
  "needs_more_context",
  "relationship_conflict",
  "target_not_appropriate",
  "timing_not_right",
  "policy_or_reputation_risk",
]);

const SEMANTICS = Object.freeze({
  deterministic: true as const,
  evidenceBound: true as const,
  humanReviewRequired: true as const,
  approvalForDraftOnly: true as const,
  contactDiscoveryPerformed: false as const,
  outreachDraftingPerformed: false as const,
  outreachSendingPerformed: false as const,
  outreachSendingAuthorized: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  schedulerEnabled: false as const,
  automaticTransition: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
  linkSchemeAutomationAuthorized: false as const,
});

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort().map(
    (key) => JSON.stringify(key) + ":" + stableJson(object[key]),
  ).join(",") + "}";
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function fingerprint(value: string, name: string): string {
  if (!HEX64.test(value)) throw new Error("ugp_outreach_invalid_" + name);
  return value;
}

function reviewer(value: string): string {
  if (!REVIEWER.test(value)) throw new Error("ugp_outreach_invalid_reviewer_id");
  return value;
}

function timestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error("ugp_outreach_invalid_reviewed_at");
  }
  return value;
}

function assertQualificationBoundary(
  qualification: AuthorityProspectQualificationResult,
): void {
  if (
    !qualification ||
    qualification.version !== UGP_AUTHORITY_PROSPECT_QUALIFICATION_VERSION
  ) {
    throw new Error("ugp_outreach_invalid_qualification_version");
  }
  fingerprint(qualification.qualificationFingerprint, "qualification_fingerprint");
  const semantics = qualification.semantics;
  if (
    semantics.evidenceBound !== true ||
    semantics.syntheticFallback !== false ||
    semantics.contactDiscoveryPerformed !== false ||
    semantics.outreachAuthorized !== false ||
    semantics.liveAcquisitionAuthorized !== false ||
    semantics.performsNetworkOperation !== false ||
    semantics.performsPersistence !== false ||
    semantics.schedulerEnabled !== false ||
    semantics.providerWrites !== false ||
    semantics.publicSiteWrites !== false ||
    semantics.linkSchemeAutomationAuthorized !== false
  ) {
    throw new Error("ugp_outreach_unsafe_qualification_semantics");
  }
}

function materializeReview(
  input: AuthorityOutreachReviewInput,
  prospect: AuthorityProspectQualification,
  qualificationFingerprint: string,
): AuthorityOutreachReviewRecord {
  if (!DECISIONS.has(input.decision)) {
    throw new Error("ugp_outreach_invalid_review_decision");
  }
  if (!REASONS.has(input.reasonCode)) {
    throw new Error("ugp_outreach_invalid_review_reason");
  }
  if (input.qualificationFingerprint !== qualificationFingerprint) {
    throw new Error("ugp_outreach_stale_qualification_review");
  }
  if (input.prospectFingerprint !== prospect.prospectFingerprint) {
    throw new Error("ugp_outreach_review_prospect_mismatch");
  }
  if (
    input.decision === "approved_for_draft" &&
    prospect.status !== "qualified_for_review"
  ) {
    throw new Error("ugp_outreach_draft_approval_requires_qualified_prospect");
  }
  if (
    input.decision === "approved_for_draft" &&
    input.reasonCode !== "editorial_fit_confirmed"
  ) {
    throw new Error("ugp_outreach_draft_approval_requires_editorial_fit");
  }
  const base = Object.freeze({
    qualificationFingerprint: fingerprint(
      input.qualificationFingerprint,
      "review_qualification_fingerprint",
    ),
    prospectFingerprint: fingerprint(
      input.prospectFingerprint,
      "review_prospect_fingerprint",
    ),
    decision: input.decision,
    reasonCode: input.reasonCode,
    reviewerId: reviewer(input.reviewerId),
    reviewedAt: timestamp(input.reviewedAt),
  });
  const reviewFingerprint = hash({
    purpose: "ugp_authority_outreach_review",
    version: UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION,
    ...base,
  });
  return Object.freeze({
    ...base,
    reviewId: "uaor-" + reviewFingerprint.slice(0, 24),
    reviewFingerprint,
  });
}

function initialState(
  prospect: AuthorityProspectQualification,
): AuthorityOutreachWorkspaceState {
  if (prospect.status === "qualified_for_review") return "awaiting_human_review";
  if (prospect.status === "needs_review") return "qualification_review_required";
  if (prospect.status === "insufficient_evidence") return "insufficient_evidence";
  return "blocked";
}

function reviewedState(
  latest: AuthorityOutreachReviewRecord | null,
  prospect: AuthorityProspectQualification,
): AuthorityOutreachWorkspaceState {
  if (!latest) return initialState(prospect);
  if (latest.decision === "approved_for_draft") return "approved_for_draft";
  if (latest.decision === "rejected") return "rejected";
  return "deferred";
}

export function buildAuthorityOutreachWorkspace(input: Readonly<{
  qualification: AuthorityProspectQualificationResult;
  reviews?: readonly AuthorityOutreachReviewInput[];
}>): AuthorityOutreachWorkspace {
  assertQualificationBoundary(input.qualification);

  const qualificationFingerprint = input.qualification.qualificationFingerprint;
  const prospects = new Map(
    input.qualification.prospects.map((prospect) => {
      fingerprint(prospect.prospectFingerprint, "prospect_fingerprint");
      return [prospect.prospectFingerprint, prospect] as const;
    }),
  );
  if (prospects.size !== input.qualification.prospects.length) {
    throw new Error("ugp_outreach_duplicate_prospect_fingerprint");
  }

  const histories = new Map<string, AuthorityOutreachReviewRecord[]>();
  for (const raw of input.reviews ?? []) {
    const prospect = prospects.get(raw.prospectFingerprint);
    if (!prospect) throw new Error("ugp_outreach_unknown_review_prospect");
    if (
      prospect.status === "disqualified" ||
      prospect.status === "insufficient_evidence"
    ) {
      throw new Error("ugp_outreach_review_requires_reviewable_prospect");
    }
    const record = materializeReview(raw, prospect, qualificationFingerprint);
    const history = histories.get(prospect.prospectFingerprint) ?? [];
    if (history.some((existing) => existing.reviewFingerprint === record.reviewFingerprint)) {
      throw new Error("ugp_outreach_duplicate_review");
    }
    history.push(record);
    histories.set(prospect.prospectFingerprint, history);
  }

  const items = Object.freeze(
    input.qualification.prospects.map((prospect) => {
      const reviewHistory = Object.freeze(
        [...(histories.get(prospect.prospectFingerprint) ?? [])].sort(
          (a, b) =>
            a.reviewedAt.localeCompare(b.reviewedAt) ||
            a.reviewFingerprint.localeCompare(b.reviewFingerprint),
        ),
      );
      const latestReview = reviewHistory.at(-1) ?? null;
      const base = {
        qualificationFingerprint,
        prospectId: prospect.prospectId,
        prospectFingerprint: prospect.prospectFingerprint,
        opportunityId: prospect.opportunityId,
        opportunityFingerprint: prospect.opportunityFingerprint,
        kind: prospect.kind,
        sourceDomain: prospect.sourceDomain,
        sourceUrl: prospect.sourceUrl,
        targetUrl: prospect.targetUrl,
        qualificationStatus: prospect.status,
        qualificationScore: prospect.score,
        evidenceCoverage: prospect.evidenceCoverage,
        riskClass: prospect.riskClass,
        evidenceFingerprints: Object.freeze([...prospect.evidenceFingerprints]),
        state: reviewedState(latestReview, prospect),
        latestReview,
        reviewHistory,
      };
      const workspaceItemFingerprint = hash({
        purpose: "ugp_authority_outreach_workspace_item",
        version: UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION,
        ...base,
      });
      return Object.freeze({
        ...base,
        workspaceItemId: "uaow-" + workspaceItemFingerprint.slice(0, 24),
        workspaceItemFingerprint,
      });
    }).sort(
      (a, b) =>
        b.qualificationScore - a.qualificationScore ||
        b.evidenceCoverage - a.evidenceCoverage ||
        a.prospectFingerprint.localeCompare(b.prospectFingerprint),
    ),
  );

  const summary = Object.freeze({
    total: items.length,
    awaitingHumanReview: items.filter((item) => item.state === "awaiting_human_review").length,
    qualificationReviewRequired: items.filter(
      (item) => item.state === "qualification_review_required",
    ).length,
    insufficientEvidence: items.filter((item) => item.state === "insufficient_evidence").length,
    blocked: items.filter((item) => item.state === "blocked").length,
    approvedForDraft: items.filter((item) => item.state === "approved_for_draft").length,
    rejected: items.filter((item) => item.state === "rejected").length,
    deferred: items.filter((item) => item.state === "deferred").length,
  });

  const base = {
    version: UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION,
    targetDomain: input.qualification.targetDomain,
    qualificationFingerprint,
    items,
    summary,
    semantics: SEMANTICS,
  };
  return Object.freeze({
    ...base,
    workspaceFingerprint: hash({
      purpose: "ugp_authority_outreach_workspace",
      ...base,
    }),
  });
}

export function assertAuthorityOutreachWorkspaceIntegrity(
  workspace: AuthorityOutreachWorkspace,
  input: Readonly<{
    qualification: AuthorityProspectQualificationResult;
    reviews?: readonly AuthorityOutreachReviewInput[];
  }>,
): void {
  if (
    !workspace ||
    workspace.version !== UGP_AUTHORITY_OUTREACH_WORKSPACE_VERSION
  ) {
    throw new Error("ugp_outreach_workspace_version_invalid");
  }
  const semantics = workspace.semantics;
  if (
    semantics.deterministic !== true ||
    semantics.evidenceBound !== true ||
    semantics.humanReviewRequired !== true ||
    semantics.approvalForDraftOnly !== true ||
    semantics.contactDiscoveryPerformed !== false ||
    semantics.outreachDraftingPerformed !== false ||
    semantics.outreachSendingPerformed !== false ||
    semantics.outreachSendingAuthorized !== false ||
    semantics.performsNetworkOperation !== false ||
    semantics.performsPersistence !== false ||
    semantics.schedulerEnabled !== false ||
    semantics.automaticTransition !== false ||
    semantics.providerWrites !== false ||
    semantics.publicSiteWrites !== false ||
    semantics.linkSchemeAutomationAuthorized !== false
  ) {
    throw new Error("ugp_outreach_workspace_unsafe_semantics");
  }
  const expected = buildAuthorityOutreachWorkspace(input);
  if (stableJson(workspace) !== stableJson(expected)) {
    throw new Error("ugp_outreach_workspace_integrity_mismatch");
  }
}
