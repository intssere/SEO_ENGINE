import { createHash } from "node:crypto";

export const P8_8_W01_POLICY_VERSION =
  "p8-8-w01-policy-grant-evaluation-v1" as const;

export const P8_8_INITIAL_POLICY_CLASS =
  "shopify.product.seo.meta_description" as const;

export type P88PolicyStage = "shadow" | "single_action_canary";

export type P88MutationControlMode =
  | "running"
  | "paused"
  | "draining"
  | "drained"
  | "killed";

export type P88EffectiveRisk =
  | "unknown"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "blocked";

export type P88PolicyGrantInput = {
  policyId: string;
  policyVersion: string;
  siteId: string;
  allowedDomain: string;
  provider: string;
  credentialProfileId: string;
  requiredProviderScope: string;
  allowedResourceKind: string;
  allowedActionType: string;
  allowedField: string;
  allowedProposalGenerationMethod: string;
  maximumEffectiveRisk: P88EffectiveRisk;
  minimumEvidenceRefs: number;
  minimumQualityScore: number;
  concurrencyLimit: number;
  mutationQuota: {
    maxActions: number;
    windowHours: number;
  };
  sameTargetCooldownHours: number;
  activationTime: string;
  expiryTime: string;
  revoked: boolean;
  revokedAt: string | null;
  activationActorId: string;
  policyStage: P88PolicyStage;
  controlBindingId: string;
};

export type P88PolicyGrant = Readonly<{
  version: typeof P8_8_W01_POLICY_VERSION;
  policyClass: typeof P8_8_INITIAL_POLICY_CLASS;
  policyId: string;
  policyVersion: string;
  siteId: string;
  allowedDomain: "diamondshelf.us";
  provider: "shopify";
  credentialProfileId: string;
  requiredProviderScope: "write_products";
  allowedResourceKind: "product";
  allowedActionType: "update_meta_description";
  allowedField: "meta_description";
  allowedProposalGenerationMethod: "p9.7_deterministic_preview";
  maximumEffectiveRisk: "low";
  minimumEvidenceRefs: number;
  minimumQualityScore: number;
  concurrencyLimit: 1;
  mutationQuota: Readonly<{
    maxActions: 1;
    windowHours: 24;
  }>;
  sameTargetCooldownHours: number;
  activationTime: string;
  expiryTime: string;
  revoked: boolean;
  revokedAt: string | null;
  activationActorId: string;
  policyStage: P88PolicyStage;
  controlBindingId: string;
  policyFingerprint: string;
  safety: ReturnType<typeof p88W01PolicyCapability>;
}>;

export type P88PolicyCandidate = {
  recommendation: {
    recommendationClass: string;
    recommendationFingerprint: string;
    recommendationIdempotencyKey: string;
    lineageMaterialized: boolean;
    changedPreviewPresent: boolean;
    deterministic: boolean;
    aiAssisted: boolean;
    humanEditedAfterCertification: boolean;
    lifecycleEligible: boolean;
    proposalGenerationMethod: string;
  };
  proposal: {
    proposalFingerprint: string;
    boundedPilot: boolean;
    wholeSiteCoverage: boolean;
  };
  evidence: {
    ids: string[];
    missingEvidence: string[];
  };
  quality: {
    status: string;
    approvalEligible: boolean;
    score: number;
    blockingReasons: string[];
    warnings: string[];
  };
  risk: {
    classification: P88EffectiveRisk;
  };
  target: {
    provider: string;
    domain: string;
    resourceKind: string;
    resourceGid: string;
    targetUrl: string;
    actionType: string;
    field: string;
    requiredProviderScope: string;
    beforeFingerprint: string;
    afterFingerprint: string;
  };
  currentState: {
    providerObservedBeforeFingerprint: string;
    priorDeploymentCount: number;
    otherActiveSiteMutationCount: number;
    sameTargetCooldownSatisfied: boolean;
    mutationQuotaRemaining: number;
    unresolvedManualIntervention: boolean;
    unresolvedUncertainProviderWrite: boolean;
    unresolvedRollbackFailure: boolean;
    mutationControlMode: P88MutationControlMode;
    mutationControlFingerprint: string;
  };
};

