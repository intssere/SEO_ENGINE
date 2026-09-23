import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { executionStateFingerprint } from "./execution-foundation.js";
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
  assertP88W06ExactArtifactLineage,
  buildP88W06PolicyPreflight,
  buildP88W06ProviderObservation,
  p88W06DurableSnapshotFingerprint,
  type P88W06ControlSnapshot,
  type P88W06DurableSnapshot,
  type P88W06LineageInput,
} from "./p8-8-policy-preflight.js";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";

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

function fixture(options: {
  before?: string;
  after?: string;
  policyStage?: "shadow" | "single_action_canary";
} = {}) {
  const scenario = buildP88W04TestScenario({
    baseTime: "2026-09-23T12:00:00.000Z",
    productId: "600000001",
    handle: "w06-policy-preflight",
    subjectSuffix: "w06-" + (options.policyStage ?? "canary"),
    currentValue: options.before ?? "Before W06 exact bytes",
    proposedValue: options.after ?? "After W06 exact bytes",
    policyStage: options.policyStage,
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
    effectiveAt: "2026-09-23T11:59:00.000Z",
  }).state;
  const claimIntent = projectP88W05ClaimIntent({
    w03Authorization: w03,
    w04Receipt,
    control,
  });
  const claimedAt = "2026-09-23T11:59:30.000Z";
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
    receiptFingerprint: stableHash({
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
    databaseNow: "2026-09-23T12:00:00.000Z",
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

  return { scenario, lineage, snapshot, observation };
}

function withSnapshot(
  snapshot: P88W06DurableSnapshot,
  patch: Partial<Omit<P88W06DurableSnapshot, "snapshotFingerprint">>,
): P88W06DurableSnapshot {
  const next = {
    siteId: patch.siteId ?? snapshot.siteId,
    reservation: patch.reservation === undefined
      ? snapshot.reservation
      : patch.reservation,
    claim: patch.claim === undefined ? snapshot.claim : patch.claim,
    control: patch.control === undefined ? snapshot.control : patch.control,
    databaseNow: patch.databaseNow ?? snapshot.databaseNow,
  };
  return {
    ...next,
    snapshotFingerprint: p88W06DurableSnapshotFingerprint({
      siteId: next.siteId,
      reservation: next.reservation,
      claim: next.claim,
      control: next.control,
    }),
  };
}

test("W06 exact lineage + same running control epoch + byte-exact provider before state is ready only for W07 consideration", () => {
  const f = fixture();
  const result = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: f.snapshot,
    finalSnapshot: f.snapshot,
    providerObservation: f.observation,
  });

  assert.equal(result.disposition, "ready_for_w07");
  assert.equal(result.preflightProvenance, "policy_preflight");
  assert.equal(result.claimReleaseEligibility, "retain_for_w07");
  assert.deepEqual(result.blockers, []);
  assert.match(result.preflightId, /^p88w06-preflight-[0-9a-f]{24}$/);
  assert.equal(result.noDispatchProof.executionPhase, "pre_dispatch_proven");
  assert.equal(result.noDispatchProof.providerDispatchAttempted, false);
  assert.equal(result.noDispatchProof.providerMutationCalled, false);
  assert.equal(result.noDispatchProof.providerWritePerformed, false);
  assert.equal(result.noDispatchProof.rollbackWritePerformed, false);
  assert.equal(result.safety.providerDispatchAuthorized, false);
  assert.equal(result.safety.databaseWritePerformed, false);
  assert.ok(
    Date.parse(result.preflightExpiresAt) - Date.parse(result.validatedAt)
      <= 60_000,
  );

  const replay = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: f.snapshot,
    finalSnapshot: f.snapshot,
    providerObservation: f.observation,
  });
  assert.equal(replay.preflightFingerprint, result.preflightFingerprint);
  assert.equal(
    replay.noDispatchProof.proofFingerprint,
    result.noDispatchProof.proofFingerprint,
  );
});

