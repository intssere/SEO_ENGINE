import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";
import { P88W04ReservationStore } from "./p8-8-reservation-store.js";
import { P88W05MutationControlStore } from "./p8-8-mutation-control-store.js";
import { P88W06SnapshotStore } from "./p8-8-policy-preflight-store.js";
import {
  buildP88W06PolicyPreflight,
  buildP88W06ProviderObservation,
} from "./p8-8-policy-preflight.js";
import { p88W02StateFingerprint } from "./p8-8-governed-proposal-materialization.js";
import {
  projectP88W07DispatchIntent,
} from "./p8-8-policy-single-action-apply.js";
import {
  P88W07DispatchStore,
} from "./p8-8-policy-dispatch-store.js";

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P8_8_W07_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p88_w07_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p88_w07_ephemeral_database_name_invalid");
  }
  return raw;
}

test("P8.8 W07 43-table dispatch fence, crash/replay and W04 safety closure", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P8_8_W07_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }

  const admin = postgres(databaseUrl, {
    max: 8,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 2,
  });
  t.after(async () => {
    await admin.end({ timeout: 1 }).catch(() => undefined);
  });

  const tableCounts = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(tableCounts[0]?.count ?? 0), 43);

  const sites = await admin.unsafe<{ id: string }[]>(
    "SELECT id::text AS id FROM sites "
      + "WHERE lower(domain)='diamondshelf.us' "
      + "AND canonical_origin='https://diamondshelf.us' "
      + "AND platform='shopify' AND is_active=true "
      + "ORDER BY created_at LIMIT 1",
  );
  const siteId = sites[0]?.id;
  assert.ok(siteId);

  async function clearPolicyState() {
    await admin.unsafe("DELETE FROM policy_mutation_dispatch_events");
    await admin.unsafe("DELETE FROM policy_mutation_dispatches");
    await admin.unsafe("DELETE FROM policy_mutation_claims");
    await admin.unsafe("DELETE FROM policy_mutation_control_events");
    await admin.unsafe("DELETE FROM policy_mutation_control_state");
    await admin.unsafe("DELETE FROM policy_mutation_reservations");
  }

  async function setup(suffix: string, productId: string) {
    const clock = await admin.unsafe<{ now: Date }[]>(
      "SELECT transaction_timestamp() AS now",
    );
    const baseTime = clock[0]!.now.toISOString();
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId,
      handle: "w07-" + suffix,
      subjectSuffix: "w07-" + suffix,
      currentValue: "Before  " + suffix + "\nbytes",
      proposedValue: "After  " + suffix + "\nbytes",
    });

    const w04 = new P88W04ReservationStore({ databaseUrl });
    const reserved = await w04.reserve(scenario.input);
    assert.equal(reserved.kind, "created");
    if (!("receipt" in reserved)) throw new Error("w07_test_w04_receipt_missing");

    const w05 = new P88W05MutationControlStore({ databaseUrl });
    const control = await w05.initializeControl({
      siteId,
      mode: "running",
    });
    const claimed = await w05.claim({
      w03Authorization: scenario.input.w03Authorization,
      w04Receipt: reserved.receipt,
      expectedControlRevision: control.projection.state.revision,
      expectedControlFingerprint: control.projection.state.controlFingerprint,
    });
    assert.equal(claimed.kind, "claimed_new");
    if (!("receipt" in claimed)) throw new Error("w07_test_w05_receipt_missing");

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

    const w06 = new P88W06SnapshotStore({ databaseUrl });
    const snapshot = await w06.readSnapshot({
      siteId,
      reservationId: reserved.receipt.reservationId,
    });
    const providerObservation = buildP88W06ProviderObservation({
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
      requestProvenanceFingerprint: "a".repeat(64),
      errorCategory: null,
    });
    const preflight = buildP88W06PolicyPreflight({
      lineage,
      preSnapshot: snapshot,
      finalSnapshot: snapshot,
      providerObservation,
    });
    assert.equal(preflight.disposition, "ready_for_w07");

    const credential = {
      credentialProfileId:
        scenario.intentInput.w01EvaluationInput.grant.credentialProfileId,
      siteId,
      shopDomain: "diamond-shelf-test.myshopify.com",
      scopes: ["write_products"] as const,
      writeOnlyForThisOperation: true as const,
    };
    const runtime = {
      publicSiteWritesEnabled: true,
      policyMutationExecutionEnabled: true,
      mutationQuotaAvailable: true,
      sameTargetCooldownSatisfied: true,
      humanExecutionClear: true,
      unresolvedManualIntervention: false,
    };
    const intent = projectP88W07DispatchIntent({
      lineage,
      preflight,
      databaseNow: snapshot.databaseNow,
      runtime,
      credential,
    });
    return {
      scenario,
      lineage,
      preflight,
      intent,
      credential,
      w04Receipt: reserved.receipt,
      w05Receipt: claimed.receipt,
      w05,
      control: control.projection.state,
    };
  }

  await clearPolicyState();
  const first = await setup("fence", "640000001");
  const store = new P88W07DispatchStore({ databaseUrl });

  const reserved = await store.reservePrewrite(first.intent);
  assert.equal(reserved.kind, "reserved_new");
  if (!("record" in reserved)) throw new Error("w07_test_dispatch_missing");
  assert.equal(reserved.record.state, "reserved_prewrite");
  assert.equal(reserved.record.forwardAttemptCount, 0);

  const replay = await store.reservePrewrite(first.intent);
  assert.equal(replay.kind, "existing_reserved");
  if (!("record" in replay)) throw new Error("w07_test_replay_missing");
  assert.equal(replay.record.dispatchId, reserved.record.dispatchId);

  let reservationRows = await admin.unsafe<{ status: string }[]>(
    "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
    [first.w04Receipt.reservationId],
  );
  assert.equal(reservationRows[0]?.status, "claimed");

  const started = await store.startDispatch({
    dispatchId: reserved.record.dispatchId,
    expectedRevision: reserved.record.revision,
    finalBeforeFingerprint: first.lineage.w02Materialization.before.fingerprint,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: first.credential.credentialProfileId,
    writeProductsScopePresent: true,
  });
  assert.equal(started.state, "dispatch_started");
  assert.equal(started.forwardAttemptCount, 1);
  assert.equal(started.publicWriteOccurrence, "possible");

  const afterCrashReplay = await store.reservePrewrite(first.intent);
  assert.equal(afterCrashReplay.kind, "existing_reserved");
  if (!("record" in afterCrashReplay)) throw new Error("w07_test_crash_replay_missing");
  assert.equal(afterCrashReplay.record.state, "dispatch_started");
  assert.equal(afterCrashReplay.record.forwardAttemptCount, 1);

  await assert.rejects(
    store.startDispatch({
      dispatchId: started.dispatchId,
      expectedRevision: started.revision,
      finalBeforeFingerprint: first.lineage.w02Materialization.before.fingerprint,
      publicSiteWritesEnabled: true,
      policyMutationExecutionEnabled: true,
      credentialProfileId: first.credential.credentialProfileId,
      writeProductsScopePresent: true,
    }),
    /p88_w07_transition_not_allowed/,
  );

  const accepted = await store.forwardAccepted({
    dispatchId: started.dispatchId,
    expectedRevision: started.revision,
    providerRequestId: "forward-request",
    providerRequestFingerprint: "b".repeat(64),
    providerResponseFingerprint: "c".repeat(64),
  });
  assert.equal(accepted.state, "forward_verification_pending");

  const rollbackRequired = await store.requireRollback({
    dispatchId: accepted.dispatchId,
    expectedRevision: accepted.revision,
  });
  const rollbackStarted = await store.startRollback({
    dispatchId: rollbackRequired.dispatchId,
    expectedRevision: rollbackRequired.revision,
  });
  assert.equal(rollbackStarted.rollbackAttemptCount, 1);
  await assert.rejects(
    store.startRollback({
      dispatchId: rollbackStarted.dispatchId,
      expectedRevision: rollbackStarted.revision,
    }),
    /p88_w07_transition_not_allowed/,
  );

  const rollbackPending = await store.rollbackAccepted({
    dispatchId: rollbackStarted.dispatchId,
    expectedRevision: rollbackStarted.revision,
    providerRequestId: "rollback-request",
    providerRequestFingerprint: "d".repeat(64),
    providerResponseFingerprint: "e".repeat(64),
  });
  const closed = await store.closeRollbackVerified({
    dispatchId: rollbackPending.dispatchId,
    expectedRevision: rollbackPending.revision,
  });
  assert.equal(closed.state, "rollback_verified_closed");
  assert.equal(closed.rollbackAttemptCount, 1);

  reservationRows = await admin.unsafe<{ status: string }[]>(
    "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
    [first.w04Receipt.reservationId],
  );
  assert.equal(reservationRows[0]?.status, "consumed");

  const claimRows = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM policy_mutation_claims WHERE claim_id=$1",
    [first.w05Receipt.claimId],
  );
  assert.equal(claimRows[0]?.count, 1, "W05 claim history must remain immutable");

  await clearPolicyState();
  const pausedCase = await setup("pause", "640000002");
  const pausedReserve = await store.reservePrewrite(pausedCase.intent);
  assert.equal(pausedReserve.kind, "reserved_new");
  if (!("record" in pausedReserve)) throw new Error("w07_test_pause_dispatch_missing");

  const paused = await pausedCase.w05.transitionControl({
    siteId,
    expectedRevision: pausedCase.control.revision,
    expectedControlFingerprint: pausedCase.control.controlFingerprint,
    action: "pause",
  });
  assert.equal(paused.state.mode, "paused");

  await assert.rejects(
    store.startDispatch({
      dispatchId: pausedReserve.record.dispatchId,
      expectedRevision: pausedReserve.record.revision,
      finalBeforeFingerprint:
        pausedCase.lineage.w02Materialization.before.fingerprint,
      publicSiteWritesEnabled: true,
      policyMutationExecutionEnabled: true,
      credentialProfileId: pausedCase.credential.credentialProfileId,
      writeProductsScopePresent: true,
    }),
    /p88_w07_control_epoch_not_forward_eligible/,
  );
  const cancelled = await store.cancelBeforeDispatch({
    dispatchId: pausedReserve.record.dispatchId,
    expectedRevision: pausedReserve.record.revision,
    reason: "w07_control_pause_before_dispatch",
  });
  assert.equal(cancelled.state, "cancelled_before_dispatch");
  reservationRows = await admin.unsafe<{ status: string }[]>(
    "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
    [pausedCase.w04Receipt.reservationId],
  );
  assert.equal(reservationRows[0]?.status, "released");

  await clearPolicyState();
  const uncertainCase = await setup("uncertain", "640000003");
  const uncertainReserve = await store.reservePrewrite(uncertainCase.intent);
  assert.equal(uncertainReserve.kind, "reserved_new");
  if (!("record" in uncertainReserve)) throw new Error("w07_test_uncertain_dispatch_missing");
  const uncertainStarted = await store.startDispatch({
    dispatchId: uncertainReserve.record.dispatchId,
    expectedRevision: uncertainReserve.record.revision,
    finalBeforeFingerprint:
      uncertainCase.lineage.w02Materialization.before.fingerprint,
    publicSiteWritesEnabled: true,
    policyMutationExecutionEnabled: true,
    credentialProfileId: uncertainCase.credential.credentialProfileId,
    writeProductsScopePresent: true,
  });
  const manual = await store.markManualIntervention({
    dispatchId: uncertainStarted.dispatchId,
    expectedRevision: uncertainStarted.revision,
    reason: "w07_forward_outcome_uncertain",
    publicWriteOccurrence: "possible",
    rollbackOccurrence: "none",
  });
  assert.equal(manual.state, "manual_intervention_required");
  const manualReservationRows = await admin.unsafe<
    { status: string; terminal_at: Date | null }[]
  >(
    "SELECT status,terminal_at FROM policy_mutation_reservations WHERE reservation_id=$1",
    [uncertainCase.w04Receipt.reservationId],
  );
  assert.equal(manualReservationRows[0]?.status, "manual_intervention");
  assert.equal(manualReservationRows[0]?.terminal_at, null);

  const eventRows = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatch_events",
  );
  assert.ok(Number(eventRows[0]?.count ?? 0) >= 3);

  const finalCount = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(finalCount[0]?.count ?? 0), 43);
});