export type P88PolicyEvaluationInput = {
  grant: P88PolicyGrant;
  referenceTime: string;
  evaluationExpiresAt: string;
  candidate: P88PolicyCandidate;
};

export type P88PolicyRejectionReason =
  | "policy_not_active_yet"
  | "policy_expired"
  | "policy_revoked"
  | "evaluation_expiry_invalid"
  | "control_not_running"
  | "manual_intervention_unresolved"
  | "provider_write_uncertain"
  | "rollback_failure_unresolved"
  | "recommendation_class_not_proposal_review"
  | "recommendation_lineage_not_materialized"
  | "changed_preview_missing"
  | "proposal_not_deterministic"
  | "ai_assisted_candidate_blocked"
  | "proposal_edited_after_certification"
  | "proposal_lifecycle_ineligible"
  | "proposal_generation_method_not_allowed"
  | "bounded_pilot_required"
  | "whole_site_coverage_forbidden"
  | "evidence_insufficient"
  | "missing_evidence_present"
  | "quality_status_not_pass"
  | "quality_not_approval_eligible"
  | "quality_score_below_threshold"
  | "quality_blockers_present"
  | "quality_warnings_present"
  | "risk_not_low"
  | "provider_not_allowed"
  | "domain_not_allowed"
  | "resource_kind_not_allowed"
  | "resource_gid_invalid"
  | "target_url_not_allowed"
  | "action_type_not_allowed"
  | "field_not_allowed"
  | "provider_scope_not_allowed"
  | "provider_before_state_mismatch"
  | "prior_deployment_exists"
  | "site_mutation_concurrency_exhausted"
  | "same_target_cooldown_not_satisfied"
  | "mutation_quota_exhausted";

export type P88PolicyEvaluation = Readonly<{
  version: typeof P8_8_W01_POLICY_VERSION;
  policyClass: typeof P8_8_INITIAL_POLICY_CLASS;
  decision: "admit" | "reject";
  rejectionReasons: readonly P88PolicyRejectionReason[];
  referenceTime: string;
  evaluationExpiresAt: string;
  policy: Readonly<{
    policyId: string;
    policyVersion: string;
    policyFingerprint: string;
    policyStage: P88PolicyStage;
  }>;
  recommendation: Readonly<{
    recommendationFingerprint: string;
    recommendationIdempotencyKey: string;
  }>;
  proposal: Readonly<{
    proposalFingerprint: string;
    boundedPilot: boolean;
    wholeSiteCoverage: boolean;
  }>;
  evidence: Readonly<{
    ids: readonly string[];
    evidenceSetFingerprint: string;
    missingEvidence: readonly string[];
  }>;
  quality: Readonly<{
    status: string;
    approvalEligible: boolean;
    score: number;
    blockingReasons: readonly string[];
    warnings: readonly string[];
    qualityFingerprint: string;
  }>;
  risk: Readonly<{
    classification: P88EffectiveRisk;
    riskFingerprint: string;
  }>;
  target: Readonly<{
    provider: string;
    domain: string;
    resourceKind: string;
    resourceGid: string;
    targetUrl: string;
    actionType: string;
    field: string;
    requiredProviderScope: string;
    beforeFingerprint: string;
    afterFingerprint: string;
    targetFingerprint: string;
  }>;
  currentState: Readonly<{
    providerObservedBeforeFingerprint: string;
    priorDeploymentCount: number;
    otherActiveSiteMutationCount: number;
    sameTargetCooldownSatisfied: boolean;
    mutationQuotaRemaining: number;
    unresolvedManualIntervention: boolean;
    unresolvedUncertainProviderWrite: boolean;
    unresolvedRollbackFailure: boolean;
    mutationControlMode: P88MutationControlMode;
    mutationControlFingerprint: string;
    currentStateFingerprint: string;
  }>;
  semantics: ReturnType<typeof p88W01PolicySemantics>;
  safety: ReturnType<typeof p88W01PolicyCapability>;
  evaluationFingerprint: string;
  evaluationId: string;
}>;

