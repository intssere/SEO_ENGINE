import {
  p88W02StateFingerprint,
} from "./p8-8-governed-proposal-materialization.js";
import {
  P8_8_W04_DURABLE_RECEIPT_VERSION,
  projectP88W04DurableReceipt,
  type P88W04DurableReservationReceipt,
} from "./p8-8-reservation-store.js";
import {
  P8_8_W05_CLAIM_RECEIPT_VERSION,
  type P88W05ClaimReceipt,
} from "./p8-8-mutation-control-store.js";
import {
  P8_8_W05_CLAIM_VERSION,
  P8_8_W05_CONTROL_VERSION,
  initializeP88W05ControlState,
  projectP88W05ClaimIntent,
} from "./p8-8-mutation-control.js";
import {
  buildP88W06PolicyPreflight,
  buildP88W06ProviderObservation,
  p88W06DurableSnapshotFingerprint,
  type P88W06ControlSnapshot,
  type P88W06DurableSnapshot,
  type P88W06LineageInput,
} from "./p8-8-policy-preflight.js";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";
import {
  p88W07StableHash,
  projectP88W07ExecutionIntent,
  type P88W07DispatchEligibility,
  type P88W07W06Handoff,
} from "./p8-8-policy-single-action-apply.js";

export function buildP88W07TestFixture(options: {
  siteId?: string;
  baseTime?: string;
  productId?: string;
  handle?: string;
  subjectSuffix?: string;
  before?: string;
  after?: string;
} = {}) {
  const baseTime = options.baseTime ?? "2026-09-23T12:00:00.000Z";
  const scenario = buildP88W04TestScenario({
    siteId: options.siteId,
    baseTime,
    productId: options.productId ?? "700000001",
    handle: options.handle ?? "w07-policy-apply",
    subjectSuffix: options.subjectSuffix ?? "w07-policy-apply",
    currentValue: options.before ?? "Before  W07 exact\nbytes",
    proposedValue: options.after ?? "After  W07 exact\nbytes",
    policyStage: "single_action_canary",
  });
  const intent = scenario.input.intent;
  const w03 = scenario.input.w03Authorization;

  const row: Parameters<typeof projectP88W04DurableReceipt>[0] = {
    reservation_id: intent.reservationId,
    reservation_version: P8_8_W04_DURABLE_RECEIPT_VERSION,
    reservation_class: "shopify.product.seo.meta_description",
    reservation_fingerprint: intent.reservationFingerprint,
    site_id: intent.siteId,
    policy_id: intent.policy.policyId,
    policy_version: intent.policy.policyVersion,
    policy_fingerprint: intent.policy.policyFingerprint,
    evaluation_id: intent.evaluation.evaluationId,
    evaluation_fingerprint: intent.evaluation.evaluationFingerprint,
    materialization_id: intent.materialization.materializationId,
    materialization_fingerprint: intent.materialization.materializationFingerprint,
    materialization_idempotency_fingerprint:
      intent.materialization.materializationIdempotencyFingerprint,
    proposal_id: intent.proposal.proposalId,
    proposal_fingerprint: intent.proposal.proposalFingerprint,
    recommendation_fingerprint: intent.recommendation.recommendationFingerprint,
    recommendation_idempotency_key:
      intent.recommendation.recommendationIdempotencyKey,
    target_binding_fingerprint: intent.target.targetBindingFingerprint,
    provider: intent.target.provider,
    domain: intent.target.domain,
    resource_kind: intent.target.resourceKind,
    resource_gid: intent.target.resourceGid,
    target_url: intent.target.targetUrl,
    action_type: intent.target.actionType,
    field: intent.target.field,
    required_provider_scope: intent.target.requiredProviderScope,
    before_fingerprint: intent.state.beforeFingerprint,
    after_fingerprint: intent.state.afterFingerprint,
    w03_authorization_id: w03.policyAuthorizationId,
    w03_authorization_fingerprint: w03.policyAuthorizationFingerprint,
    policy_action_id: w03.policyActionId,
    w03_reservation_descriptor_fingerprint: w03.reservation.descriptorFingerprint,
    status: "authorized",
    authorized_at: new Date(w03.issuedAt),
    expires_at: new Date(w03.expiresAt),
    claimed_at: null,
    terminal_at: null,
    terminal_reason: null,
  };
  const w04Receipt: P88W04DurableReservationReceipt =
    projectP88W04DurableReceipt(row);

  const control = initializeP88W05ControlState({
    siteId: intent.siteId,
    mode: "running",
    effectiveAt: new Date(Date.parse(baseTime) - 60_000).toISOString(),
  }).state;
  const claimIntent = projectP88W05ClaimIntent({
    w03Authorization: w03,
    w04Receipt,
    control,
  });
  const claimedAt = new Date(Date.parse(baseTime) - 30_000).toISOString();
  const claimBase = {
    version: P8_8_W05_CLAIM_RECEIPT_VERSION,
    claimId: claimIntent.claimId,
    claimFingerprint: claimIntent.claimFingerprint,
    reservationId: claimIntent.reservationId,
    reservationFingerprint: claimIntent.reservationFingerprint,
    w03AuthorizationId: claimIntent.w03AuthorizationId,
    w03AuthorizationFingerprint: claimIntent.w03AuthorizationFingerprint,
    policyActionId: claimIntent.policyActionId,
    siteId: claimIntent.siteId,
    controlRevision: claimIntent.controlRevision,
    controlFingerprint: claimIntent.controlFingerprint,
    target: claimIntent.target,
    state: claimIntent.state,
    claimedAt,
    durable: true as const,
    providerDispatchAuthorized: false as const,
    providerWriteAllowed: false as const,
    publicSiteWrites: false as const,
  };
  const w05ClaimReceipt: P88W05ClaimReceipt = Object.freeze({
    ...claimBase,
    receiptFingerprint: p88W07StableHash({
      purpose: "p8.8_w05_claim_receipt",
      ...claimBase,
    }),
  });

  const lineage: P88W06LineageInput = {
    w01EvaluationInput: scenario.intentInput.w01EvaluationInput,
    w01Evaluation: scenario.intentInput.w01Evaluation,
    w02MaterializationInput: scenario.intentInput.w02MaterializationInput,
    w02Materialization: scenario.intentInput.w02Materialization,
    w03Input: scenario.w03Input,
    w03Authorization: w03,
    w04Receipt,
    w05ClaimReceipt,
  };

  const controlSnapshot: P88W06ControlSnapshot = {
    version: P8_8_W05_CONTROL_VERSION,
    siteId: control.siteId,
    revision: control.revision,
    previousControlFingerprint: control.previousControlFingerprint,
    mode: control.mode,
    effectiveAt: control.effectiveAt,
    controlFingerprint: control.controlFingerprint,
    updatedAt: control.effectiveAt,
  };

  const state = {
    siteId: intent.siteId,
    reservation: {
      reservationId: intent.reservationId,
      reservationVersion: P8_8_W04_DURABLE_RECEIPT_VERSION,
      reservationClass: "shopify.product.seo.meta_description",
      reservationFingerprint: intent.reservationFingerprint,
      siteId: intent.siteId,
      policyId: intent.policy.policyId,
      policyVersion: intent.policy.policyVersion,
      policyFingerprint: intent.policy.policyFingerprint,
      evaluationId: intent.evaluation.evaluationId,
      evaluationFingerprint: intent.evaluation.evaluationFingerprint,
      materializationId: intent.materialization.materializationId,
      materializationFingerprint: intent.materialization.materializationFingerprint,
      materializationIdempotencyFingerprint:
        intent.materialization.materializationIdempotencyFingerprint,
      proposalId: intent.proposal.proposalId,
      proposalFingerprint: intent.proposal.proposalFingerprint,
      recommendationFingerprint: intent.recommendation.recommendationFingerprint,
      recommendationIdempotencyKey:
        intent.recommendation.recommendationIdempotencyKey,
      targetBindingFingerprint: intent.target.targetBindingFingerprint,
      provider: intent.target.provider,
      domain: intent.target.domain,
      resourceKind: intent.target.resourceKind,
      resourceGid: intent.target.resourceGid,
      targetUrl: intent.target.targetUrl,
      actionType: intent.target.actionType,
      field: intent.target.field,
      requiredProviderScope: intent.target.requiredProviderScope,
      beforeFingerprint: intent.state.beforeFingerprint,
      afterFingerprint: intent.state.afterFingerprint,
      w03AuthorizationId: w03.policyAuthorizationId,
      w03AuthorizationFingerprint: w03.policyAuthorizationFingerprint,
      policyActionId: w03.policyActionId,
      w03ReservationDescriptorFingerprint: w03.reservation.descriptorFingerprint,
      status: "claimed" as const,
      authorizedAt: w03.issuedAt,
      expiresAt: w03.expiresAt,
      claimedAt,
      terminalAt: null,
      terminalReason: null,
      updatedAt: claimedAt,
    },
    claim: {
      claimId: claimIntent.claimId,
      claimVersion: P8_8_W05_CLAIM_VERSION,
      claimFingerprint: claimIntent.claimFingerprint,
      reservationId: claimIntent.reservationId,
      reservationFingerprint: claimIntent.reservationFingerprint,
      w03AuthorizationId: claimIntent.w03AuthorizationId,
      w03AuthorizationFingerprint: claimIntent.w03AuthorizationFingerprint,
      policyActionId: claimIntent.policyActionId,
      siteId: claimIntent.siteId,
      controlRevision: claimIntent.controlRevision,
      controlFingerprint: claimIntent.controlFingerprint,
      resourceGid: claimIntent.target.resourceGid,
      targetUrl: claimIntent.target.targetUrl,
      field: claimIntent.target.field,
      beforeFingerprint: claimIntent.state.beforeFingerprint,
      afterFingerprint: claimIntent.state.afterFingerprint,
      claimedAt,
      createdAt: claimedAt,
    },
    control: controlSnapshot,
  };
  const snapshot: P88W06DurableSnapshot = {
    ...state,
    databaseNow: baseTime,
    snapshotFingerprint: p88W06DurableSnapshotFingerprint(state),
  };

  const w02 = lineage.w02Materialization;
  const observation = buildP88W06ProviderObservation({
    status: "observed",
    siteId: intent.siteId,
    provider: "shopify",
    resourceKind: "product",
    resourceGid: intent.target.resourceGid,
    field: "meta_description",
    rawValue: w02.before.value,
    observedBeforeFingerprint: p88W02StateFingerprint({
      target: w02.target,
      value: w02.before.value,
      purpose: "before",
    }),
    requestProvenanceFingerprint: "a".repeat(64),
    errorCategory: null,
  });

  const preflight = buildP88W06PolicyPreflight({
    lineage,
    preSnapshot: snapshot,
    finalSnapshot: snapshot,
    providerObservation: observation,
  });
  const handoff: P88W07W06Handoff = {
    lineage,
    preSnapshot: snapshot,
    finalSnapshot: snapshot,
    providerObservation: observation,
    preflight,
  };
  const executionIntent = projectP88W07ExecutionIntent(handoff);
  const eligibility: P88W07DispatchEligibility = {
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    quotaAvailable: true,
    sameTargetCooldownSatisfied: true,
    noHumanExecutionConflict: true,
    credentialProfileId:
      scenario.intentInput.w01EvaluationInput.grant.credentialProfileId,
    credentialScopes: ["write_products"],
  };

  return {
    scenario,
    lineage,
    snapshot,
    observation,
    preflight,
    handoff,
    executionIntent,
    eligibility,
  };
}
