import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { createHash } from "node:crypto";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";
import { P88W04ReservationStore } from "./p8-8-reservation-store.js";
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

  const w04Store = new P88W04ReservationStore({ databaseUrl });
  const reserved = await w04Store.reserve(scenario.input);
  assert.equal(reserved.kind, "created");
  assert.ok("receipt" in reserved);
  if (!("receipt" in reserved)) throw new Error("w06_test_receipt_missing");

  const w05Store = new P88W05MutationControlStore({ databaseUrl });
  const initialized = await w05Store.initializeControl({
    siteId,
    mode: "running",
  });
  const claimed = await w05Store.claim({
    w03Authorization: scenario.input.w03Authorization,
    w04Receipt: reserved.receipt,
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
    w04Receipt: reserved.receipt,
    w05ClaimReceipt: claimed.receipt,
  };

  const w06Store = new P88W06SnapshotStore({ databaseUrl });
  const governanceBeforeReads = await governance();
  const first = await w06Store.readSnapshot({
    siteId,
    reservationId: reserved.receipt.reservationId,
  });
  const second = await w06Store.readSnapshot({
    siteId,
    reservationId: reserved.receipt.reservationId,
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
    reservationId: reserved.receipt.reservationId,
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
    [reserved.receipt.reservationId],
  );
  assert.equal(reservationRows[0]?.count, 1);
  assert.equal(reservationRows[0]?.status, "claimed");

  const claimRows = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM policy_mutation_claims "
      + "WHERE reservation_id=$1",
    [reserved.receipt.reservationId],
  );
  assert.equal(claimRows[0]?.count, 1);
});