const EXACT_KEY = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SHOPIFY_PRODUCT_GID = /^gid:\/\/shopify\/Product\/[1-9][0-9]*$/;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function exactKey(value: unknown, field: string): string {
  if (typeof value !== "string" || value !== value.trim() || !EXACT_KEY.test(value)) {
    throw new Error("p88_w01_invalid_" + field);
  }
  return value;
}

function canonicalTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error("p88_w01_invalid_" + field);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error("p88_w01_invalid_" + field);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error("p88_w01_noncanonical_" + field);
  return canonical;
}

function integer(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error("p88_w01_invalid_" + field);
  }
  return Number(value);
}

function score(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("p88_w01_invalid_" + field);
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw new Error("p88_w01_invalid_" + field);
  }
  return value;
}

function exactStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new Error("p88_w01_invalid_" + field);
  const normalized = value.map((item) => exactKey(item, field + "_item"));
  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}

function exactDomain(value: unknown): "diamondshelf.us" {
  if (value !== "diamondshelf.us") {
    throw new Error("p88_w01_unsupported_policy_domain");
  }
  return "diamondshelf.us";
}

function exactInitialPolicyScope(input: P88PolicyGrantInput) {
  if (input.provider !== "shopify") throw new Error("p88_w01_unsupported_policy_provider");
  if (input.requiredProviderScope !== "write_products") {
    throw new Error("p88_w01_unsupported_policy_provider_scope");
  }
  if (input.allowedResourceKind !== "product") {
    throw new Error("p88_w01_unsupported_policy_resource_kind");
  }
  if (input.allowedActionType !== "update_meta_description") {
    throw new Error("p88_w01_unsupported_policy_action_type");
  }
  if (input.allowedField !== "meta_description") {
    throw new Error("p88_w01_unsupported_policy_field");
  }
  if (input.allowedProposalGenerationMethod !== "p9.7_deterministic_preview") {
    throw new Error("p88_w01_unsupported_policy_generation_method");
  }
  if (input.maximumEffectiveRisk !== "low") {
    throw new Error("p88_w01_unsupported_policy_maximum_risk");
  }
}

function grantFingerprintPayload(
  grant: Omit<P88PolicyGrant, "policyFingerprint" | "safety">,
): unknown {
  return grant;
}

