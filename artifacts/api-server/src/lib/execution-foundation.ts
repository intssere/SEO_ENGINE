import { createHash } from "node:crypto";

export const executableFields = ["meta_description", "title"] as const;
export type ExecutableField = typeof executableFields[number];

export type ExecutionAuthorizationInput = {
  planId: string;
  pageId: string;
  pageUrl: string;
  actionType: string;
  field: string;
  beforeValue: string | null;
  afterValue: string | null;
  currentValue: string | null;
  supportingEvidenceIds: string[];
  persistedEvidenceCount: number;
  proposalFingerprint: string;
  lifecycle: string;
  approvalDecision: string | null;
  approvedAt: string | null;
  qualityEligible: boolean;
  riskClassification: string;
  priorActionCount: number;
  publicSiteWritesEnabled: boolean;
  now: string;
  ttlMinutes?: number;
};

export type AuthorizationEnvelope = {
  version: "controlled_execution_foundation_v1";
  planId: string;
  target: {
    pageId: string;
    url: string;
    field: ExecutableField;
  };
  actionType: string;
  expectedCurrentState: {
    value: string | null;
    fingerprint: string;
  };
  proposedState: {
    value: string;
    fingerprint: string;
  };
  evidence: {
    ids: string[];
    proposalFingerprint: string;
  };
  risk: {
    classification: string;
    boundedPilot: true;
  };
  rollback: {
    value: string | null;
    fingerprint: string;
  };
  authorization: {
    issuedAt: string;
    expiresAt: string;
    executionAuthorized: true;
    providerWriteAllowed: false;
    publicSiteWrites: false;
    automaticTransition: false;
  };
  verification: {
    status: "pending";
    mode: "independent_read_after_write";
    expectedField: ExecutableField;
    expectedValue: string;
    expectedFingerprint: string;
    failureDisposition: "rollback_eligible";
  };
  envelopeFingerprint: string;
};

export type ExecutionAuthorizationResult =
  | { ok: true; envelope: AuthorizationEnvelope }
  | { ok: false; reason: string };

const normalized = (value: string | null | undefined) => value == null ? null : value.replace(/\s+/g, " ").trim();
const hash = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const stateFingerprint = (field: string, value: string | null) => hash({ field, value: normalized(value) });

export function evaluateExecutionAuthorization(input: ExecutionAuthorizationInput): ExecutionAuthorizationResult {
  const now = new Date(input.now);
  if (Number.isNaN(now.getTime())) return { ok: false, reason: "invalid_authorization_time" };
  if (input.publicSiteWritesEnabled) return { ok: false, reason: "task51_requires_public_writes_disabled" };
  if (input.lifecycle !== "approved_proposal" || input.approvalDecision !== "approved") return { ok: false, reason: "proposal_not_explicitly_approved" };
  if (!input.qualityEligible) return { ok: false, reason: "proposal_quality_not_eligible" };
  if (!executableFields.includes(input.field as ExecutableField)) return { ok: false, reason: "field_not_bounded_for_execution" };
  if (!input.pageId || !input.pageUrl || !input.actionType || !input.proposalFingerprint) return { ok: false, reason: "authorization_identity_incomplete" };
  const afterValue = normalized(input.afterValue);
  if (!afterValue) return { ok: false, reason: "proposed_value_missing" };
  if (normalized(input.currentValue) !== normalized(input.beforeValue)) return { ok: false, reason: "source_state_changed" };
  const evidenceIds = [...new Set(input.supportingEvidenceIds.filter(Boolean))].sort();
  if (evidenceIds.length < 2 || input.persistedEvidenceCount !== evidenceIds.length) return { ok: false, reason: "supporting_evidence_incomplete" };
  if (["blocked", "high", "critical"].includes(input.riskClassification.toLowerCase())) return { ok: false, reason: "risk_requires_human_block" };
  if (input.priorActionCount > 0) return { ok: false, reason: "executable_action_already_exists" };
  if (!input.approvedAt) return { ok: false, reason: "approval_timestamp_missing" };
  const approvedAt = new Date(input.approvedAt);
  if (Number.isNaN(approvedAt.getTime()) || approvedAt.getTime() > now.getTime()) return { ok: false, reason: "approval_timestamp_invalid" };
  const ttlMinutes = Math.max(1, Math.min(input.ttlMinutes ?? 15, 60));
  const expiresAt = new Date(approvedAt.getTime() + ttlMinutes * 60_000);
  if (now.getTime() >= expiresAt.getTime()) return { ok: false, reason: "authorization_window_expired" };

  const currentValue = normalized(input.currentValue);
  const proposedFingerprint = stateFingerprint(input.field, afterValue);
  const rollbackFingerprint = stateFingerprint(input.field, currentValue);
  const issuedAt = now.toISOString();
  const envelopeBase = {
    version: "controlled_execution_foundation_v1" as const,
    planId: input.planId,
    target: { pageId: input.pageId, url: input.pageUrl, field: input.field as ExecutableField },
    actionType: input.actionType,
    expectedCurrentState: { value: currentValue, fingerprint: rollbackFingerprint },
    proposedState: { value: afterValue, fingerprint: proposedFingerprint },
    evidence: { ids: evidenceIds, proposalFingerprint: input.proposalFingerprint },
    risk: { classification: input.riskClassification, boundedPilot: true as const },
    rollback: { value: currentValue, fingerprint: rollbackFingerprint },
    authorization: {
      issuedAt,
      expiresAt: expiresAt.toISOString(),
      executionAuthorized: true as const,
      providerWriteAllowed: false as const,
      publicSiteWrites: false as const,
      automaticTransition: false as const,
    },
    verification: {
      status: "pending" as const,
      mode: "independent_read_after_write" as const,
      expectedField: input.field as ExecutableField,
      expectedValue: afterValue,
      expectedFingerprint: proposedFingerprint,
      failureDisposition: "rollback_eligible" as const,
    },
  };
  return { ok: true, envelope: { ...envelopeBase, envelopeFingerprint: hash(envelopeBase) } };
}

export function executionStateFingerprint(field: string, value: string | null) {
  return stateFingerprint(field, value);
}
