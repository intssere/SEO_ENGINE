import { createHash } from "node:crypto";
import {
  P8_8_INITIAL_POLICY_CLASS,
  P8_8_W01_POLICY_VERSION,
  assertP88PolicyGrantIntegrity,
  evaluateP88PolicyAdmission,
  type P88PolicyEvaluation,
  type P88PolicyEvaluationInput,
} from "./p8-8-policy-grant-evaluation.js";
import {
  P8_8_W02_INITIAL_MUTATION_CLASS,
  P8_8_W02_MATERIALIZATION_VERSION,
  assertP88W02TargetBindingIntegrity,
  materializeP88W02GovernedProposal,
  type P88W02GovernedProposalMaterialization,
  type P88W02MaterializationInput,
} from "./p8-8-governed-proposal-materialization.js";

export const P8_8_W03_POLICY_AUTHORIZATION_VERSION =
  "p8-8-w03-policy-authorization-v1" as const;

export const P8_8_W03_SYNTHETIC_RESERVATION_VERSION =
  "p8-8-w03-synthetic-reservation-v1" as const;

export type P88W03ReservationState = "reserved_prewrite";

export type P88W03ReservationDescriptorInput = {
  reservationId: string;
  reservationFingerprint: string;
  reservationState: P88W03ReservationState;
  reservationVersion: string;
  reservationDurable: boolean;
  reservationSource: string;
};

export type P88W03ReservationDescriptor = Readonly<{
  reservationId: string;
  reservationFingerprint: string;
  reservationState: "reserved_prewrite";
  reservationVersion: typeof P8_8_W03_SYNTHETIC_RESERVATION_VERSION;
  reservationDurable: false;
  reservationSource: "synthetic_test";
  descriptorFingerprint: string;
}>;

export type P88W03PolicyAuthorizationInput = {
  w01EvaluationInput: P88PolicyEvaluationInput;
  w01Evaluation: P88PolicyEvaluation;
  w02MaterializationInput: P88W02MaterializationInput;
  w02Materialization: P88W02GovernedProposalMaterialization;
  reservation: P88W03ReservationDescriptor;
  issuedAt: string;
  ttlMinutes: number;
};

export type P88W03PolicyAuthorizationArtifact = Readonly<{
  version: typeof P8_8_W03_POLICY_AUTHORIZATION_VERSION;
  authorizationProvenance: "policy_authorization";
  policyAuthorizationId: string;
  policyAuthorizationFingerprint: string;
  policyActionId: string;
  persistedActionId: null;
  persistedActionCreated: false;
  policy: Readonly<{
    policyId: string;
    policyVersion: string;
    policyFingerprint: string;
    policyStage: P88PolicyEvaluation["policy"]["policyStage"];
  }>;
  evaluation: Readonly<{
    evaluationId: string;
    evaluationFingerprint: string;
    referenceTime: string;
    evaluationExpiresAt: string;
  }>;
  materialization: Readonly<{
    materializationId: string;
    materializationFingerprint: string;
    materializationIdempotencyFingerprint: string;
  }>;
  proposal: Readonly<{
    proposalId: string;
    proposalFingerprint: string;
  }>;
  recommendation: Readonly<{
    recommendationFingerprint: string;
    recommendationIdempotencyKey: string;
  }>;
  target: Readonly<{
    provider: "shopify";
    domain: "diamondshelf.us";
    resourceKind: "product";
    resourceGid: string;
    targetUrl: string;
    actionType: "update_meta_description";
    field: "meta_description";
    requiredProviderScope: "write_products";
    targetBindingFingerprint: string;
  }>;
  state: Readonly<{
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  evidence: Readonly<{
    ids: readonly string[];
    evidenceSetFingerprint: string;
    upstreamEvidenceFingerprints: readonly string[];
    missingEvidence: readonly string[];
  }>;
  quality: Readonly<{
    qualityFingerprint: string;
  }>;
  risk: Readonly<{
    riskFingerprint: string;
  }>;
  currentState: Readonly<{
    currentStateFingerprint: string;
    mutationControlFingerprint: string;
  }>;
  reservation: P88W03ReservationDescriptor;
  issuedAt: string;
  expiresAt: string;
  authorization: ReturnType<typeof p88W03AuthorizationSemantics>;
  safety: ReturnType<typeof p88W03AuthorizationCapability>;
}>;

const HEX_64 = /^[0-9a-f]{64}$/;
const EXACT_KEY = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/;

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
  if (
    typeof value !== "string"
    || value !== value.trim()
    || !EXACT_KEY.test(value)
  ) {
    throw new Error("p88_w03_invalid_" + field);
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) {
    throw new Error("p88_w03_invalid_" + field);
  }
  return value;
}

function canonicalTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error("p88_w03_invalid_" + field);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error("p88_w03_invalid_" + field);
  }
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) {
    throw new Error("p88_w03_noncanonical_" + field);
  }
  return canonical;
}

function exactPositiveTtl(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 15) {
    throw new Error("p88_w03_invalid_ttl_minutes");
  }
  return Number(value);
}

function assertNoHumanAuthorizationFields(input: unknown): void {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const forbidden = [
    "approvalId",
    "approvalDecision",
    "approvalActor",
    "humanApprovalId",
    "humanApprovalDecision",
    "humanApprovalActor",
    "approvedAt",
    "task51Envelope",
    "task54Confirmation",
    "humanConfirmation",
  ];
  const object = input as Record<string, unknown>;
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      throw new Error("p88_w03_human_authorization_field_forbidden:" + key);
    }
  }
}

function reservationDescriptorPayload(
  descriptor: Omit<P88W03ReservationDescriptor, "descriptorFingerprint">,
) {
  return {
    version: P8_8_W03_POLICY_AUTHORIZATION_VERSION,
    purpose: "p8.8_w03_reservation_descriptor",
    ...descriptor,
  };
}

export function buildP88W03ReservationDescriptor(
  input: P88W03ReservationDescriptorInput,
): P88W03ReservationDescriptor {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w03_invalid_reservation_input");
  }

  if (input.reservationState !== "reserved_prewrite") {
    throw new Error("p88_w03_unsupported_reservation_state");
  }
  if (
    input.reservationVersion !== P8_8_W03_SYNTHETIC_RESERVATION_VERSION
  ) {
    throw new Error("p88_w03_unsupported_reservation_version");
  }
  if (input.reservationDurable !== false) {
    throw new Error("p88_w03_durable_reservation_not_supported_before_w04");
  }
  if (input.reservationSource !== "synthetic_test") {
    throw new Error("p88_w03_non_synthetic_reservation_not_supported_before_w04");
  }

  const withoutDescriptorFingerprint = {
    reservationId: exactKey(input.reservationId, "reservation_id"),
    reservationFingerprint: exactFingerprint(
      input.reservationFingerprint,
      "reservation_fingerprint",
    ),
    reservationState: "reserved_prewrite" as const,
    reservationVersion: P8_8_W03_SYNTHETIC_RESERVATION_VERSION,
    reservationDurable: false as const,
    reservationSource: "synthetic_test" as const,
  };

  return deepFreeze({
    ...withoutDescriptorFingerprint,
    descriptorFingerprint: stableHash(
      reservationDescriptorPayload(withoutDescriptorFingerprint),
    ),
  });
}

export function p88W03ReservationIntegrityIssues(
  descriptor: P88W03ReservationDescriptor,
): string[] {
  const issues: string[] = [];
  try {
    const rebuilt = buildP88W03ReservationDescriptor({
      reservationId: descriptor.reservationId,
      reservationFingerprint: descriptor.reservationFingerprint,
      reservationState: descriptor.reservationState,
      reservationVersion: descriptor.reservationVersion,
      reservationDurable: descriptor.reservationDurable,
      reservationSource: descriptor.reservationSource,
    });
    if (rebuilt.descriptorFingerprint !== descriptor.descriptorFingerprint) {
      issues.push("p88_w03_reservation_descriptor_fingerprint_mismatch");
    }
  } catch (error) {
    issues.push(
      error instanceof Error
        ? error.message
        : "p88_w03_reservation_integrity_invalid",
    );
  }

  return [...new Set(issues)].sort((left, right) => left.localeCompare(right));
}