test("W06 canonical rebuild fails closed on W01/W02/W03/W04/W05 tamper", () => {
  const f = fixture();

  assert.throws(
    () => assertP88W06ExactArtifactLineage({
      ...f.lineage,
      w01Evaluation: {
        ...f.lineage.w01Evaluation,
        evaluationId: "p88w01-eval-deadbeefdeadbeefdeadbeef",
      },
    }),
    /p88_w06_w01_integrity_mismatch/,
  );
  assert.throws(
    () => assertP88W06ExactArtifactLineage({
      ...f.lineage,
      w02Materialization: {
        ...f.lineage.w02Materialization,
        proposalId: "p88w02-proposal-deadbeefdeadbeefdeadbeef",
      },
    }),
    /p88_w06_w02_integrity_mismatch/,
  );
  assert.throws(
    () => assertP88W06ExactArtifactLineage({
      ...f.lineage,
      w03Authorization: {
        ...f.lineage.w03Authorization,
        policyActionId: "p88w03-action-deadbeefdeadbeefdeadbeef",
      },
    }),
    /p88_w06_w03_integrity_mismatch/,
  );
  assert.throws(
    () => assertP88W06ExactArtifactLineage({
      ...f.lineage,
      w04Receipt: {
        ...f.lineage.w04Receipt,
        reservationFingerprint: "b".repeat(64),
      },
    }),
    /p88_w04_durable_receipt_integrity_mismatch/,
  );
  assert.throws(
    () => assertP88W06ExactArtifactLineage({
      ...f.lineage,
      w05ClaimReceipt: {
        ...f.lineage.w05ClaimReceipt,
        claimFingerprint: "c".repeat(64),
      },
    }),
    /p88_w06_w05_claim_receipt_integrity_mismatch/,
  );
});

test("W04 claimed without exact W05 claim is state-uncertain and never release-eligible", () => {
  const f = fixture();
  const missingClaim = withSnapshot(f.snapshot, { claim: null });
  const result = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: missingClaim,
    finalSnapshot: missingClaim,
    providerObservation: f.observation,
  });
  assert.equal(result.disposition, "state_uncertain");
  assert.equal(result.claimReleaseEligibility, "not_releasable_uncertain");
  assert.ok(result.blockers.includes("w05_claim_missing"));
});

for (const mode of ["paused", "draining", "drained", "killed"] as const) {
  test("W06 blocks forward progression under durable control mode " + mode, () => {
    const f = fixture();
    const later = withSnapshot(f.snapshot, {
      control: {
        ...f.snapshot.control!,
        revision: 2,
        mode,
        previousControlFingerprint:
          f.snapshot.control!.controlFingerprint,
        controlFingerprint: stableHash({ mode, revision: 2 }),
        effectiveAt: "2026-09-23T12:00:01.000Z",
        updatedAt: "2026-09-23T12:00:01.000Z",
      },
    });
    const result = buildP88W06PolicyPreflight({
      lineage: f.lineage,
      preSnapshot: later,
      finalSnapshot: later,
      providerObservation: f.observation,
    });
    assert.equal(result.disposition, "blocked_no_dispatch");
    assert.equal(result.claimReleaseEligibility, "release_eligible_no_dispatch");
    assert.ok(result.blockers.includes("control_not_running"));
    assert.ok(result.blockers.includes("control_epoch_changed"));
  });
}

test("later running revision does not revive an old W05 claim epoch", () => {
  const f = fixture();
  const later = withSnapshot(f.snapshot, {
    control: {
      ...f.snapshot.control!,
      revision: 3,
      mode: "running",
      previousControlFingerprint: "d".repeat(64),
      controlFingerprint: "e".repeat(64),
      effectiveAt: "2026-09-23T12:00:02.000Z",
      updatedAt: "2026-09-23T12:00:02.000Z",
    },
  });
  const result = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: later,
    finalSnapshot: later,
    providerObservation: f.observation,
  });
  assert.equal(result.disposition, "blocked_no_dispatch");
  assert.ok(result.blockers.includes("control_epoch_changed"));
});

