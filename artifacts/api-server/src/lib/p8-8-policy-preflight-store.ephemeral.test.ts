import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { createHash } from "node:crypto";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";
import { projectP88W04DurableReceipt } from "./p8-8-reservation-store.js";
import { P88W05MutationControlStore } from "./p8-8-mutation-control-store.js";
import {
  buildP88W06PolicyPreflight,
  buildP88W06ProviderObservation,
  p88W06DurableSnapshotIssues,
} from "./p8-8-policy-preflight.js";
import { P88W06SnapshotStore } from "./p8-8-policy-preflight-store.js";
import { p88W02StateFingerprint } from "./p8-8-governed-proposal-materialization.js";

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P8_8_W06_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p88_w06_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p88_w06_ephemeral_database_name_invalid");
  }
  return raw;
}

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort().map((key) =>
    JSON.stringify(key) + ":" + stableJson(object[key])
  ).join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

test("P8.8 W06 read-only snapshot and race certification uses dedicated 41-table localhost DB only", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P8_8_W06_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }

  const admin = postgres(databaseUrl, {
    max: 6,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 2,
  });
  t.after(async () => {
    await admin.end({ timeout: 1 }).catch(() => undefined);
  });

  const counts = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(counts[0]?.count, 41);

  const sites = await admin.unsafe<{ id: string }[]>(
    "SELECT id::text AS id FROM sites "
      + "WHERE lower(domain)='diamondshelf.us' "
      + "AND canonical_origin='https://diamondshelf.us' "
      + "AND platform='shopify' AND is_active=true "
      + "ORDER BY created_at LIMIT 1",
  );
  const siteId = sites[0]?.id;
  assert.ok(siteId);

  const nowRows = await admin.unsafe<{ now: Date }[]>(
    "SELECT transaction_timestamp() AS now",
  );
  const now = nowRows[0]?.now;
  assert.ok(now instanceof Date);

  await admin.unsafe("DELETE FROM policy_mutation_claims");
  await admin.unsafe("DELETE FROM policy_mutation_control_events");
  await admin.unsafe("DELETE FROM policy_mutation_control_state");
  await admin.unsafe("DELETE FROM policy_mutation_reservations");

  const governance = async () => {
    const rows = await admin.unsafe<
      { approvals: number; actions: number; deployments: number }[]
    >(
      "SELECT "
        + "(SELECT COUNT(*)::int FROM approvals) AS approvals,"
        + "(SELECT COUNT(*)::int FROM actions) AS actions,"
        + "(SELECT COUNT(*)::int FROM deployments) AS deployments",
    );
    return rows[0]!;
  };

  const scenario = buildP88W04TestScenario({
    siteId,
    baseTime: now.toISOString(),
    productId: "620000001",
    handle: "w06-postgres-read-only",
    subjectSuffix: "w06-postgres-read-only",
    currentValue: "Before W06 PostgreSQL",
    proposedValue: "After W06 PostgreSQL",
  });

  const intent = scenario.input.intent;
  const w03 = scenario.input.w03Authorization;
  await admin.unsafe(
    "INSERT INTO policy_mutation_reservations ("
      + "reservation_id,reservation_version,reservation_class,"
      + "reservation_fingerprint,site_id,policy_id,policy_version,"
      + "policy_fingerprint,evaluation_id,evaluation_fingerprint,"
      + "materialization_id,materialization_fingerprint,"
      + "materialization_idempotency_fingerprint,proposal_id,"
      + "proposal_fingerprint,recommendation_fingerprint,"
      + "recommendation_idempotency_key,target_binding_fingerprint,"
      + "provider,domain,resource_kind,resource_gid,target_url,action_type,"
      + "field,required_provider_scope,before_fingerprint,after_fingerprint,"
      + "w03_authorization_id,w03_authorization_fingerprint,policy_action_id,"
      + "w03_reservation_descriptor_fingerprint,status,authorized_at,expires_at"
      + ") VALUES ("
      + "$1,$2,$3,$4,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,"
      + "$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,"
      + "'authorized',$33::timestamptz,$34::timestamptz"
      + ")",
    [
      intent.reservationId,
      "p8-8-w04-durable-reservation-v1",
      "shopify.product.seo.meta_description",
      intent.reservationFingerprint,
      intent.siteId,
      intent.policy.policyId,
      intent.policy.policyVersion,
      intent.policy.policyFingerprint,
      intent.evaluation.evaluationId,
      intent.evaluation.evaluationFingerprint,
      intent.materialization.materializationId,
      intent.materialization.materializationFingerprint,
      intent.materialization.materializationIdempotencyFingerprint,
      intent.proposal.proposalId,
      intent.proposal.proposalFingerprint,
      intent.recommendation.recommendationFingerprint,
      intent.recommendation.recommendationIdempotencyKey,
      intent.target.targetBindingFingerprint,
      intent.target.provider,
      intent.target.domain,
      intent.target.resourceKind,
      intent.target.resourceGid,
      intent.target.targetUrl,
      intent.target.actionType,
      intent.target.field,
      intent.target.requiredProviderScope,
      intent.state.beforeFingerprint,
      intent.state.afterFingerprint,
      w03.policyAuthorizationId,
      w03.policyAuthorizationFingerprint,
      w03.policyActionId,
      w03.reservation.descriptorFingerprint,
      w03.issuedAt,
      w03.expiresAt,
    ],
  );

  const w04Receipt = projectP88W04DurableReceipt({
    reservation_id: intent.reservationId,
    reservation_version: "p8-8-w04-durable-reservation-v1",
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
  });

  const w05Store = new P88W05MutationControlStore({ databaseUrl });
  const initialized = await w05Store.initializeControl({
    siteId,
    mode: "running",
  });
  const claimed = await w05Store.claim({
    w03Authorization: scenario.input.w03Authorization,
    w04Receipt: w04Receipt,
    expectedControlRevision: initialized.projection.state.revision,
    expectedControlFingerprint:
      initialized.projection.state.controlFingerprint,
  });
  assert.equal(claimed.kind, "claimed_new");
  assert.ok("receipt" in claimed);
  if (!("receipt" in claimed)) throw new Error("w06_test_claim_missing");

  const lineage = {
    w01EvaluationInput: scenario.intentInput.w01EvaluationInput,
    w01Evaluation: scenario.intentInput.w01Evaluation,
    w02MaterializationInput: scenario.intentInput.w02MaterializationInput,
    w02Materialization: scenario.intentInput.w02Materialization,
    w03Input: scenario.w03Input,
    w03Authorization: scenario.input.w03Authorization,
    w04Receipt: w04Receipt,
    w05ClaimReceipt: claimed.receipt,
  };

  const w06Store = new P88W06SnapshotStore({ databaseUrl });
  const governanceBeforeReads = await governance();
  const first = await w06Store.readSnapshot({
    siteId,
    reservationId: w04Receipt.reservationId,
  });
  const second = await w06Store.readSnapshot({
    siteId,
    reservationId: w04Receipt.reservationId,
  });
  const governanceAfterReads = await governance();

  assert.deepEqual(governanceAfterReads, governanceBeforeReads);
  assert.equal(first.snapshotFingerprint, second.snapshotFingerprint);
  assert.equal(first.reservation?.status, "claimed");
  assert.equal(first.claim?.claimId, claimed.receipt.claimId);
  assert.equal(
    first.control?.controlFingerprint,
    initialized.projection.state.controlFingerprint,
  );
  assert.deepEqual(p88W06DurableSnapshotIssues(first, lineage), []);

  const observation = buildP88W06ProviderObservation({
    status: "observed",
    siteId,
    provider: "shopify",
    resourceKind: "product",
    resourceGid: scenario.input.intent.target.resourceGid,
    field: "meta_description",
    rawValue: scenario.intentInput.w02Materialization.before.value,
    observedBeforeFingerprint: p88W02StateFingerprint({
      target: scenario.intentInput.w02Materialization.target,
      value: scenario.intentInput.w02Materialization.before.value,
      purpose: "before",
    }),
    requestProvenanceFingerprint: stableHash({
      test: "w06-ephemeral-provider-read",
    }),
    errorCategory: null,
  });

  const ready = buildP88W06PolicyPreflight({
    lineage,
    preSnapshot: first,
    finalSnapshot: second,
    providerObservation: observation,
  });
  assert.equal(ready.disposition, "ready_for_w07");
  assert.equal(ready.safety.databaseWritePerformed, false);
  assert.equal(ready.noDispatchProof.providerWritePerformed, false);

  const paused = await w05Store.transitionControl({
    siteId,
    expectedRevision: initialized.projection.state.revision,
    expectedControlFingerprint:
      initialized.projection.state.controlFingerprint,
    action: "pause",
  });
  assert.equal(paused.state.mode, "paused");

  const changed = await w06Store.readSnapshot({
    siteId,
    reservationId: w04Receipt.reservationId,
  });
  assert.notEqual(changed.snapshotFingerprint, first.snapshotFingerprint);

  const raced = buildP88W06PolicyPreflight({
    lineage,
    preSnapshot: first,
    finalSnapshot: changed,
    providerObservation: observation,
  });
  assert.equal(raced.disposition, "state_uncertain");
  assert.equal(raced.claimReleaseEligibility, "not_releasable_uncertain");
  assert.ok(raced.blockers.includes("durable_snapshot_changed"));
  assert.equal(raced.noDispatchProof.providerDispatchAttempted, false);
  assert.equal(raced.noDispatchProof.providerMutationCalled, false);

  const reservationRows = await admin.unsafe<
    { status: string; count: number }[]
  >(
    "SELECT status,COUNT(*) OVER ()::int AS count "
      + "FROM policy_mutation_reservations WHERE reservation_id=$1",
    [w04Receipt.reservationId],
  );
  assert.equal(reservationRows[0]?.count, 1);
  assert.equal(reservationRows[0]?.status, "claimed");

  const claimRows = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM policy_mutation_claims "
      + "WHERE reservation_id=$1",
    [w04Receipt.reservationId],
  );
  assert.equal(claimRows[0]?.count, 1);
});