export function assertP88W03ReservationIntegrity(
  descriptor: P88W03ReservationDescriptor,
): void {
  const issues = p88W03ReservationIntegrityIssues(descriptor);
  if (issues.length > 0) {
    throw new Error(
      "p88_w03_reservation_integrity_failure:" + issues.join(","),
    );
  }
}

function canonicalW01(
  input: P88PolicyEvaluationInput,
  supplied: P88PolicyEvaluation,
): P88PolicyEvaluation {
  assertP88PolicyGrantIntegrity(input.grant);

  const rebuilt = evaluateP88PolicyAdmission(input);
  if (stableJson(rebuilt) !== stableJson(supplied)) {
    throw new Error("p88_w03_w01_evaluation_integrity_mismatch");
  }
  if (rebuilt.version !== P8_8_W01_POLICY_VERSION) {
    throw new Error("p88_w03_unsupported_w01_version");
  }
  if (rebuilt.policyClass !== P8_8_INITIAL_POLICY_CLASS) {
    throw new Error("p88_w03_unsupported_policy_class");
  }
  if (rebuilt.decision !== "admit" || rebuilt.rejectionReasons.length !== 0) {
    throw new Error("p88_w03_w01_not_admitted");
  }

  return rebuilt;
}

function canonicalW02(
  input: P88W02MaterializationInput,
  supplied: P88W02GovernedProposalMaterialization,
): P88W02GovernedProposalMaterialization {
  assertP88W02TargetBindingIntegrity(input.targetBinding);

  const rebuilt = materializeP88W02GovernedProposal(input);
  if (stableJson(rebuilt) !== stableJson(supplied)) {
    throw new Error("p88_w03_w02_materialization_integrity_mismatch");
  }
  if (rebuilt.version !== P8_8_W02_MATERIALIZATION_VERSION) {
    throw new Error("p88_w03_unsupported_w02_version");
  }
  if (rebuilt.mutationClass !== P8_8_W02_INITIAL_MUTATION_CLASS) {
    throw new Error("p88_w03_unsupported_w02_mutation_class");
  }
  if (rebuilt.proposalLifecycle !== "materialized_unpersisted") {
    throw new Error("p88_w03_w02_not_unpersisted_materialization");
  }

  return rebuilt;
}

function assertSharedLineage(
  w01: P88PolicyEvaluation,
  w02: P88W02GovernedProposalMaterialization,
): void {
  const comparisons: Array<[unknown, unknown, string]> = [
    [w01.policyClass, w02.mutationClass, "policy_class"],
    [
      w01.recommendation.recommendationFingerprint,
      w02.recommendation.recommendationFingerprint,
      "recommendation_fingerprint",
    ],
    [
      w01.recommendation.recommendationIdempotencyKey,
      w02.recommendation.idempotencyKey,
      "recommendation_idempotency_key",
    ],
    [
      w01.proposal.proposalFingerprint,
      w02.proposalFingerprint,
      "proposal_fingerprint",
    ],
    [w01.target.provider, w02.target.provider, "provider"],
    [w01.target.domain, w02.target.domain, "domain"],
    [w01.target.resourceKind, w02.target.resourceKind, "resource_kind"],
    [w01.target.resourceGid, w02.target.resourceGid, "resource_gid"],
    [w01.target.targetUrl, w02.target.targetUrl, "target_url"],
    [w01.target.actionType, w02.target.actionType, "action_type"],
    [w01.target.field, w02.target.field, "field"],
    [
      w01.target.requiredProviderScope,
      w02.target.requiredProviderScope,
      "required_provider_scope",
    ],
    [
      w01.target.beforeFingerprint,
      w02.before.fingerprint,
      "before_fingerprint",
    ],
    [
      w01.target.afterFingerprint,
      w02.after.fingerprint,
      "after_fingerprint",
    ],
  ];

  for (const [left, right, field] of comparisons) {
    if (left !== right) {
      throw new Error("p88_w03_cross_lineage_mismatch:" + field);
    }
  }
}