export function p88W01PolicyCapability() {
  return deepFreeze({
    version: P8_8_W01_POLICY_VERSION,
    pureDeterministicEvaluationOnly: true,
    immutableGrantContractOnly: true,
    callerSuppliedEvidenceOnly: true,
    databaseReadPerformed: false,
    databaseWritePerformed: false,
    persistencePerformed: false,
    schemaMutationPerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    approvalRowCreated: false,
    executionAuthorizationCreated: false,
    policyActivationPerformed: false,
    schedulerActivated: false,
    workerActivated: false,
    autonomousExecutionAuthorized: false,
    liveExecutionAuthorized: false,
    publicWriteGateEnabledByGrant: false,
    credentialScopeChanged: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}

export function p88W01PolicySemantics() {
  return deepFreeze({
    decisionMeansPolicyAdmissionOnly: true,
    admissionIsNotExecutionAuthorization: true,
    policyProvenanceDistinctFromHumanApproval: true,
    initialClassIsProductMetaDescriptionOnly: true,
    exactTargetBindingRequired: true,
    staleBeforeStateFailsClosed: true,
    insufficientEvidenceFailsClosed: true,
    nonLowRiskFailsClosed: true,
    controlBlocksNewAdmissionWhenNotRunning: true,
    quotaCooldownAndConcurrencyFailClosed: true,
    grantDoesNotEnablePublicWriteGate: true,
    providerMutationPerformed: false,
    persistencePerformed: false,
  });
}

export function buildP88PolicyGrant(input: P88PolicyGrantInput): P88PolicyGrant {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w01_invalid_policy_grant_input");
  }

  exactInitialPolicyScope(input);

  const policyId = exactKey(input.policyId, "policy_id");
  const policyVersion = exactKey(input.policyVersion, "policy_version");
  const siteId = exactKey(input.siteId, "site_id");
  const allowedDomain = exactDomain(input.allowedDomain);
  const credentialProfileId = exactKey(
    input.credentialProfileId,
    "credential_profile_id",
  );
  const activationActorId = exactKey(input.activationActorId, "activation_actor_id");
  const controlBindingId = exactKey(input.controlBindingId, "control_binding_id");

  const minimumEvidenceRefs = integer(
    input.minimumEvidenceRefs,
    "minimum_evidence_refs",
    2,
    100,
  );
  const minimumQualityScore = score(
    input.minimumQualityScore,
    "minimum_quality_score",
  );
  if (minimumQualityScore < 90) {
    throw new Error("p88_w01_quality_threshold_below_initial_minimum");
  }

  const concurrencyLimit = integer(input.concurrencyLimit, "concurrency_limit", 1, 1);
  const quotaMaxActions = integer(
    input.mutationQuota?.maxActions,
    "mutation_quota_max_actions",
    1,
    1,
  );
  const quotaWindowHours = integer(
    input.mutationQuota?.windowHours,
    "mutation_quota_window_hours",
    24,
    24,
  );
  const sameTargetCooldownHours = integer(
    input.sameTargetCooldownHours,
    "same_target_cooldown_hours",
    336,
    24 * 365,
  );

  const activationTime = canonicalTimestamp(input.activationTime, "activation_time");
  const expiryTime = canonicalTimestamp(input.expiryTime, "expiry_time");
  if (expiryTime <= activationTime) {
    throw new Error("p88_w01_policy_expiry_not_after_activation");
  }

  let revokedAt: string | null = null;
  if (input.revoked) {
    revokedAt = canonicalTimestamp(input.revokedAt, "revoked_at");
    if (revokedAt < activationTime) {
      throw new Error("p88_w01_revocation_before_activation");
    }
  } else if (input.revokedAt !== null) {
    throw new Error("p88_w01_revoked_at_without_revocation");
  }

  if (input.policyStage !== "shadow" && input.policyStage !== "single_action_canary") {
    throw new Error("p88_w01_unsupported_policy_stage");
  }

  const withoutIdentity: Omit<P88PolicyGrant, "policyFingerprint" | "safety"> = {
    version: P8_8_W01_POLICY_VERSION,
    policyClass: P8_8_INITIAL_POLICY_CLASS,
    policyId,
    policyVersion,
    siteId,
    allowedDomain,
    provider: "shopify",
    credentialProfileId,
    requiredProviderScope: "write_products",
    allowedResourceKind: "product",
    allowedActionType: "update_meta_description",
    allowedField: "meta_description",
    allowedProposalGenerationMethod: "p9.7_deterministic_preview",
    maximumEffectiveRisk: "low",
    minimumEvidenceRefs,
    minimumQualityScore,
    concurrencyLimit: concurrencyLimit as 1,
    mutationQuota: {
      maxActions: quotaMaxActions as 1,
      windowHours: quotaWindowHours as 24,
    },
    sameTargetCooldownHours,
    activationTime,
    expiryTime,
    revoked: input.revoked,
    revokedAt,
    activationActorId,
    policyStage: input.policyStage,
    controlBindingId,
  };

  const policyFingerprint = stableHash(grantFingerprintPayload(withoutIdentity));

  return deepFreeze({
    ...withoutIdentity,
    policyFingerprint,
    safety: p88W01PolicyCapability(),
  });
}

export function p88PolicyGrantIntegrityIssues(grant: P88PolicyGrant): string[] {
  const issues: string[] = [];

  try {
    const rebuilt = buildP88PolicyGrant({
      policyId: grant.policyId,
      policyVersion: grant.policyVersion,
      siteId: grant.siteId,
      allowedDomain: grant.allowedDomain,
      provider: grant.provider,
      credentialProfileId: grant.credentialProfileId,
      requiredProviderScope: grant.requiredProviderScope,
      allowedResourceKind: grant.allowedResourceKind,
      allowedActionType: grant.allowedActionType,
      allowedField: grant.allowedField,
      allowedProposalGenerationMethod: grant.allowedProposalGenerationMethod,
      maximumEffectiveRisk: grant.maximumEffectiveRisk,
      minimumEvidenceRefs: grant.minimumEvidenceRefs,
      minimumQualityScore: grant.minimumQualityScore,
      concurrencyLimit: grant.concurrencyLimit,
      mutationQuota: {
        maxActions: grant.mutationQuota.maxActions,
        windowHours: grant.mutationQuota.windowHours,
      },
      sameTargetCooldownHours: grant.sameTargetCooldownHours,
      activationTime: grant.activationTime,
      expiryTime: grant.expiryTime,
      revoked: grant.revoked,
      revokedAt: grant.revokedAt,
      activationActorId: grant.activationActorId,
      policyStage: grant.policyStage,
      controlBindingId: grant.controlBindingId,
    });

    if (rebuilt.policyFingerprint !== grant.policyFingerprint) {
      issues.push("p88_w01_policy_fingerprint_mismatch");
    }
    if (stableJson(rebuilt.safety) !== stableJson(grant.safety)) {
      issues.push("p88_w01_policy_safety_marker_mismatch");
    }
    if (grant.version !== P8_8_W01_POLICY_VERSION) {
      issues.push("p88_w01_policy_version_mismatch");
    }
    if (grant.policyClass !== P8_8_INITIAL_POLICY_CLASS) {
      issues.push("p88_w01_policy_class_mismatch");
    }
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "p88_w01_policy_integrity_invalid");
  }

  return [...new Set(issues)].sort((left, right) => left.localeCompare(right));
}

