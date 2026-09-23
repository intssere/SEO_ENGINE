import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { P88W04ReservationStore } from "./p8-8-reservation-store.js";
import { P88W05MutationControlStore } from "./p8-8-mutation-control-store.js";
import { P88W06SnapshotStore } from "./p8-8-policy-preflight-store.js";
import {
  buildP88W06PolicyPreflight,
  buildP88W06ProviderObservation,
  type P88W06LineageInput,
} from "./p8-8-policy-preflight.js";
import { p88W02StateFingerprint } from "./p8-8-governed-proposal-materialization.js";
import {
  projectP88W07ExecutionIntent,
  type P88W07DispatchEligibility,
  type P88W07W06Handoff,
} from "./p8-8-policy-single-action-apply.js";
import { P88W07DispatchStore } from "./p8-8-policy-dispatch-store.js";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";

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

test("P8.8 W07 PostgreSQL dispatch fence certifies replay, terminal closure and one-write invariants on dedicated 43-table DB only", async (t) => {
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

  const tableCount = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(tableCount[0]?.count, 43);

  const siteRows = await admin.unsafe<{ id: string }[]>(
    "SELECT id::text AS id FROM sites "
      + "WHERE lower(domain)='diamondshelf.us' "
      + "AND canonical_origin='https://diamondshelf.us' "
      + "AND platform='shopify' AND is_active=true "
      + "ORDER BY created_at LIMIT 1",
  );
  const siteId = siteRows[0]?.id;
  assert.ok(siteId);

  const w04 = new P88W04ReservationStore({ databaseUrl });
  const w05 = new P88W05MutationControlStore({ databaseUrl });
  const w06 = new P88W06SnapshotStore({ databaseUrl });
  const w07 = new P88W07DispatchStore({ databaseUrl });

  const clear = async () => {
    await admin.unsafe("DELETE FROM policy_mutation_dispatch_events");
    await admin.unsafe("DELETE FROM policy_mutation_dispatches");
    await admin.unsafe("DELETE FROM policy_mutation_claims");
    await admin.unsafe("DELETE FROM policy_mutation_control_events");
    await admin.unsafe("DELETE FROM policy_mutation_control_state");
    await admin.unsafe("DELETE FROM policy_mutation_reservations");
  };

  const governanceCounts = async () => {
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

  const prepare = async (suffix: string, productId: string) => {
    const clocks = await admin.unsafe<{ now: Date }[]>(
      "SELECT transaction_timestamp() AS now",
    );
    const now = clocks[0]?.now;
    assert.ok(now instanceof Date);

    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime: now.toISOString(),
      productId,
      handle: "w07-" + suffix,
      subjectSuffix: "w07-" + suffix,
      currentValue: "Before  W07 " + suffix + "\nexact bytes",
      proposedValue: "After  W07 " + suffix + "\nexact bytes",
      ttlMinutes: 15,
      policyStage: "single_action_canary",
    });

    const reserved = await w04.reserve(scenario.input);
    assert.ok("receipt" in reserved);
    if (!("receipt" in reserved)) {
      throw new Error("w07_test_reservation_receipt_missing");
    }

    const initialized = await w05.initializeControl({
      siteId,
      mode: "running",
    });
    const claimed = await w05.claim({
      w03Authorization: scenario.input.w03Authorization,
      w04Receipt: reserved.receipt,
      expectedControlRevision: initialized.projection.state.revision,
      expectedControlFingerprint:
        initialized.projection.state.controlFingerprint,
    });
    assert.ok("receipt" in claimed);
    if (!("receipt" in claimed)) {
      throw new Error("w07_test_claim_receipt_missing");
    }

    const lineage: P88W06LineageInput = {
      w01EvaluationInput: scenario.intentInput.w01EvaluationInput,
      w01Evaluation: scenario.intentInput.w01Evaluation,
      w02MaterializationInput: scenario.intentInput.w02MaterializationInput,
      w02Materialization: scenario.intentInput.w02Materialization,
      w03Input: scenario.w03Input,
      w03Authorization: scenario.input.w03Authorization,
      w04Receipt: reserved.receipt,
      w05ClaimReceipt: claimed.receipt,
    };

    const preSnapshot = await w06.readSnapshot({
      siteId,
      reservationId: reserved.receipt.reservationId,
    });
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
      requestProvenanceFingerprint: "a".repeat(64),
      errorCategory: null,
    });
    const finalSnapshot = await w06.readSnapshot({
      siteId,
      reservationId: reserved.receipt.reservationId,
    });
    const preflight = buildP88W06PolicyPreflight({
      lineage,
      preSnapshot,
      finalSnapshot,
      providerObservation: observation,
    });
    assert.equal(preflight.disposition, "ready_for_w07");

    const handoff: P88W07W06Handoff = {
      lineage,
      preSnapshot,
      finalSnapshot,
      providerObservation: observation,
      preflight,
    };
    const intent = projectP88W07ExecutionIntent(handoff);
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
      reserved: reserved.receipt,
      claimed: claimed.receipt,
      initialized,
      lineage,
      handoff,
      intent,
      eligibility,
      observation,
    };
  };

  const governanceBefore = await governanceCounts();

  await t.test("W04/W05/W06 remain compatible with additive 43-table W07 schema and duplicate reserve/start is at-most-once", async () => {
    await clear();
    const f = await prepare("replay", "710000001");

    const [left, right] = await Promise.all([
      w07.reservePrewrite({ handoff: f.handoff, intent: f.intent }),
      w07.reservePrewrite({ handoff: f.handoff, intent: f.intent }),
    ]);
    assert.deepEqual(
      [left.kind, right.kind].sort(),
      ["existing_exact", "reserved_new"],
    );

    const reservationBeforeStart = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [f.intent.reservation.reservationId],
    );
    assert.equal(reservationBeforeStart[0]?.status, "claimed");

    const started = await w07.startDispatch({
      handoff: f.handoff,
      intent: f.intent,
      eligibility: f.eligibility,
      finalBeforeObservation: f.observation,
    });
    assert.equal(started.kind, "started_new");
    assert.equal(started.receipt.forwardAttemptCount, 1);
    assert.equal(started.receipt.state, "dispatch_started");

    const replay = await w07.startDispatch({
      handoff: f.handoff,
      intent: f.intent,
      eligibility: f.eligibility,
      finalBeforeObservation: f.observation,
    });
    assert.equal(replay.kind, "already_started_or_terminal");
    assert.equal(replay.receipt.forwardAttemptCount, 1);

    const rows = await admin.unsafe<
      { count: number; forward_attempt_count: number }[]
    >(
      "SELECT COUNT(*) OVER ()::int AS count,forward_attempt_count "
        + "FROM policy_mutation_dispatches WHERE dispatch_id=$1",
      [f.intent.dispatchId],
    );
    assert.equal(rows[0]?.count, 1);
    assert.equal(Number(rows[0]?.forward_attempt_count), 1);

    const reservationAfterStart = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [f.intent.reservation.reservationId],
    );
    assert.equal(reservationAfterStart[0]?.status, "claimed");
  });

  await t.test("confirmed live closure consumes W04 only after terminal verification state and preserves W05 claim", async () => {
    await clear();
    const f = await prepare("live", "710000002");
    await w07.reservePrewrite({ handoff: f.handoff, intent: f.intent });
    await w07.startDispatch({
      handoff: f.handoff,
      intent: f.intent,
      eligibility: f.eligibility,
      finalBeforeObservation: f.observation,
    });

    await w07.transition({
      intent: f.intent,
      expectedStates: ["dispatch_started"],
      toState: "forward_verification_pending",
      reason: "synthetic_forward_accepted",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "none",
      providerOperationFingerprint: "b".repeat(64),
      providerResponseFingerprint: "c".repeat(64),
    });

    const stillClaimed = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [f.intent.reservation.reservationId],
    );
    assert.equal(stillClaimed[0]?.status, "claimed");

    const closed = await w07.transition({
      intent: f.intent,
      expectedStates: ["forward_verification_pending"],
      toState: "forward_verified_live",
      reason: "synthetic_exact_dual_verification",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "none",
      eventEvidenceFingerprint: "d".repeat(64),
    });
    assert.equal(closed.state, "forward_verified_live");

    const terminal = await admin.unsafe<
      { status: string; terminal_at: Date | null }[]
    >(
      "SELECT status,terminal_at FROM policy_mutation_reservations WHERE reservation_id=$1",
      [f.intent.reservation.reservationId],
    );
    assert.equal(terminal[0]?.status, "consumed");
    assert.ok(terminal[0]?.terminal_at instanceof Date);

    const claims = await admin.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_claims WHERE claim_id=$1",
      [f.intent.claim.claimId],
    );
    assert.equal(claims[0]?.count, 1);
  });

  await t.test("proven no-dispatch cancellation releases W04 while manual uncertainty stays blocking", async () => {
    await clear();
    const cancel = await prepare("cancel", "710000003");
    await w07.reservePrewrite({
      handoff: cancel.handoff,
      intent: cancel.intent,
    });
    const cancelled = await w07.transition({
      intent: cancel.intent,
      expectedStates: ["reserved_prewrite"],
      toState: "cancelled_before_dispatch",
      reason: "synthetic_pause_before_dispatch",
      publicWriteOccurrence: "none",
      rollbackWriteOccurrence: "none",
    });
    assert.equal(cancelled.forwardAttemptCount, 0);

    const released = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [cancel.intent.reservation.reservationId],
    );
    assert.equal(released[0]?.status, "released");

    await clear();
    const uncertain = await prepare("manual", "710000004");
    await w07.reservePrewrite({
      handoff: uncertain.handoff,
      intent: uncertain.intent,
    });
    await w07.startDispatch({
      handoff: uncertain.handoff,
      intent: uncertain.intent,
      eligibility: uncertain.eligibility,
      finalBeforeObservation: uncertain.observation,
    });
    const manual = await w07.transition({
      intent: uncertain.intent,
      expectedStates: ["dispatch_started"],
      toState: "manual_intervention_required",
      reason: "synthetic_forward_outcome_uncertain",
      publicWriteOccurrence: "possible",
      rollbackWriteOccurrence: "none",
    });
    assert.equal(manual.state, "manual_intervention_required");

    const blocked = await admin.unsafe<
      { status: string; terminal_at: Date | null }[]
    >(
      "SELECT status,terminal_at FROM policy_mutation_reservations WHERE reservation_id=$1",
      [uncertain.intent.reservation.reservationId],
    );
    assert.equal(blocked[0]?.status, "manual_intervention");
    assert.equal(blocked[0]?.terminal_at, null);
  });

  await t.test("control changes after dispatch start cannot authorize a second forward write but safety closure remains possible", async () => {
    await clear();
    const f = await prepare("control", "710000005");
    await w07.reservePrewrite({ handoff: f.handoff, intent: f.intent });
    await w07.startDispatch({
      handoff: f.handoff,
      intent: f.intent,
      eligibility: f.eligibility,
      finalBeforeObservation: f.observation,
    });

    const paused = await w05.transitionControl({
      siteId,
      expectedRevision: f.initialized.projection.state.revision,
      expectedControlFingerprint:
        f.initialized.projection.state.controlFingerprint,
      action: "pause",
    });
    assert.equal(paused.state.mode, "paused");

    const replay = await w07.startDispatch({
      handoff: f.handoff,
      intent: f.intent,
      eligibility: f.eligibility,
      finalBeforeObservation: f.observation,
    });
    assert.equal(replay.kind, "already_started_or_terminal");
    assert.equal(replay.receipt.forwardAttemptCount, 1);

    const safety = await w07.transition({
      intent: f.intent,
      expectedStates: ["dispatch_started"],
      toState: "forward_verification_pending",
      reason: "synthetic_safety_closure_after_pause",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "none",
    });
    assert.equal(safety.state, "forward_verification_pending");
  });

  await t.test("rollback attempt is durable and capped at one, then verified closure consumes W04", async () => {
    await clear();
    const f = await prepare("rollback", "710000006");
    await w07.reservePrewrite({ handoff: f.handoff, intent: f.intent });
    await w07.startDispatch({
      handoff: f.handoff,
      intent: f.intent,
      eligibility: f.eligibility,
      finalBeforeObservation: f.observation,
    });
    await w07.transition({
      intent: f.intent,
      expectedStates: ["dispatch_started"],
      toState: "forward_verification_pending",
      reason: "synthetic_forward_accepted",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "none",
    });
    await w07.transition({
      intent: f.intent,
      expectedStates: ["forward_verification_pending"],
      toState: "rollback_required",
      reason: "synthetic_forward_verification_failed",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "none",
    });

    const started = await w07.transition({
      intent: f.intent,
      expectedStates: ["rollback_required"],
      toState: "rollback_started",
      reason: "synthetic_rollback_point_of_no_return",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "possible",
    });
    assert.equal(started.rollbackAttemptCount, 1);

    await assert.rejects(
      w07.transition({
        intent: f.intent,
        expectedStates: ["rollback_required"],
        toState: "rollback_started",
        reason: "synthetic_duplicate_rollback",
        publicWriteOccurrence: "confirmed",
        rollbackWriteOccurrence: "possible",
      }),
      /p88_w07_transition_state_conflict/,
    );

    await w07.transition({
      intent: f.intent,
      expectedStates: ["rollback_started"],
      toState: "rollback_verification_pending",
      reason: "synthetic_rollback_accepted",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "confirmed",
    });
    const closed = await w07.transition({
      intent: f.intent,
      expectedStates: ["rollback_verification_pending"],
      toState: "rollback_verified_closed",
      reason: "synthetic_rollback_verified",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "confirmed",
    });
    assert.equal(closed.rollbackAttemptCount, 1);

    const reservation = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [f.intent.reservation.reservationId],
    );
    assert.equal(reservation[0]?.status, "consumed");

    const dispatch = await admin.unsafe<
      { forward_attempt_count: number; rollback_attempt_count: number }[]
    >(
      "SELECT forward_attempt_count,rollback_attempt_count "
        + "FROM policy_mutation_dispatches WHERE dispatch_id=$1",
      [f.intent.dispatchId],
    );
    assert.equal(Number(dispatch[0]?.forward_attempt_count), 1);
    assert.equal(Number(dispatch[0]?.rollback_attempt_count), 1);
  });

  const governanceAfter = await governanceCounts();
  assert.deepEqual(governanceAfter, governanceBefore);

  const finalTableCount = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(finalTableCount[0]?.count, 43);
});