export function p88W03AuthorizationSemantics() {
  return deepFreeze({
    policyAuthorizationGranted: true,
    policyAwarePreflightEligible: true,
    providerWriteAllowed: false,
    providerDispatchAuthorized: false,
    publicSiteWrites: false,
    automaticTransition: false,
    task51Compatible: false,
    task54HumanConfirmationCompatible: false,
    approvalRequired: false,
    humanApprovalPresent: false,
    humanTask51EnvelopeCompatible: false,
    humanTask54ApplyCompatible: false,
    humanApprovalRowRequired: false,
    humanApprovalRowCreated: false,
    persistedActionCreated: false,
    durableReservationPresent: false,
    dispatchEligible: false,
  });
}

export function p88W03AuthorizationCapability() {
  return deepFreeze({
    version: P8_8_W03_POLICY_AUTHORIZATION_VERSION,
    deterministicArtifactCreationOnly: true,
    w01EvaluationRebuiltAndVerified: true,
    w02MaterializationRebuiltAndVerified: true,
    policyProvenanceExplicit: true,
    humanApprovalAbsent: true,
    reservationCallerSuppliedOnly: true,
    databaseReadPerformed: false,
    databaseWritePerformed: false,
    persistencePerformed: false,
    schemaMutationPerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    approvalRowCreated: false,
    persistedActionCreated: false,
    durableReservationCreated: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    task54HumanConfirmationGenerated: false,
    policyActivationPerformed: false,
    schedulerActivated: false,
    workerActivated: false,
    providerDispatchAuthorized: false,
    autonomousLiveExecutionAuthorized: false,
    credentialScopeChanged: false,
    configurationChanged: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}

function computeExpiry(
  issuedAt: string,
  ttlMinutes: number,
  evaluationExpiresAt: string,
  grantExpiresAt: string,
): string {
  const issued = Date.parse(issuedAt);
  const requested = issued + ttlMinutes * 60_000;
  const evaluationExpiry = Date.parse(evaluationExpiresAt);
  const grantExpiry = Date.parse(grantExpiresAt);
  const expires = Math.min(requested, evaluationExpiry, grantExpiry);
  if (!Number.isFinite(expires) || expires <= issued) {
    throw new Error("p88_w03_authorization_window_expired");
  }
  return new Date(expires).toISOString();
}

export function buildP88W03PolicyAuthorization(
  input: P88W03PolicyAuthorizationInput,
): P88W03PolicyAuthorizationArtifact {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("p88_w03_invalid_authorization_input");
  }
  assertNoHumanAuthorizationFields(input);

  assertP88W03ReservationIntegrity(input.reservation);

  const w01 = canonicalW01(input.w01EvaluationInput, input.w01Evaluation);
  const w02 = canonicalW02(
    input.w02MaterializationInput,
    input.w02Materialization,
  );
  assertSharedLineage(w01, w02);

  const issuedAt = canonicalTimestamp(input.issuedAt, "issued_at");
  const ttlMinutes = exactPositiveTtl(input.ttlMinutes);

  if (issuedAt < w01.referenceTime) {
    throw new Error("p88_w03_issued_before_evaluation_reference");
  }
  if (issuedAt >= w01.evaluationExpiresAt) {
    throw new Error("p88_w03_w01_evaluation_expired");
  }
  if (issuedAt < input.w01EvaluationInput.grant.activationTime) {
    throw new Error("p88_w03_policy_not_active");
  }
  if (issuedAt >= input.w01EvaluationInput.grant.expiryTime) {
    throw new Error("p88_w03_policy_expired");
  }
  if (input.w01EvaluationInput.grant.revoked) {
    throw new Error("p88_w03_policy_revoked");
  }

  const expiresAt = computeExpiry(
    issuedAt,
    ttlMinutes,
    w01.evaluationExpiresAt,
    input.w01EvaluationInput.grant.expiryTime,
  );

  const policyActionIdentity = {
    version: P8_8_W03_POLICY_AUTHORIZATION_VERSION,
    purpose: "p8.8_w03_policy_action",
    policyFingerprint: w01.policy.policyFingerprint,
    evaluationFingerprint: w01.evaluationFingerprint,
    proposalFingerprint: w02.proposalFingerprint,
    resourceGid: w02.target.resourceGid,
    field: w02.target.field,
    beforeFingerprint: w02.before.fingerprint,
    afterFingerprint: w02.after.fingerprint,
    reservationFingerprint: input.reservation.reservationFingerprint,
    reservationDescriptorFingerprint:
      input.reservation.descriptorFingerprint,
  };
  const policyActionFingerprint = stableHash(policyActionIdentity);
  const policyActionId =
    "p88w03-action-" + policyActionFingerprint.slice(0, 24);

  const authorization = p88W03AuthorizationSemantics();
  const safety = p88W03AuthorizationCapability();

  const authorizationBase = {
    version: P8_8_W03_POLICY_AUTHORIZATION_VERSION,
    authorizationProvenance: "policy_authorization" as const,
    policyActionId,
    persistedActionId: null,
    persistedActionCreated: false as const,
    policy: {
      policyId: w01.policy.policyId,
      policyVersion: w01.policy.policyVersion,
      policyFingerprint: w01.policy.policyFingerprint,
      policyStage: w01.policy.policyStage,
    },
    evaluation: {
      evaluationId: w01.evaluationId,
      evaluationFingerprint: w01.evaluationFingerprint,
      referenceTime: w01.referenceTime,
      evaluationExpiresAt: w01.evaluationExpiresAt,
    },
    materialization: {
      materializationId: w02.materializationId,
      materializationFingerprint: w02.materializationFingerprint,
      materializationIdempotencyFingerprint:
        w02.materializationIdempotencyFingerprint,
    },
    proposal: {
      proposalId: w02.proposalId,
      proposalFingerprint: w02.proposalFingerprint,
    },
    recommendation: {
      recommendationFingerprint:
        w02.recommendation.recommendationFingerprint,
      recommendationIdempotencyKey: w02.recommendation.idempotencyKey,
    },
    target: {
      provider: "shopify" as const,
      domain: "diamondshelf.us" as const,
      resourceKind: "product" as const,
      resourceGid: w02.target.resourceGid,
      targetUrl: w02.target.targetUrl,
      actionType: "update_meta_description" as const,
      field: "meta_description" as const,
      requiredProviderScope: "write_products" as const,
      targetBindingFingerprint: w02.target.targetBindingFingerprint,
    },
    state: {
      beforeFingerprint: w02.before.fingerprint,
      afterFingerprint: w02.after.fingerprint,
    },
    evidence: {
      ids: [...w01.evidence.ids],
      evidenceSetFingerprint: w01.evidence.evidenceSetFingerprint,
      upstreamEvidenceFingerprints: [
        ...w02.lineage.evidenceFingerprints,
      ],
      missingEvidence: [...w02.lineage.missingEvidence],
    },
    quality: {
      qualityFingerprint: w01.quality.qualityFingerprint,
    },
    risk: {
      riskFingerprint: w01.risk.riskFingerprint,
    },
    currentState: {
      currentStateFingerprint: w01.currentState.currentStateFingerprint,
      mutationControlFingerprint:
        w01.currentState.mutationControlFingerprint,
    },
    reservation: input.reservation,
    issuedAt,
    expiresAt,
    authorization,
    safety,
  };

  const policyAuthorizationFingerprint = stableHash({
    purpose: "p8.8_w03_policy_authorization",
    ...authorizationBase,
  });
  const policyAuthorizationId =
    "p88w03-authorization-" + policyAuthorizationFingerprint.slice(0, 24);

  return deepFreeze({
    ...authorizationBase,
    policyAuthorizationId,
    policyAuthorizationFingerprint,
  });
}

export function assertP88W03ReplayCompatible(
  existing: P88W03PolicyAuthorizationArtifact,
  candidate: P88W03PolicyAuthorizationArtifact,
): void {
  const sameLineage =
    existing.evaluation.evaluationFingerprint
      === candidate.evaluation.evaluationFingerprint
    && existing.proposal.proposalFingerprint
      === candidate.proposal.proposalFingerprint;

  if (
    sameLineage
    && existing.policyAuthorizationFingerprint
      !== candidate.policyAuthorizationFingerprint
  ) {
    throw new Error("p88_w03_conflicting_replay_identity");
  }
}
