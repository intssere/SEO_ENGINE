import assert from "node:assert/strict";
import test from "node:test";
import {
  p88W02StateFingerprint,
} from "./p8-8-governed-proposal-materialization.js";
import {
  readP88W06ShopifyProductSeo,
  runP88W06PolicyPreflight,
  type P88W06ShopifyReadCredential,
} from "./p8-8-policy-preflight-shopify-read.js";
import {
  buildP88W06ProviderObservation,
  p88W06DurableSnapshotFingerprint,
  type P88W06DurableSnapshot,
  type P88W06LineageInput,
} from "./p8-8-policy-preflight.js";
import {
  P8_8_W04_DURABLE_RECEIPT_VERSION,
  projectP88W04DurableReceipt,
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
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";
import { createHash } from "node:crypto";

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

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function fixture() {
  const scenario = buildP88W04TestScenario({
    baseTime: "2026-09-23T12:00:00.000Z",
    productId: "610000001",
    handle: "w06-shopify-read",
    subjectSuffix: "w06-shopify-read",
    currentValue: "Raw  before\nbytes",
    proposedValue: "After W06 read",
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
  const w04Receipt = projectP88W04DurableReceipt(row);
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
    receiptFingerprint: hash({
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
  const snapshotState = {
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
    control: {
      version: P8_8_W05_CONTROL_VERSION,
      siteId: control.siteId,
      revision: control.revision,
      previousControlFingerprint: control.previousControlFingerprint,
      mode: control.mode,
      effectiveAt: control.effectiveAt,
      controlFingerprint: control.controlFingerprint,
      updatedAt: control.effectiveAt,
    },
  };
  const snapshot: P88W06DurableSnapshot = {
    ...snapshotState,
    databaseNow: "2026-09-23T12:00:00.000Z",
    snapshotFingerprint: p88W06DurableSnapshotFingerprint(snapshotState),
  };
  const credential: P88W06ShopifyReadCredential = {
    siteId: intent.siteId,
    shopDomain: "diamond-shelf-test.myshopify.com",
    accessToken: "synthetic-read-token",
    scopes: ["read_products"],
    readOnly: true,
  };
  return { scenario, lineage, snapshot, credential };
}

function response(body: unknown, status = 200, requestId = "req-w06-1"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
    },
  });
}

test("W06 Shopify adapter performs query-only injected read and preserves raw bytes", async () => {
  const f = fixture();
  let capturedBody = "";
  let capturedUrl = "";
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedBody = String(init?.body ?? "");
    return response({
      data: {
        node: {
          __typename: "Product",
          id: f.lineage.w02Materialization.target.resourceGid,
          seo: { description: "Raw  before\nbytes" },
        },
      },
    });
  };
  const observation = await readP88W06ShopifyProductSeo({
    credential: f.credential,
    target: f.lineage.w02Materialization.target,
    fetchImpl,
  });

  assert.equal(observation.status, "observed");
  assert.equal(observation.rawValue, "Raw  before\nbytes");
  assert.equal(
    observation.observedBeforeFingerprint,
    p88W02StateFingerprint({
      target: f.lineage.w02Materialization.target,
      value: "Raw  before\nbytes",
      purpose: "before",
    }),
  );
  assert.match(capturedUrl, /\/graphql\.json$/);
  assert.match(capturedBody, /query SeoEngineW06ProductSeoRead/);
  assert.doesNotMatch(capturedBody, /mutation\s/i);
  assert.doesNotMatch(capturedBody, /synthetic-read-token/);
  assert.equal(observation.providerMutationCalled, false);
  assert.equal(observation.providerWritePerformed, false);
});

test("W06 Shopify adapter classifies identity mismatch and transport unavailable without writes", async () => {
  const f = fixture();
  const mismatch = await readP88W06ShopifyProductSeo({
    credential: f.credential,
    target: f.lineage.w02Materialization.target,
    fetchImpl: async () => response({
      data: {
        node: {
          __typename: "Product",
          id: "gid://shopify/Product/999999999",
          seo: { description: "Raw  before\nbytes" },
        },
      },
    }),
  });
  assert.equal(mismatch.status, "identity_mismatch");
  assert.equal(mismatch.providerWritePerformed, false);

  const unavailable = await readP88W06ShopifyProductSeo({
    credential: f.credential,
    target: f.lineage.w02Materialization.target,
    fetchImpl: async () => {
      throw new Error("synthetic network failure");
    },
  });
  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.errorCategory, "shopify_network_unavailable");
  assert.equal(unavailable.providerWritePerformed, false);
});

test("W06 Shopify adapter rejects write-capable credentials", async () => {
  const f = fixture();
  await assert.rejects(
    readP88W06ShopifyProductSeo({
      credential: {
        ...f.credential,
        scopes: ["read_products", "write_products"],
      },
      target: f.lineage.w02Materialization.target,
      fetchImpl: async () => {
        throw new Error("must not be reached");
      },
    }),
    /p88_w06_read_credential_not_least_privilege/,
  );
});

test("W06 orchestrator uses two durable snapshots around one provider read", async () => {
  const f = fixture();
  let reads = 0;
  let providerReads = 0;
  const result = await runP88W06PolicyPreflight({
    lineage: f.lineage,
    snapshotReader: {
      async readSnapshot() {
        reads += 1;
        return f.snapshot;
      },
    },
    credential: f.credential,
    fetchImpl: async () => {
      providerReads += 1;
      return response({
        data: {
          node: {
            __typename: "Product",
            id: f.lineage.w02Materialization.target.resourceGid,
            seo: { description: f.lineage.w02Materialization.before.value },
          },
        },
      });
    },
  });

  assert.equal(reads, 2);
  assert.equal(providerReads, 1);
  assert.equal(result.disposition, "ready_for_w07");
  assert.equal(result.noDispatchProof.providerDispatchAttempted, false);
});

test("W06 orchestrator skips provider read when durable pre-snapshot is uncertain", async () => {
  const f = fixture();
  const state = {
    siteId: f.snapshot.siteId,
    reservation: f.snapshot.reservation,
    claim: null,
    control: f.snapshot.control,
  };
  const uncertain: P88W06DurableSnapshot = {
    ...state,
    databaseNow: f.snapshot.databaseNow,
    snapshotFingerprint: p88W06DurableSnapshotFingerprint(state),
  };
  let providerReads = 0;
  const result = await runP88W06PolicyPreflight({
    lineage: f.lineage,
    snapshotReader: {
      async readSnapshot() {
        return uncertain;
      },
    },
    credential: f.credential,
    fetchImpl: async () => {
      providerReads += 1;
      return response({});
    },
  });

  assert.equal(providerReads, 0);
  assert.equal(result.disposition, "state_uncertain");
  assert.equal(result.claimReleaseEligibility, "not_releasable_uncertain");
});

test("provider observation builder cannot turn a detached fingerprint into success", () => {
  const f = fixture();
  const detached = buildP88W06ProviderObservation({
    status: "observed",
    siteId: f.lineage.w05ClaimReceipt.siteId,
    provider: "shopify",
    resourceKind: "product",
    resourceGid: f.lineage.w05ClaimReceipt.target.resourceGid,
    field: "meta_description",
    rawValue: f.lineage.w02Materialization.before.value,
    observedBeforeFingerprint: "f".repeat(64),
    requestProvenanceFingerprint: "a".repeat(64),
    errorCategory: null,
  });
  assert.notEqual(
    detached.observedBeforeFingerprint,
    p88W02StateFingerprint({
      target: f.lineage.w02Materialization.target,
      value: f.lineage.w02Materialization.before.value,
      purpose: "before",
    }),
  );
});
