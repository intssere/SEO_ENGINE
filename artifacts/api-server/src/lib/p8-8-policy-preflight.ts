import { createHash } from "node:crypto";
import {
  P8_8_INITIAL_POLICY_CLASS,
  P8_8_W01_POLICY_VERSION,
  evaluateP88PolicyAdmission,
  type P88PolicyEvaluation,
  type P88PolicyEvaluationInput,
} from "./p8-8-policy-grant-evaluation.js";
import {
  P8_8_W02_INITIAL_MUTATION_CLASS,
  P8_8_W02_MATERIALIZATION_VERSION,
  materializeP88W02GovernedProposal,
  p88W02StateFingerprint,
  type P88W02GovernedProposalMaterialization,
  type P88W02MaterializationInput,
} from "./p8-8-governed-proposal-materialization.js";
import {
  P8_8_W03_POLICY_AUTHORIZATION_VERSION,
  buildP88W03PolicyAuthorization,
  type P88W03PolicyAuthorizationArtifact,
  type P88W03PolicyAuthorizationInput,
} from "./p8-8-policy-authorization.js";
import {
  P8_8_W04_DURABLE_RECEIPT_VERSION,
  assertP88W04DurableReceiptIntegrity,
  pairP88W03W04DurableReservation,
  type P88W04DurableReservationReceipt,
  type P88W04DurableReservationStatus,
} from "./p8-8-reservation-store.js";
import {
  P8_8_W05_CLAIM_RECEIPT_VERSION,
  type P88W05ClaimReceipt,
} from "./p8-8-mutation-control-store.js";
import {
  P8_8_W05_CONTROL_VERSION,
  type P88W05ControlMode,
} from "./p8-8-mutation-control.js";

export const P8_8_W06_PREFLIGHT_VERSION =
  "p8-8-w06-policy-preflight-v1" as const;
export const P8_8_W06_NO_DISPATCH_PROOF_VERSION =
  "p8-8-w06-no-dispatch-proof-v1" as const;
export const P8_8_W06_PROVIDER_OBSERVATION_VERSION =
  "p8-8-w06-provider-observation-v1" as const;
export const P8_8_W06_MAX_PREFLIGHT_SECONDS = 60 as const;

export type P88W06Disposition =
  | "ready_for_w07"
  | "blocked_no_dispatch"
  | "provider_read_unavailable_no_dispatch"
  | "state_uncertain";

export type P88W06ClaimReleaseEligibility =
  | "retain_for_w07"
  | "release_eligible_no_dispatch"
  | "not_releasable_uncertain";

export type P88W06ProviderObservationStatus =
  | "observed"
  | "unavailable"
  | "identity_mismatch"
  | "invalid_response";

export type P88W06ProviderObservation = Readonly<{
  version: typeof P8_8_W06_PROVIDER_OBSERVATION_VERSION;
  status: P88W06ProviderObservationStatus;
  siteId: string;
  provider: "shopify";
  resourceKind: "product";
  resourceGid: string;
  field: "meta_description";
  rawValue: string | null;
  observedBeforeFingerprint: string | null;
  requestProvenanceFingerprint: string | null;
  errorCategory: string | null;
  observationFingerprint: string;
  providerDispatchAttempted: false;
  providerMutationCalled: false;
  providerWritePerformed: false;
}>;

export type P88W06ReservationSnapshot = Readonly<{
  reservationId: string;
  reservationVersion: string;
  reservationClass: string;
  reservationFingerprint: string;
  siteId: string;
  policyId: string;
  policyVersion: string;
  policyFingerprint: string;
  evaluationId: string;
  evaluationFingerprint: string;
  materializationId: string;
  materializationFingerprint: string;
  materializationIdempotencyFingerprint: string;
  proposalId: string;
  proposalFingerprint: string;
  recommendationFingerprint: string;
  recommendationIdempotencyKey: string;
  targetBindingFingerprint: string;
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
  w03AuthorizationId: string;
  w03AuthorizationFingerprint: string;
  policyActionId: string;
  w03ReservationDescriptorFingerprint: string;
  status: P88W04DurableReservationStatus;
  authorizedAt: string;
  expiresAt: string;
  claimedAt: string | null;
  terminalAt: string | null;
  terminalReason: string | null;
  updatedAt: string;
}>;

export type P88W06ClaimSnapshot = Readonly<{
  claimId: string;
  claimVersion: string;
  claimFingerprint: string;
  reservationId: string;
  reservationFingerprint: string;
  w03AuthorizationId: string;
  w03AuthorizationFingerprint: string;
  policyActionId: string;
  siteId: string;
  controlRevision: number;
  controlFingerprint: string;
  resourceGid: string;
  targetUrl: string;
  field: string;
  beforeFingerprint: string;
  afterFingerprint: string;
  claimedAt: string;
  createdAt: string;
}>;