export function assertP88PolicyGrantIntegrity(grant: P88PolicyGrant): void {
  const issues = p88PolicyGrantIntegrityIssues(grant);
  if (issues.length > 0) {
    throw new Error("p88_w01_policy_grant_integrity_failure:" + issues.join(","));
  }
}

function canonicalEvaluationTimes(
  grant: P88PolicyGrant,
  referenceTimeValue: string,
  evaluationExpiresAtValue: string,
) {
  const referenceTime = canonicalTimestamp(referenceTimeValue, "reference_time");
  const evaluationExpiresAt = canonicalTimestamp(
    evaluationExpiresAtValue,
    "evaluation_expires_at",
  );
  return {
    referenceTime,
    evaluationExpiresAt,
    expiryInvalid:
      evaluationExpiresAt <= referenceTime || evaluationExpiresAt > grant.expiryTime,
  };
}

function isAllowedProductUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.hostname !== "diamondshelf.us") return false;
    if (url.port || url.username || url.password || url.search || url.hash) return false;
    if (!url.pathname.startsWith("/products/")) return false;
    const slug = url.pathname.slice("/products/".length);
    if (!slug || slug.includes("/")) return false;
    return url.toString() === value;
  } catch {
    return false;
  }
}

function addReason(
  reasons: Set<P88PolicyRejectionReason>,
  condition: boolean,
  reason: P88PolicyRejectionReason,
) {
  if (condition) reasons.add(reason);
}

function evaluationFingerprintPayload(
  evaluation: Omit<P88PolicyEvaluation, "evaluationFingerprint" | "evaluationId">,
): unknown {
  return evaluation;
}