test("shadow policy stage is observation-only and cannot become ready", () => {
  const f = fixture({ policyStage: "shadow" });
  const result = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: f.snapshot,
    finalSnapshot: f.snapshot,
    providerObservation: f.observation,
  });
  assert.equal(result.disposition, "blocked_no_dispatch");
  assert.ok(result.blockers.includes("policy_stage_not_single_action_canary"));
});

test("database validation clock, not caller wall clock, closes expired W03 authorization", () => {
  const f = fixture();
  const expired = withSnapshot(f.snapshot, {
    databaseNow: f.lineage.w03Authorization.expiresAt,
  });
  const result = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: expired,
    finalSnapshot: expired,
    providerObservation: f.observation,
  });
  assert.equal(result.disposition, "blocked_no_dispatch");
  assert.ok(result.blockers.includes("authorization_expired"));
});

test("provider unavailable remains unavailable and only projects later no-dispatch release eligibility", () => {
  const f = fixture();
  const unavailable = buildP88W06ProviderObservation({
    status: "unavailable",
    siteId: f.lineage.w05ClaimReceipt.siteId,
    provider: "shopify",
    resourceKind: "product",
    resourceGid: f.lineage.w05ClaimReceipt.target.resourceGid,
    field: "meta_description",
    rawValue: null,
    observedBeforeFingerprint: null,
    requestProvenanceFingerprint: null,
    errorCategory: "shopify_network_unavailable",
  });
  const result = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: f.snapshot,
    finalSnapshot: f.snapshot,
    providerObservation: unavailable,
  });
  assert.equal(result.disposition, "provider_read_unavailable_no_dispatch");
  assert.equal(result.claimReleaseEligibility, "release_eligible_no_dispatch");
  assert.equal(result.noDispatchProof.providerWritePerformed, false);
});

test("provider identity mismatch, proposed-after state, and third state all fail closed without rollback", () => {
  const f = fixture();
  const identity = buildP88W06ProviderObservation({
    status: "identity_mismatch",
    siteId: f.lineage.w05ClaimReceipt.siteId,
    provider: "shopify",
    resourceKind: "product",
    resourceGid: f.lineage.w05ClaimReceipt.target.resourceGid,
    field: "meta_description",
    rawValue: null,
    observedBeforeFingerprint: null,
    requestProvenanceFingerprint: "a".repeat(64),
    errorCategory: "shopify_product_identity_mismatch",
  });
  assert.equal(
    buildP88W06PolicyPreflight({
      lineage: f.lineage,
      preSnapshot: f.snapshot,
      finalSnapshot: f.snapshot,
      providerObservation: identity,
    }).disposition,
    "blocked_no_dispatch",
  );

  for (const value of [
    f.lineage.w02Materialization.after.value,
    "Third external state",
  ]) {
    const observation = buildP88W06ProviderObservation({
      status: "observed",
      siteId: f.lineage.w05ClaimReceipt.siteId,
      provider: "shopify",
      resourceKind: "product",
      resourceGid: f.lineage.w05ClaimReceipt.target.resourceGid,
      field: "meta_description",
      rawValue: value,
      observedBeforeFingerprint: p88W02StateFingerprint({
        target: f.lineage.w02Materialization.target,
        value,
        purpose: "before",
      }),
      requestProvenanceFingerprint: "a".repeat(64),
      errorCategory: null,
    });
    const result = buildP88W06PolicyPreflight({
      lineage: f.lineage,
      preSnapshot: f.snapshot,
      finalSnapshot: f.snapshot,
      providerObservation: observation,
    });
    assert.equal(result.disposition, "blocked_no_dispatch");
    assert.equal(result.noDispatchProof.rollbackWritePerformed, false);
    assert.equal(result.safety.rollbackWritePerformed, false);
  }
});