export type P88W06ControlSnapshot = Readonly<{
  version: string;
  siteId: string;
  revision: number;
  previousControlFingerprint: string | null;
  mode: P88W05ControlMode;
  effectiveAt: string;
  controlFingerprint: string;
  updatedAt: string;
}>;

export type P88W06DurableSnapshot = Readonly<{
  siteId: string;
  reservation: P88W06ReservationSnapshot | null;
  claim: P88W06ClaimSnapshot | null;
  control: P88W06ControlSnapshot | null;
  databaseNow: string;
  snapshotFingerprint: string;
}>;

export type P88W06LineageInput = Readonly<{
  w01EvaluationInput: P88PolicyEvaluationInput;
  w01Evaluation: P88PolicyEvaluation;
  w02MaterializationInput: P88W02MaterializationInput;
  w02Materialization: P88W02GovernedProposalMaterialization;
  w03Input: P88W03PolicyAuthorizationInput;
  w03Authorization: P88W03PolicyAuthorizationArtifact;
  w04Receipt: P88W04DurableReservationReceipt;
  w05ClaimReceipt: P88W05ClaimReceipt;
}>;

export type P88W06NoDispatchProof = Readonly<{
  version: typeof P8_8_W06_NO_DISPATCH_PROOF_VERSION;
  preflightId: string;
  preflightFingerprint: string;
  w03AuthorizationId: string;
  w03AuthorizationFingerprint: string;
  policyActionId: string;
  reservationId: string;
  reservationFingerprint: string;
  claimId: string;
  claimFingerprint: string;
  target: Readonly<{
    resourceGid: string;
    targetUrl: string;
    field: "meta_description";
  }>;
  state: Readonly<{
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  control: Readonly<{
    revision: number | null;
    fingerprint: string | null;
    mode: P88W05ControlMode | null;
  }>;
  providerReadOutcome: P88W06ProviderObservationStatus;
  validatedAt: string;
  disposition: P88W06Disposition;
  executionPhase: "pre_dispatch_proven";
  providerDispatchAttempted: false;
  providerMutationCalled: false;
  providerWritePerformed: false;
  publicSiteWritePerformed: false;
  task51ExecutionPerformed: false;
  task53ExecutionPerformed: false;
  task54ExecutionPerformed: false;
  rollbackWritePerformed: false;
  automaticTransition: false;
  proofFingerprint: string;
}>;

export type P88W06PolicyPreflight = Readonly<{
  version: typeof P8_8_W06_PREFLIGHT_VERSION;
  preflightProvenance: "policy_preflight";
  preflightId: string;
  preflightFingerprint: string;
  disposition: P88W06Disposition;
  blockers: readonly string[];
  lineage: Readonly<{
    policyClass: typeof P8_8_INITIAL_POLICY_CLASS;
    policyId: string;
    policyVersion: string;
    policyFingerprint: string;
    evaluationId: string;
    evaluationFingerprint: string;
    materializationId: string;
    materializationFingerprint: string;
    materializationIdempotencyFingerprint: string;
    proposalId: string;
    proposalFingerprint: string;
    recommendationFingerprint: string;
    recommendationIdempotencyKey: string;
    w03AuthorizationId: string;
    w03AuthorizationFingerprint: string;
    policyActionId: string;
    reservationId: string;
    reservationFingerprint: string;
    claimId: string;
    claimFingerprint: string;
  }>;
  target: Readonly<{
    siteId: string;
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
    beforeValue: string | null;
    afterValue: string | null;
    beforeFingerprint: string;
    afterFingerprint: string;
    observedBeforeFingerprint: string | null;
  }>;
  claimedControl: Readonly<{
    revision: number;
    fingerprint: string;
  }>;
  currentControl: Readonly<{
    revision: number | null;
    fingerprint: string | null;
    mode: P88W05ControlMode | null;
  }>;
  providerObservation: P88W06ProviderObservation;
  validatedAt: string;
  preflightExpiresAt: string;
  claimReleaseEligibility: P88W06ClaimReleaseEligibility;
  noDispatchProof: P88W06NoDispatchProof;
  safety: ReturnType<typeof p88W06PreflightCapability>;
}>;

const HEX_64 = /^[0-9a-f]{64}$/;

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

function canonicalIso(value: string, code: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    throw new Error(code);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error(code);
  const canonical = new Date(time).toISOString();
  if (canonical !== value) throw new Error(code);
  return canonical;
}

function requireEqual(left: unknown, right: unknown, name: string): void {
  if (left !== right) throw new Error("p88_w06_lineage_mismatch:" + name);
}

export function p88W06PreflightCapability() {
  return deepFreeze({
    version: P8_8_W06_PREFLIGHT_VERSION,
    w01RebuiltAndVerified: true,
    w02RebuiltAndVerified: true,
    w03PolicyAuthorizationVerified: true,
    w04DurablePairingVerified: true,
    w05DurableClaimVerified: true,
    currentDurableControlInspected: true,
    providerReadMayBePerformedByReadAdapterOnly: true,
    providerMutationPerformed: false,
    providerDispatchAuthorized: false,
    providerWriteAllowed: false,
    publicSiteWritePerformed: false,
    rollbackWritePerformed: false,
    databaseWritePerformed: false,
    schemaMutationPerformed: false,
    humanApprovalCreated: false,
    humanActionCreated: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    task54ConfirmationGenerated: false,
    schedulerActivated: false,
    workerActivated: false,
    autonomousLiveExecutionAuthorized: false,
    credentialScopeChanged: false,
    configurationChanged: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}

export function p88W06DurableSnapshotFingerprint(
  snapshot: Omit<P88W06DurableSnapshot, "databaseNow" | "snapshotFingerprint">,
): string {
  return stableHash({
    version: P8_8_W06_PREFLIGHT_VERSION,
    purpose: "p8.8_w06_durable_snapshot",
    siteId: snapshot.siteId,
    reservation: snapshot.reservation,
    claim: snapshot.claim,
    control: snapshot.control,
  });
}

export function buildP88W06ProviderObservation(input: Omit<
  P88W06ProviderObservation,
  "version" | "observationFingerprint" | "providerDispatchAttempted"
  | "providerMutationCalled" | "providerWritePerformed"
>): P88W06ProviderObservation {
  if (input.provider !== "shopify" || input.resourceKind !== "product") {
    throw new Error("p88_w06_provider_observation_scope_invalid");
  }
  if (input.field !== "meta_description") {
    throw new Error("p88_w06_provider_observation_field_invalid");
  }
  if (
    input.observedBeforeFingerprint !== null
    && !HEX_64.test(input.observedBeforeFingerprint)
  ) {
    throw new Error("p88_w06_provider_observation_fingerprint_invalid");
  }
  if (
    input.requestProvenanceFingerprint !== null
    && !HEX_64.test(input.requestProvenanceFingerprint)
  ) {
    throw new Error("p88_w06_provider_request_fingerprint_invalid");
  }
  const base = {
    version: P8_8_W06_PROVIDER_OBSERVATION_VERSION,
    status: input.status,
    siteId: input.siteId,
    provider: "shopify" as const,
    resourceKind: "product" as const,
    resourceGid: input.resourceGid,
    field: "meta_description" as const,
    rawValue: input.rawValue,
    observedBeforeFingerprint: input.observedBeforeFingerprint,
    requestProvenanceFingerprint: input.requestProvenanceFingerprint,
    errorCategory: input.errorCategory,
    providerDispatchAttempted: false as const,
    providerMutationCalled: false as const,
    providerWritePerformed: false as const,
  };
  return deepFreeze({
    ...base,
    observationFingerprint: stableHash({
      purpose: "p8.8_w06_provider_observation",
      ...base,
    }),
  });
}

export function assertP88W06ProviderObservationIntegrity(
  observation: P88W06ProviderObservation,
): void {
  const rebuilt = buildP88W06ProviderObservation({
    status: observation.status,
    siteId: observation.siteId,
    provider: observation.provider,
    resourceKind: observation.resourceKind,
    resourceGid: observation.resourceGid,
    field: observation.field,
    rawValue: observation.rawValue,
    observedBeforeFingerprint: observation.observedBeforeFingerprint,
    requestProvenanceFingerprint: observation.requestProvenanceFingerprint,
    errorCategory: observation.errorCategory,
  });
  if (stableJson(rebuilt) !== stableJson(observation)) {
    throw new Error("p88_w06_provider_observation_integrity_mismatch");
  }
}

export function assertP88W06ClaimReceiptIntegrity(
  receipt: P88W05ClaimReceipt,
): void {
  if (
    receipt.version !== P8_8_W05_CLAIM_RECEIPT_VERSION
    || receipt.durable !== true
    || receipt.providerDispatchAuthorized !== false
    || receipt.providerWriteAllowed !== false
    || receipt.publicSiteWrites !== false
    || receipt.target.field !== "meta_description"
  ) {
    throw new Error("p88_w06_w05_claim_receipt_scope_invalid");
  }
  canonicalIso(receipt.claimedAt, "p88_w06_w05_claimed_at_invalid");
  const base = {
    version: receipt.version,
    claimId: receipt.claimId,
    claimFingerprint: receipt.claimFingerprint,
    reservationId: receipt.reservationId,
    reservationFingerprint: receipt.reservationFingerprint,
    w03AuthorizationId: receipt.w03AuthorizationId,
    w03AuthorizationFingerprint: receipt.w03AuthorizationFingerprint,
    policyActionId: receipt.policyActionId,
    siteId: receipt.siteId,
    controlRevision: receipt.controlRevision,
    controlFingerprint: receipt.controlFingerprint,
    target: receipt.target,
    state: receipt.state,
    claimedAt: receipt.claimedAt,
    durable: receipt.durable,
    providerDispatchAuthorized: receipt.providerDispatchAuthorized,
    providerWriteAllowed: receipt.providerWriteAllowed,
    publicSiteWrites: receipt.publicSiteWrites,
  };
  const expected = stableHash({
    purpose: "p8.8_w05_claim_receipt",
    ...base,
  });
  if (expected !== receipt.receiptFingerprint) {
    throw new Error("p88_w06_w05_claim_receipt_integrity_mismatch");
  }
}

export function assertP88W06ExactArtifactLineage(
  input: P88W06LineageInput,
): void {
  const rebuiltW01 = evaluateP88PolicyAdmission(input.w01EvaluationInput);
  if (
    rebuiltW01.version !== P8_8_W01_POLICY_VERSION
    || rebuiltW01.decision !== "admit"
    || rebuiltW01.rejectionReasons.length !== 0
    || rebuiltW01.policyClass !== P8_8_INITIAL_POLICY_CLASS
    || stableJson(rebuiltW01) !== stableJson(input.w01Evaluation)
  ) {
    throw new Error("p88_w06_w01_integrity_mismatch");
  }

  const rebuiltW02 = materializeP88W02GovernedProposal(
    input.w02MaterializationInput,
  );
  if (
    rebuiltW02.version !== P8_8_W02_MATERIALIZATION_VERSION
    || rebuiltW02.mutationClass !== P8_8_W02_INITIAL_MUTATION_CLASS
    || rebuiltW02.proposalLifecycle !== "materialized_unpersisted"
    || stableJson(rebuiltW02) !== stableJson(input.w02Materialization)
  ) {
    throw new Error("p88_w06_w02_integrity_mismatch");
  }

  const rebuiltW03 = buildP88W03PolicyAuthorization(input.w03Input);
  if (
    rebuiltW03.version !== P8_8_W03_POLICY_AUTHORIZATION_VERSION
    || rebuiltW03.authorizationProvenance !== "policy_authorization"
    || stableJson(rebuiltW03) !== stableJson(input.w03Authorization)
  ) {
    throw new Error("p88_w06_w03_integrity_mismatch");
  }

  assertP88W04DurableReceiptIntegrity(input.w04Receipt);
  pairP88W03W04DurableReservation(
    input.w03Authorization,
    input.w04Receipt,
  );
  assertP88W06ClaimReceiptIntegrity(input.w05ClaimReceipt);

  const w01 = input.w01Evaluation;
  const w02 = input.w02Materialization;
  const w03 = input.w03Authorization;
  const w04 = input.w04Receipt;
  const w05 = input.w05ClaimReceipt;

  const comparisons: Array<[unknown, unknown, string]> = [
    [w01.policy.policyId, w03.policy.policyId, "policy_id"],
    [w01.policy.policyVersion, w03.policy.policyVersion, "policy_version"],
    [w01.policy.policyFingerprint, w03.policy.policyFingerprint, "policy_fingerprint"],
    [w01.evaluationId, w03.evaluation.evaluationId, "evaluation_id"],
    [w01.evaluationFingerprint, w03.evaluation.evaluationFingerprint, "evaluation_fingerprint"],
    [w02.materializationId, w03.materialization.materializationId, "materialization_id"],
    [w02.materializationFingerprint, w03.materialization.materializationFingerprint, "materialization_fingerprint"],
    [w02.materializationIdempotencyFingerprint, w03.materialization.materializationIdempotencyFingerprint, "materialization_idempotency_fingerprint"],
    [w02.proposalId, w03.proposal.proposalId, "proposal_id"],
    [w02.proposalFingerprint, w03.proposal.proposalFingerprint, "proposal_fingerprint"],
    [w02.recommendation.recommendationFingerprint, w03.recommendation.recommendationFingerprint, "recommendation_fingerprint"],
    [w02.recommendation.idempotencyKey, w03.recommendation.recommendationIdempotencyKey, "recommendation_idempotency_key"],
    [w02.target.siteId, w05.siteId, "site_id"],
    [w02.target.provider, w03.target.provider, "provider"],
    [w02.target.domain, w03.target.domain, "domain"],
    [w02.target.resourceKind, w03.target.resourceKind, "resource_kind"],
    [w02.target.resourceGid, w03.target.resourceGid, "resource_gid"],
    [w02.target.targetUrl, w03.target.targetUrl, "target_url"],
    [w02.target.actionType, w03.target.actionType, "action_type"],
    [w02.target.field, w03.target.field, "field"],
    [w02.target.requiredProviderScope, w03.target.requiredProviderScope, "required_provider_scope"],
    [w02.target.targetBindingFingerprint, w03.target.targetBindingFingerprint, "target_binding_fingerprint"],
    [w02.before.fingerprint, w03.state.beforeFingerprint, "before_fingerprint"],
    [w02.after.fingerprint, w03.state.afterFingerprint, "after_fingerprint"],
    [w03.policyAuthorizationId, w04.w03AuthorizationId, "w04_w03_authorization_id"],
    [w03.policyAuthorizationFingerprint, w04.w03AuthorizationFingerprint, "w04_w03_authorization_fingerprint"],
    [w03.policyActionId, w04.policyActionId, "w04_policy_action_id"],
    [w04.reservationId, w05.reservationId, "w05_reservation_id"],
    [w04.reservationFingerprint, w05.reservationFingerprint, "w05_reservation_fingerprint"],
    [w03.policyAuthorizationId, w05.w03AuthorizationId, "w05_w03_authorization_id"],
    [w03.policyAuthorizationFingerprint, w05.w03AuthorizationFingerprint, "w05_w03_authorization_fingerprint"],
    [w03.policyActionId, w05.policyActionId, "w05_policy_action_id"],
    [w02.target.resourceGid, w05.target.resourceGid, "w05_resource_gid"],
    [w02.target.targetUrl, w05.target.targetUrl, "w05_target_url"],
    [w02.target.field, w05.target.field, "w05_field"],
    [w02.before.fingerprint, w05.state.beforeFingerprint, "w05_before_fingerprint"],
    [w02.after.fingerprint, w05.state.afterFingerprint, "w05_after_fingerprint"],
  ];
  for (const [left, right, name] of comparisons) requireEqual(left, right, name);
}

function snapshotIssues(
  snapshot: P88W06DurableSnapshot,
  input: P88W06LineageInput,
): string[] {
  const issues: string[] = [];
  const expectedSnapshot = p88W06DurableSnapshotFingerprint({
    siteId: snapshot.siteId,
    reservation: snapshot.reservation,
    claim: snapshot.claim,
    control: snapshot.control,
  });
  if (expectedSnapshot !== snapshot.snapshotFingerprint) {
    issues.push("snapshot_fingerprint_mismatch");
  }

  const reservation = snapshot.reservation;
  const claim = snapshot.claim;
  const control = snapshot.control;
  const w01 = input.w01Evaluation;
  const w02 = input.w02Materialization;
  const w03 = input.w03Authorization;
  const w04 = input.w04Receipt;
  const w05 = input.w05ClaimReceipt;

  if (!reservation) {
    issues.push("w04_reservation_missing");
  } else {
    const checks: Array<[unknown, unknown, string]> = [
      [reservation.reservationId, w04.reservationId, "reservation_id"],
      [reservation.reservationFingerprint, w04.reservationFingerprint, "reservation_fingerprint"],
      [reservation.siteId, w05.siteId, "reservation_site_id"],
      [reservation.policyId, w01.policy.policyId, "policy_id"],
      [reservation.policyVersion, w01.policy.policyVersion, "policy_version"],
      [reservation.policyFingerprint, w01.policy.policyFingerprint, "policy_fingerprint"],
      [reservation.evaluationId, w01.evaluationId, "evaluation_id"],
      [reservation.evaluationFingerprint, w01.evaluationFingerprint, "evaluation_fingerprint"],
      [reservation.materializationId, w02.materializationId, "materialization_id"],
      [reservation.materializationFingerprint, w02.materializationFingerprint, "materialization_fingerprint"],
      [reservation.materializationIdempotencyFingerprint, w02.materializationIdempotencyFingerprint, "materialization_idempotency_fingerprint"],
      [reservation.proposalId, w02.proposalId, "proposal_id"],
      [reservation.proposalFingerprint, w02.proposalFingerprint, "proposal_fingerprint"],
      [reservation.recommendationFingerprint, w02.recommendation.recommendationFingerprint, "recommendation_fingerprint"],
      [reservation.recommendationIdempotencyKey, w02.recommendation.idempotencyKey, "recommendation_idempotency_key"],
      [reservation.targetBindingFingerprint, w02.target.targetBindingFingerprint, "target_binding_fingerprint"],
      [reservation.provider, w02.target.provider, "provider"],
      [reservation.domain, w02.target.domain, "domain"],
      [reservation.resourceKind, w02.target.resourceKind, "resource_kind"],
      [reservation.resourceGid, w02.target.resourceGid, "resource_gid"],
      [reservation.targetUrl, w02.target.targetUrl, "target_url"],
      [reservation.actionType, w02.target.actionType, "action_type"],
      [reservation.field, w02.target.field, "field"],
      [reservation.requiredProviderScope, w02.target.requiredProviderScope, "required_provider_scope"],
      [reservation.beforeFingerprint, w02.before.fingerprint, "before_fingerprint"],
      [reservation.afterFingerprint, w02.after.fingerprint, "after_fingerprint"],
      [reservation.w03AuthorizationId, w03.policyAuthorizationId, "w03_authorization_id"],
      [reservation.w03AuthorizationFingerprint, w03.policyAuthorizationFingerprint, "w03_authorization_fingerprint"],
      [reservation.policyActionId, w03.policyActionId, "policy_action_id"],
      [reservation.w03ReservationDescriptorFingerprint, w03.reservation.descriptorFingerprint, "reservation_descriptor_fingerprint"],
      [reservation.authorizedAt, w03.issuedAt, "authorized_at"],
      [reservation.expiresAt, w03.expiresAt, "expires_at"],
    ];
    for (const [left, right, name] of checks) {
      if (left !== right) issues.push("reservation_" + name + "_mismatch");
    }
    if (reservation.status !== "claimed") {
      issues.push("w04_reservation_not_claimed");
    }
  }

  if (!claim) {
    issues.push("w05_claim_missing");
  } else {
    const checks: Array<[unknown, unknown, string]> = [
      [claim.claimId, w05.claimId, "claim_id"],
      [claim.claimVersion, "p8-8-w05-control-claim-v1", "claim_version"],
      [claim.claimFingerprint, w05.claimFingerprint, "claim_fingerprint"],
      [claim.reservationId, w05.reservationId, "reservation_id"],
      [claim.reservationFingerprint, w05.reservationFingerprint, "reservation_fingerprint"],
      [claim.w03AuthorizationId, w05.w03AuthorizationId, "w03_authorization_id"],
      [claim.w03AuthorizationFingerprint, w05.w03AuthorizationFingerprint, "w03_authorization_fingerprint"],
      [claim.policyActionId, w05.policyActionId, "policy_action_id"],
      [claim.siteId, w05.siteId, "site_id"],
      [claim.controlRevision, w05.controlRevision, "control_revision"],
      [claim.controlFingerprint, w05.controlFingerprint, "control_fingerprint"],
      [claim.resourceGid, w05.target.resourceGid, "resource_gid"],
      [claim.targetUrl, w05.target.targetUrl, "target_url"],
      [claim.field, w05.target.field, "field"],
      [claim.beforeFingerprint, w05.state.beforeFingerprint, "before_fingerprint"],
      [claim.afterFingerprint, w05.state.afterFingerprint, "after_fingerprint"],
      [claim.claimedAt, w05.claimedAt, "claimed_at"],
    ];
    for (const [left, right, name] of checks) {
      if (left !== right) issues.push("claim_" + name + "_mismatch");
    }
  }

  if (!control) {
    issues.push("control_missing");
  } else {
    if (control.version !== P8_8_W05_CONTROL_VERSION) {
      issues.push("control_version_mismatch");
    }
    if (control.siteId !== w05.siteId) issues.push("control_site_id_mismatch");
  }

  return [...new Set(issues)].sort((a, b) => a.localeCompare(b));
}

function preflightExpiry(validatedAt: string, w03ExpiresAt: string): string {
  const validatedMs = Date.parse(canonicalIso(validatedAt, "p88_w06_validated_at_invalid"));
  const w03Ms = Date.parse(canonicalIso(w03ExpiresAt, "p88_w06_w03_expires_at_invalid"));
  return new Date(Math.min(
    validatedMs + P8_8_W06_MAX_PREFLIGHT_SECONDS * 1000,
    w03Ms,
  )).toISOString();
}

function proofFor(input: {
  preflightId: string;
  preflightFingerprint: string;
  lineage: P88W06LineageInput;
  finalSnapshot: P88W06DurableSnapshot;
  providerObservation: P88W06ProviderObservation;
  validatedAt: string;
  disposition: P88W06Disposition;
}): P88W06NoDispatchProof {
  const w03 = input.lineage.w03Authorization;
  const w04 = input.lineage.w04Receipt;
  const w05 = input.lineage.w05ClaimReceipt;
  const control = input.finalSnapshot.control;
  const base = {
    version: P8_8_W06_NO_DISPATCH_PROOF_VERSION,
    preflightId: input.preflightId,
    preflightFingerprint: input.preflightFingerprint,
    w03AuthorizationId: w03.policyAuthorizationId,
    w03AuthorizationFingerprint: w03.policyAuthorizationFingerprint,
    policyActionId: w03.policyActionId,
    reservationId: w04.reservationId,
    reservationFingerprint: w04.reservationFingerprint,
    claimId: w05.claimId,
    claimFingerprint: w05.claimFingerprint,
    target: w05.target,
    state: w05.state,
    control: {
      revision: control?.revision ?? null,
      fingerprint: control?.controlFingerprint ?? null,
      mode: control?.mode ?? null,
    },
    providerReadOutcome: input.providerObservation.status,
    validatedAt: input.validatedAt,
    disposition: input.disposition,
    executionPhase: "pre_dispatch_proven" as const,
    providerDispatchAttempted: false as const,
    providerMutationCalled: false as const,
    providerWritePerformed: false as const,
    publicSiteWritePerformed: false as const,
    task51ExecutionPerformed: false as const,
    task53ExecutionPerformed: false as const,
    task54ExecutionPerformed: false as const,
    rollbackWritePerformed: false as const,
    automaticTransition: false as const,
  };
  return deepFreeze({
    ...base,
    proofFingerprint: stableHash({
      purpose: "p8.8_w06_no_dispatch_proof",
      ...base,
    }),
  });
}

export function buildP88W06PolicyPreflight(input: {
  lineage: P88W06LineageInput;
  preSnapshot: P88W06DurableSnapshot;
  finalSnapshot: P88W06DurableSnapshot;
  providerObservation: P88W06ProviderObservation;
}): P88W06PolicyPreflight {
  assertP88W06ExactArtifactLineage(input.lineage);
  assertP88W06ProviderObservationIntegrity(input.providerObservation);

  const w01 = input.lineage.w01Evaluation;
  const w02 = input.lineage.w02Materialization;
  const w03 = input.lineage.w03Authorization;
  const w04 = input.lineage.w04Receipt;
  const w05 = input.lineage.w05ClaimReceipt;
  const finalSnapshot = input.finalSnapshot;
  const observation = input.providerObservation;

  canonicalIso(input.preSnapshot.databaseNow, "p88_w06_pre_snapshot_clock_invalid");
  const validatedAt = canonicalIso(
    finalSnapshot.databaseNow,
    "p88_w06_final_snapshot_clock_invalid",
  );

  const uncertainIssues = [
    ...snapshotIssues(input.preSnapshot, input.lineage),
    ...snapshotIssues(finalSnapshot, input.lineage),
  ];
  if (input.preSnapshot.snapshotFingerprint !== finalSnapshot.snapshotFingerprint) {
    uncertainIssues.push("durable_snapshot_changed");
  }
  if (input.preSnapshot.siteId !== finalSnapshot.siteId) {
    uncertainIssues.push("durable_snapshot_site_changed");
  }

  const blockers: string[] = [];
  const control = finalSnapshot.control;
  if (w01.policy.policyStage !== "single_action_canary") {
    blockers.push("policy_stage_not_single_action_canary");
  }
  if (!control) {
    blockers.push("control_missing");
  } else {
    if (control.mode !== "running") blockers.push("control_not_running");
    if (
      control.revision !== w05.controlRevision
      || control.controlFingerprint !== w05.controlFingerprint
    ) {
      blockers.push("control_epoch_changed");
    }
  }

  const validatedMs = Date.parse(validatedAt);
  if (Date.parse(w03.issuedAt) > validatedMs) {
    blockers.push("authorization_not_yet_issued");
  }
  if (Date.parse(w03.expiresAt) <= validatedMs) {
    blockers.push("authorization_expired");
  }

  if (observation.siteId !== w05.siteId) blockers.push("provider_site_mismatch");
  if (observation.resourceGid !== w05.target.resourceGid) {
    blockers.push("provider_resource_mismatch");
  }

  if (observation.status === "identity_mismatch") {
    blockers.push("provider_identity_mismatch");
  } else if (observation.status === "invalid_response") {
    blockers.push("provider_invalid_response");
  }

  if (observation.status === "observed") {
    const exactObservedFingerprint = p88W02StateFingerprint({
      target: w02.target,
      value: observation.rawValue,
      purpose: "before",
    });
    if (observation.observedBeforeFingerprint !== exactObservedFingerprint) {
      uncertainIssues.push("provider_observation_w02_fingerprint_invalid");
    }
    if (observation.rawValue === w02.after.value) {
      blockers.push("provider_already_at_proposed_after_state");
    }
    if (
      observation.rawValue !== w02.before.value
      || exactObservedFingerprint !== w02.before.fingerprint
    ) {
      blockers.push("provider_before_state_mismatch");
    }
  }

  const uniqueUncertain = [...new Set(uncertainIssues)]
    .sort((a, b) => a.localeCompare(b));
  const uniqueBlockers = [...new Set(blockers)]
    .sort((a, b) => a.localeCompare(b));

  let disposition: P88W06Disposition;
  if (uniqueUncertain.length > 0) {
    disposition = "state_uncertain";
  } else if (observation.status === "unavailable") {
    disposition = "provider_read_unavailable_no_dispatch";
    uniqueBlockers.push("provider_read_unavailable");
    uniqueBlockers.sort((a, b) => a.localeCompare(b));
  } else if (
    observation.status !== "observed"
    || uniqueBlockers.length > 0
  ) {
    disposition = "blocked_no_dispatch";
  } else {
    disposition = "ready_for_w07";
  }

  const allBlockers = [...new Set([...uniqueUncertain, ...uniqueBlockers])]
    .sort((a, b) => a.localeCompare(b));
  const claimReleaseEligibility: P88W06ClaimReleaseEligibility =
    disposition === "ready_for_w07"
      ? "retain_for_w07"
      : disposition === "state_uncertain"
        ? "not_releasable_uncertain"
        : "release_eligible_no_dispatch";

  const expiresAt = preflightExpiry(validatedAt, w03.expiresAt);
  if (
    disposition === "ready_for_w07"
    && Date.parse(expiresAt) <= Date.parse(validatedAt)
  ) {
    disposition = "blocked_no_dispatch";
    allBlockers.push("preflight_window_expired");
    allBlockers.sort((a, b) => a.localeCompare(b));
  }

  const safety = p88W06PreflightCapability();
  const preflightBase = {
    version: P8_8_W06_PREFLIGHT_VERSION,
    preflightProvenance: "policy_preflight" as const,
    disposition,
    blockers: allBlockers,
    lineage: {
      policyClass: P8_8_INITIAL_POLICY_CLASS,
      policyId: w01.policy.policyId,
      policyVersion: w01.policy.policyVersion,
      policyFingerprint: w01.policy.policyFingerprint,
      evaluationId: w01.evaluationId,
      evaluationFingerprint: w01.evaluationFingerprint,
      materializationId: w02.materializationId,
      materializationFingerprint: w02.materializationFingerprint,
      materializationIdempotencyFingerprint:
        w02.materializationIdempotencyFingerprint,
      proposalId: w02.proposalId,
      proposalFingerprint: w02.proposalFingerprint,
      recommendationFingerprint:
        w02.recommendation.recommendationFingerprint,
      recommendationIdempotencyKey: w02.recommendation.idempotencyKey,
      w03AuthorizationId: w03.policyAuthorizationId,
      w03AuthorizationFingerprint: w03.policyAuthorizationFingerprint,
      policyActionId: w03.policyActionId,
      reservationId: w04.reservationId,
      reservationFingerprint: w04.reservationFingerprint,
      claimId: w05.claimId,
      claimFingerprint: w05.claimFingerprint,
    },
    target: {
      siteId: w05.siteId,
      provider: "shopify" as const,
      domain: "diamondshelf.us" as const,
      resourceKind: "product" as const,
      resourceGid: w05.target.resourceGid,
      targetUrl: w05.target.targetUrl,
      actionType: "update_meta_description" as const,
      field: "meta_description" as const,
      requiredProviderScope: "write_products" as const,
      targetBindingFingerprint: w02.target.targetBindingFingerprint,
    },
    state: {
      beforeValue: w02.before.value,
      afterValue: w02.after.value,
      beforeFingerprint: w02.before.fingerprint,
      afterFingerprint: w02.after.fingerprint,
      observedBeforeFingerprint: observation.observedBeforeFingerprint,
    },
    claimedControl: {
      revision: w05.controlRevision,
      fingerprint: w05.controlFingerprint,
    },
    currentControl: {
      revision: control?.revision ?? null,
      fingerprint: control?.controlFingerprint ?? null,
      mode: control?.mode ?? null,
    },
    providerObservation: observation,
    preSnapshotFingerprint: input.preSnapshot.snapshotFingerprint,
    finalSnapshotFingerprint: finalSnapshot.snapshotFingerprint,
    validatedAt,
    preflightExpiresAt: expiresAt,
    claimReleaseEligibility:
      disposition === "ready_for_w07"
        ? "retain_for_w07" as const
        : disposition === "state_uncertain"
          ? "not_releasable_uncertain" as const
          : "release_eligible_no_dispatch" as const,
    safety,
  };

  const preflightFingerprint = stableHash({
    purpose: "p8.8_w06_policy_preflight",
    ...preflightBase,
  });
  const preflightId =
    "p88w06-preflight-" + preflightFingerprint.slice(0, 24);
  const noDispatchProof = proofFor({
    preflightId,
    preflightFingerprint,
    lineage: input.lineage,
    finalSnapshot,
    providerObservation: observation,
    validatedAt,
    disposition,
  });

  return deepFreeze({
    version: preflightBase.version,
    preflightProvenance: preflightBase.preflightProvenance,
    preflightId,
    preflightFingerprint,
    disposition,
    blockers: preflightBase.blockers,
    lineage: preflightBase.lineage,
    target: preflightBase.target,
    state: preflightBase.state,
    claimedControl: preflightBase.claimedControl,
    currentControl: preflightBase.currentControl,
    providerObservation: preflightBase.providerObservation,
    validatedAt: preflightBase.validatedAt,
    preflightExpiresAt: preflightBase.preflightExpiresAt,
    claimReleaseEligibility: preflightBase.claimReleaseEligibility,
    noDispatchProof,
    safety,
  });
}