export function evaluateP88PolicyAdmission(
  input: P88PolicyEvaluationInput,
): P88PolicyEvaluation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w01_invalid_policy_evaluation_input");
  }

  assertP88PolicyGrantIntegrity(input.grant);

  const { referenceTime, evaluationExpiresAt, expiryInvalid } =
    canonicalEvaluationTimes(
      input.grant,
      input.referenceTime,
      input.evaluationExpiresAt,
    );

  const candidate = input.candidate;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("p88_w01_invalid_policy_candidate");
  }

  const recommendationFingerprint = exactFingerprint(
    candidate.recommendation.recommendationFingerprint,
    "recommendation_fingerprint",
  );
  const recommendationIdempotencyKey = exactKey(
    candidate.recommendation.recommendationIdempotencyKey,
    "recommendation_idempotency_key",
  );
  const proposalFingerprint = exactFingerprint(
    candidate.proposal.proposalFingerprint,
    "proposal_fingerprint",
  );
  const beforeFingerprint = exactFingerprint(
    candidate.target.beforeFingerprint,
    "before_fingerprint",
  );
  const afterFingerprint = exactFingerprint(
    candidate.target.afterFingerprint,
    "after_fingerprint",
  );
  const providerObservedBeforeFingerprint = exactFingerprint(
    candidate.currentState.providerObservedBeforeFingerprint,
    "provider_observed_before_fingerprint",
  );
  const mutationControlFingerprint = exactFingerprint(
    candidate.currentState.mutationControlFingerprint,
    "mutation_control_fingerprint",
  );

  const evidenceIds = exactStringList(candidate.evidence.ids, "evidence_ids");
  const missingEvidence = exactStringList(
    candidate.evidence.missingEvidence,
    "missing_evidence",
  );
  const blockingReasons = exactStringList(
    candidate.quality.blockingReasons,
    "quality_blocking_reasons",
  );
  const warnings = exactStringList(candidate.quality.warnings, "quality_warnings");
  const qualityScore = score(candidate.quality.score, "quality_score");

  const priorDeploymentCount = integer(
    candidate.currentState.priorDeploymentCount,
    "prior_deployment_count",
    0,
    1_000_000,
  );
  const otherActiveSiteMutationCount = integer(
    candidate.currentState.otherActiveSiteMutationCount,
    "other_active_site_mutation_count",
    0,
    1_000_000,
  );
  const mutationQuotaRemaining = integer(
    candidate.currentState.mutationQuotaRemaining,
    "mutation_quota_remaining",
    0,
    1_000_000,
  );

  const evidenceSetFingerprint = stableHash({
    purpose: "p8.8_w01_evidence_set",
    ids: evidenceIds,
  });
  const qualityFingerprint = stableHash({
    purpose: "p8.8_w01_quality",
    status: candidate.quality.status,
    approvalEligible: candidate.quality.approvalEligible,
    score: qualityScore,
    blockingReasons,
    warnings,
  });
  const riskFingerprint = stableHash({
    purpose: "p8.8_w01_risk",
    classification: candidate.risk.classification,
  });
  const targetFingerprint = stableHash({
    purpose: "p8.8_w01_target",
    provider: candidate.target.provider,
    domain: candidate.target.domain,
    resourceKind: candidate.target.resourceKind,
    resourceGid: candidate.target.resourceGid,
    targetUrl: candidate.target.targetUrl,
    actionType: candidate.target.actionType,
    field: candidate.target.field,
    requiredProviderScope: candidate.target.requiredProviderScope,
    beforeFingerprint,
    afterFingerprint,
  });
  const currentStateFingerprint = stableHash({
    purpose: "p8.8_w01_current_state",
    providerObservedBeforeFingerprint,
    priorDeploymentCount,
    otherActiveSiteMutationCount,
    sameTargetCooldownSatisfied:
      candidate.currentState.sameTargetCooldownSatisfied,
    mutationQuotaRemaining,
    unresolvedManualIntervention:
      candidate.currentState.unresolvedManualIntervention,
    unresolvedUncertainProviderWrite:
      candidate.currentState.unresolvedUncertainProviderWrite,
    unresolvedRollbackFailure:
      candidate.currentState.unresolvedRollbackFailure,
    mutationControlMode: candidate.currentState.mutationControlMode,
    mutationControlFingerprint,
  });

  const reasons = new Set<P88PolicyRejectionReason>();

  addReason(reasons, referenceTime < input.grant.activationTime, "policy_not_active_yet");
  addReason(reasons, referenceTime >= input.grant.expiryTime, "policy_expired");
  addReason(reasons, input.grant.revoked, "policy_revoked");
  addReason(reasons, expiryInvalid, "evaluation_expiry_invalid");

  addReason(
    reasons,
    candidate.currentState.mutationControlMode !== "running",
    "control_not_running",
  );
  addReason(
    reasons,
    candidate.currentState.unresolvedManualIntervention,
    "manual_intervention_unresolved",
  );
  addReason(
    reasons,
    candidate.currentState.unresolvedUncertainProviderWrite,
    "provider_write_uncertain",
  );
  addReason(
    reasons,
    candidate.currentState.unresolvedRollbackFailure,
    "rollback_failure_unresolved",
  );

  addReason(
    reasons,
    candidate.recommendation.recommendationClass !== "proposal_review",
    "recommendation_class_not_proposal_review",
  );
  addReason(
    reasons,
    !candidate.recommendation.lineageMaterialized,
    "recommendation_lineage_not_materialized",
  );
  addReason(
    reasons,
    !candidate.recommendation.changedPreviewPresent,
    "changed_preview_missing",
  );
  addReason(
    reasons,
    !candidate.recommendation.deterministic,
    "proposal_not_deterministic",
  );
  addReason(
    reasons,
    candidate.recommendation.aiAssisted,
    "ai_assisted_candidate_blocked",
  );
  addReason(
    reasons,
    candidate.recommendation.humanEditedAfterCertification,
    "proposal_edited_after_certification",
  );
  addReason(
    reasons,
    !candidate.recommendation.lifecycleEligible,
    "proposal_lifecycle_ineligible",
  );
  addReason(
    reasons,
    candidate.recommendation.proposalGenerationMethod
      !== input.grant.allowedProposalGenerationMethod,
    "proposal_generation_method_not_allowed",
  );

  addReason(reasons, !candidate.proposal.boundedPilot, "bounded_pilot_required");
  addReason(
    reasons,
    candidate.proposal.wholeSiteCoverage,
    "whole_site_coverage_forbidden",
  );

  addReason(
    reasons,
    evidenceIds.length < input.grant.minimumEvidenceRefs,
    "evidence_insufficient",
  );
  addReason(
    reasons,
    missingEvidence.length > 0,
    "missing_evidence_present",
  );

  addReason(
    reasons,
    candidate.quality.status !== "pass",
    "quality_status_not_pass",
  );
  addReason(
    reasons,
    !candidate.quality.approvalEligible,
    "quality_not_approval_eligible",
  );
  addReason(
    reasons,
    qualityScore < input.grant.minimumQualityScore,
    "quality_score_below_threshold",
  );
  addReason(
    reasons,
    blockingReasons.length > 0,
    "quality_blockers_present",
  );
  addReason(reasons, warnings.length > 0, "quality_warnings_present");

  addReason(
    reasons,
    candidate.risk.classification !== "low",
    "risk_not_low",
  );

  addReason(
    reasons,
    candidate.target.provider !== input.grant.provider,
    "provider_not_allowed",
  );
  addReason(
    reasons,
    candidate.target.domain !== input.grant.allowedDomain,
    "domain_not_allowed",
  );
  addReason(
    reasons,
    candidate.target.resourceKind !== input.grant.allowedResourceKind,
    "resource_kind_not_allowed",
  );
  addReason(
    reasons,
    !SHOPIFY_PRODUCT_GID.test(candidate.target.resourceGid),
    "resource_gid_invalid",
  );
  addReason(
    reasons,
    !isAllowedProductUrl(candidate.target.targetUrl),
    "target_url_not_allowed",
  );
  addReason(
    reasons,
    candidate.target.actionType !== input.grant.allowedActionType,
    "action_type_not_allowed",
  );
  addReason(
    reasons,
    candidate.target.field !== input.grant.allowedField,
    "field_not_allowed",
  );
  addReason(
    reasons,
    candidate.target.requiredProviderScope !== input.grant.requiredProviderScope,
    "provider_scope_not_allowed",
  );
  addReason(
    reasons,
    providerObservedBeforeFingerprint !== beforeFingerprint,
    "provider_before_state_mismatch",
  );
  addReason(reasons, priorDeploymentCount > 0, "prior_deployment_exists");
  addReason(
    reasons,
    otherActiveSiteMutationCount >= input.grant.concurrencyLimit,
    "site_mutation_concurrency_exhausted",
  );
  addReason(
    reasons,
    !candidate.currentState.sameTargetCooldownSatisfied,
    "same_target_cooldown_not_satisfied",
  );
  addReason(
    reasons,
    mutationQuotaRemaining < 1,
    "mutation_quota_exhausted",
  );

  const rejectionReasons = [...reasons].sort((left, right) =>
    left.localeCompare(right)
  );

  const semantics = p88W01PolicySemantics();
  const safety = p88W01PolicyCapability();

  const withoutIdentity: Omit<
    P88PolicyEvaluation,
    "evaluationFingerprint" | "evaluationId"
  > = {
    version: P8_8_W01_POLICY_VERSION,
    policyClass: P8_8_INITIAL_POLICY_CLASS,
    decision: rejectionReasons.length === 0 ? "admit" : "reject",
    rejectionReasons,
    referenceTime,
    evaluationExpiresAt,
    policy: {
      policyId: input.grant.policyId,
      policyVersion: input.grant.policyVersion,
      policyFingerprint: input.grant.policyFingerprint,
      policyStage: input.grant.policyStage,
    },
    recommendation: {
      recommendationFingerprint,
      recommendationIdempotencyKey,
    },
    proposal: {
      proposalFingerprint,
      boundedPilot: candidate.proposal.boundedPilot,
      wholeSiteCoverage: candidate.proposal.wholeSiteCoverage,
    },
    evidence: {
      ids: evidenceIds,
      evidenceSetFingerprint,
      missingEvidence,
    },
    quality: {
      status: candidate.quality.status,
      approvalEligible: candidate.quality.approvalEligible,
      score: qualityScore,
      blockingReasons,
      warnings,
      qualityFingerprint,
    },
    risk: {
      classification: candidate.risk.classification,
      riskFingerprint,
    },
    target: {
      provider: candidate.target.provider,
      domain: candidate.target.domain,
      resourceKind: candidate.target.resourceKind,
      resourceGid: candidate.target.resourceGid,
      targetUrl: candidate.target.targetUrl,
      actionType: candidate.target.actionType,
      field: candidate.target.field,
      requiredProviderScope: candidate.target.requiredProviderScope,
      beforeFingerprint,
      afterFingerprint,
      targetFingerprint,
    },
    currentState: {
      providerObservedBeforeFingerprint,
      priorDeploymentCount,
      otherActiveSiteMutationCount,
      sameTargetCooldownSatisfied:
        candidate.currentState.sameTargetCooldownSatisfied,
      mutationQuotaRemaining,
      unresolvedManualIntervention:
        candidate.currentState.unresolvedManualIntervention,
      unresolvedUncertainProviderWrite:
        candidate.currentState.unresolvedUncertainProviderWrite,
      unresolvedRollbackFailure:
        candidate.currentState.unresolvedRollbackFailure,
      mutationControlMode: candidate.currentState.mutationControlMode,
      mutationControlFingerprint,
      currentStateFingerprint,
    },
    semantics,
    safety,
  };

  const evaluationFingerprint = stableHash(
    evaluationFingerprintPayload(withoutIdentity),
  );

  return deepFreeze({
    ...withoutIdentity,
    evaluationFingerprint,
    evaluationId: "p88w01-eval-" + evaluationFingerprint.slice(0, 24),
  });
}