test("W06 byte-exact W02 state domain rejects whitespace drift even when Task53 normalized fingerprint collapses it", () => {
  const f = fixture({ before: "Before  W06 exact bytes" });
  const normalizedDrift = "Before W06 exact bytes";
  assert.equal(
    executionStateFingerprint("meta_description", f.lineage.w02Materialization.before.value),
    executionStateFingerprint("meta_description", normalizedDrift),
  );

  const observation = buildP88W06ProviderObservation({
    status: "observed",
    siteId: f.lineage.w05ClaimReceipt.siteId,
    provider: "shopify",
    resourceKind: "product",
    resourceGid: f.lineage.w05ClaimReceipt.target.resourceGid,
    field: "meta_description",
    rawValue: normalizedDrift,
    observedBeforeFingerprint: p88W02StateFingerprint({
      target: f.lineage.w02Materialization.target,
      value: normalizedDrift,
      purpose: "before",
    }),
    requestProvenanceFingerprint: "a".repeat(64),
    errorCategory: null,
  });
  const result = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: f.snapshot,
    finalSnapshot: f.snapshot,
    providerObservation: observation,
  });
  assert.equal(result.disposition, "blocked_no_dispatch");
  assert.ok(result.blockers.includes("provider_before_state_mismatch"));
});

test("durable state change across provider read fails closed as uncertain", () => {
  const f = fixture();
  const finalSnapshot = withSnapshot(f.snapshot, {
    control: {
      ...f.snapshot.control!,
      revision: 2,
      mode: "paused",
      previousControlFingerprint: f.snapshot.control!.controlFingerprint,
      controlFingerprint: "f".repeat(64),
      effectiveAt: "2026-09-23T12:00:01.000Z",
      updatedAt: "2026-09-23T12:00:01.000Z",
    },
    databaseNow: "2026-09-23T12:00:01.000Z",
  });
  const result = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: f.snapshot,
    finalSnapshot,
    providerObservation: f.observation,
  });
  assert.equal(result.disposition, "state_uncertain");
  assert.equal(result.claimReleaseEligibility, "not_releasable_uncertain");
  assert.ok(result.blockers.includes("durable_snapshot_changed"));
});

test("W06 artifact remains structurally incompatible with human Task #51/#54 authority", () => {
  const f = fixture();
  const result = buildP88W06PolicyPreflight({
    lineage: f.lineage,
    preSnapshot: f.snapshot,
    finalSnapshot: f.snapshot,
    providerObservation: f.observation,
  });
  const object = result as unknown as Record<string, unknown>;
  assert.notEqual(result.version, "controlled_execution_foundation_v1");
  assert.equal(Object.prototype.hasOwnProperty.call(object, "approvalId"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(object, "approvalDecision"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(object, "task54Confirmation"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(object, "executionAuthorized"), false);
});

test("W06 runtime sources remain mutation-free, route-free and worker-free", async () => {
  const pure = await readFile(
    new URL("./p8-8-policy-preflight.ts", import.meta.url),
    "utf8",
  );
  const store = await readFile(
    new URL("./p8-8-policy-preflight-store.ts", import.meta.url),
    "utf8",
  );
  const provider = await readFile(
    new URL("./p8-8-policy-preflight-shopify-read.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(pure, /task54-persistent-apply/);
  assert.doesNotMatch(provider, /mutateTask53ShopifyState/);
  assert.doesNotMatch(provider, /task54-persistent-apply/);
  assert.doesNotMatch(provider, /\bmutation\s+[A-Za-z_]/);
  assert.doesNotMatch(provider, /process\.env/);
  assert.doesNotMatch(provider, /PUBLIC_SITE_WRITES_ENABLED/);
  assert.doesNotMatch(store, /process\.env\.DATABASE_URL/);
  assert.doesNotMatch(
    store,
    /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE)\b/i,
  );
  assert.doesNotMatch(pure + provider + store, /router\.|express\s*\(/);
  assert.doesNotMatch(pure + provider + store, /scheduler.*dispatch/i);
  assert.doesNotMatch(pure + provider + store, /worker.*dispatch/i);
});
