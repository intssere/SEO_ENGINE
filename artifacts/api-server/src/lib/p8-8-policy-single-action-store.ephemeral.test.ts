import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {
  projectP88W07DispatchIntent,
} from "./p8-8-policy-single-action-apply.js";
import { P88W07DispatchStore } from "./p8-8-policy-single-action-store.js";
import { P8_8_W05_CLAIM_VERSION } from "./p8-8-mutation-control.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

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

test("P8.8 W07 dispatch store certifies 43-table fencing, closure, race, quota and human-conflict semantics", async (t) => {
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

  const cleanup = async () => {
    await admin.unsafe("DELETE FROM policy_mutation_dispatch_events");
    await admin.unsafe("DELETE FROM policy_mutation_dispatches");
    await admin.unsafe("DELETE FROM policy_mutation_claims");
    await admin.unsafe("DELETE FROM policy_mutation_control_events");
    await admin.unsafe("DELETE FROM policy_mutation_control_state");
    await admin.unsafe("DELETE FROM policy_mutation_reservations");
    await admin.unsafe("DELETE FROM deployments");
    await admin.unsafe("DELETE FROM actions");
    await admin.unsafe("DELETE FROM action_plans");
  };

  const nowIso = async () => {
    const rows = await admin.unsafe<{ now: Date }[]>(
      "SELECT transaction_timestamp() AS now",
    );
    const now = rows[0]?.now;
    if (!(now instanceof Date)) throw new Error("w07_test_database_clock_missing");
    return now.toISOString();
  };

  const seed = async (productId: string, suffix: string) => {
    const baseTime = await nowIso();
    const fixture = buildP88W07TestFixture({
      siteId,
      baseTime,
      productId,
      handle: "w07-" + suffix,
      before: "Before  " + suffix + "\nbytes",
      after: "After  " + suffix + "\nbytes",
    });
    const intent = fixture.intent;
    const w03 = fixture.lineage.w03Authorization;
    const control = fixture.control;
    const claim = fixture.w05ClaimReceipt;

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
        + "w03_reservation_descriptor_fingerprint,status,authorized_at,"
        + "expires_at,claimed_at"
        + ") VALUES ("
        + "$1,$2,$3,$4,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,"
        + "$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,"
        + "'claimed',$33::timestamptz,$34::timestamptz,$35::timestamptz"
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
        claim.claimedAt,
      ],
    );

    await admin.unsafe(
      "INSERT INTO policy_mutation_control_state ("
        + "site_id,control_version,revision,previous_control_fingerprint,"
        + "mode,effective_at,control_fingerprint"
        + ") VALUES ($1::uuid,$2,$3,$4,$5,$6::timestamptz,$7) "
        + "ON CONFLICT (site_id) DO UPDATE SET "
        + "control_version=EXCLUDED.control_version,"
        + "revision=EXCLUDED.revision,"
        + "previous_control_fingerprint=EXCLUDED.previous_control_fingerprint,"
        + "mode=EXCLUDED.mode,effective_at=EXCLUDED.effective_at,"
        + "control_fingerprint=EXCLUDED.control_fingerprint,"
        + "updated_at=transaction_timestamp()",
      [
        control.siteId,
        control.version,
        control.revision,
        control.previousControlFingerprint,
        control.mode,
        control.effectiveAt,
        control.controlFingerprint,
      ],
    );

    await admin.unsafe(
      "INSERT INTO policy_mutation_claims ("
        + "claim_id,claim_version,claim_fingerprint,reservation_id,"
        + "reservation_fingerprint,w03_authorization_id,"
        + "w03_authorization_fingerprint,policy_action_id,site_id,"
        + "control_revision,control_fingerprint,resource_gid,target_url,"
        + "field,before_fingerprint,after_fingerprint,claimed_at"
        + ") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::uuid,$10,$11,$12,$13,$14,$15,$16,$17::timestamptz)",
      [
        claim.claimId,
        P8_8_W05_CLAIM_VERSION,
        claim.claimFingerprint,
        claim.reservationId,
        claim.reservationFingerprint,
        claim.w03AuthorizationId,
        claim.w03AuthorizationFingerprint,
        claim.policyActionId,
        claim.siteId,
        claim.controlRevision,
        claim.controlFingerprint,
        claim.target.resourceGid,
        claim.target.targetUrl,
        claim.target.field,
        claim.state.beforeFingerprint,
        claim.state.afterFingerprint,
        claim.claimedAt,
      ],
    );

    const w07Intent = projectP88W07DispatchIntent({
      bundle: fixture.bundle,
      databaseNow: baseTime,
    });
    return { fixture, intent: w07Intent };
  };

  const reservationStatus = async (reservationId: string) => {
    const rows = await admin.unsafe<{
      status: string;
      terminal_at: Date | null;
      terminal_reason: string | null;
    }[]>(
      "SELECT status,terminal_at,terminal_reason "
        + "FROM policy_mutation_reservations WHERE reservation_id=$1",
      [reservationId],
    );
    return rows[0]!;
  };

  const store = new P88W07DispatchStore({ databaseUrl });

  await cleanup();
  {
    const { intent } = await seed("640000001", "reserve-race");
    const results = await Promise.all([
      store.reservePrewrite(intent),
      store.reservePrewrite(intent),
    ]);
    assert.deepEqual(
      results.map((entry) => entry.kind).sort(),
      ["created", "existing"],
    );
    assert.equal(results[0].record.dispatchId, results[1].record.dispatchId);
    const dispatchRows = await admin.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatches",
    );
    assert.equal(dispatchRows[0]?.count, 1);
    const eventRows = await admin.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_dispatch_events",
    );
    assert.equal(eventRows[0]?.count, 1);

    const cancelled = await store.cancelBeforeDispatch({
      intent,
      expectedRowRevision: results[0].record.rowRevision,
    });
    assert.equal(cancelled.state, "cancelled_before_dispatch");
    assert.equal(cancelled.forwardAttemptCount, 0);
    assert.equal((await reservationStatus(intent.lineage.reservationId)).status, "released");
  }

  await cleanup();
  {
    const { intent } = await seed("640000002", "dispatch-race");
    const reserved = await store.reservePrewrite(intent);
    const startInput = {
      intent,
      expectedRowRevision: reserved.record.rowRevision,
      observedBeforeValue: intent.state.beforeValue,
      observedBeforeFingerprint: intent.state.beforeFingerprint,
      publicSiteWritesEnabled: true,
      policyMutationExecutionEnabled: true,
      credentialProfileId: intent.policy.credentialProfileId,
      credentialScopes: ["write_products"],
    };
    const starts = await Promise.allSettled([
      store.startDispatch(startInput),
      store.startDispatch(startInput),
    ]);
    assert.equal(starts.filter((entry) => entry.status === "fulfilled").length, 1);
    assert.equal(starts.filter((entry) => entry.status === "rejected").length, 1);
    const current = await store.read(intent.dispatchId);
    assert.equal(current?.state, "dispatch_started");
    assert.equal(current?.forwardAttemptCount, 1);
    assert.equal((await reservationStatus(intent.lineage.reservationId)).status, "claimed");

    await admin.unsafe(
      "UPDATE policy_mutation_control_state SET "
        + "revision=revision+1,previous_control_fingerprint=control_fingerprint,"
        + "mode='paused',effective_at=transaction_timestamp(),"
        + "control_fingerprint=$2,updated_at=transaction_timestamp() "
        + "WHERE site_id=$1::uuid",
      [intent.siteId, "b".repeat(64)],
    );

    const accepted = await store.markForwardAccepted({
      intent,
      expectedRowRevision: current!.rowRevision,
      providerRequestId: "synthetic-forward",
      providerRequestFingerprint: "c".repeat(64),
      providerResponseFingerprint: "d".repeat(64),
    });
    const live = await store.markForwardVerifiedLive({
      intent,
      expectedRowRevision: accepted.rowRevision,
      verificationFingerprint: "e".repeat(64),
    });
    assert.equal(live.state, "forward_verified_live");
    assert.equal(live.forwardAttemptCount, 1);
    assert.equal((await reservationStatus(intent.lineage.reservationId)).status, "consumed");
  }

  await cleanup();
  {
    const { intent } = await seed("640000003", "manual");
    const reserved = await store.reservePrewrite(intent);
    const started = await store.startDispatch({
      intent,
      expectedRowRevision: reserved.record.rowRevision,
      observedBeforeValue: intent.state.beforeValue,
      observedBeforeFingerprint: intent.state.beforeFingerprint,
      publicSiteWritesEnabled: true,
      policyMutationExecutionEnabled: true,
      credentialProfileId: intent.policy.credentialProfileId,
      credentialScopes: ["write_products"],
    });
    const manual = await store.markManualIntervention({
      intent,
      expectedState: "dispatch_started",
      expectedRowRevision: started.rowRevision,
      reason: "synthetic_uncertain_write",
      publicWriteOccurrence: "possible",
      rollbackOccurrence: "none",
    });
    assert.equal(manual.state, "manual_intervention_required");
    const status = await reservationStatus(intent.lineage.reservationId);
    assert.equal(status.status, "manual_intervention");
    assert.equal(status.terminal_at, null);
  }

  await cleanup();
  {
    const { intent } = await seed("640000004", "rollback");
    const reserved = await store.reservePrewrite(intent);
    const started = await store.startDispatch({
      intent,
      expectedRowRevision: reserved.record.rowRevision,
      observedBeforeValue: intent.state.beforeValue,
      observedBeforeFingerprint: intent.state.beforeFingerprint,
      publicSiteWritesEnabled: true,
      policyMutationExecutionEnabled: true,
      credentialProfileId: intent.policy.credentialProfileId,
      credentialScopes: ["write_products"],
    });
    const accepted = await store.markForwardAccepted({
      intent,
      expectedRowRevision: started.rowRevision,
      providerRequestId: "synthetic-forward",
      providerRequestFingerprint: "1".repeat(64),
      providerResponseFingerprint: "2".repeat(64),
    });
    const required = await store.markRollbackRequired({
      intent,
      expectedRowRevision: accepted.rowRevision,
      verificationFingerprint: "3".repeat(64),
    });
    const rollbackStarted = await store.startRollback({
      intent,
      expectedRowRevision: required.rowRevision,
    });
    assert.equal(rollbackStarted.rollbackAttemptCount, 1);
    await assert.rejects(
      store.startRollback({
        intent,
        expectedRowRevision: rollbackStarted.rowRevision,
      }),
      /p88_w07_transition_not_allowed|p88_w07_rollback_attempt_already_spent|p88_w07_dispatch_revision_conflict/,
    );
    const rollbackPending = await store.markRollbackAccepted({
      intent,
      expectedRowRevision: rollbackStarted.rowRevision,
      providerRequestId: "synthetic-rollback",
      providerRequestFingerprint: "4".repeat(64),
      providerResponseFingerprint: "5".repeat(64),
    });
    const closed = await store.markRollbackVerifiedClosed({
      intent,
      expectedRowRevision: rollbackPending.rowRevision,
      verificationFingerprint: "6".repeat(64),
    });
    assert.equal(closed.state, "rollback_verified_closed");
    assert.equal(closed.rollbackAttemptCount, 1);
    assert.equal((await reservationStatus(intent.lineage.reservationId)).status, "consumed");
    const immutableClaim = await admin.unsafe<{
      claim_fingerprint: string;
      reservation_fingerprint: string;
      control_revision: number;
      control_fingerprint: string;
    }[]>(
      "SELECT claim_fingerprint,reservation_fingerprint,control_revision,"
        + "control_fingerprint FROM policy_mutation_claims WHERE claim_id=$1",
      [intent.lineage.claimId],
    );
    assert.equal(immutableClaim[0]?.claim_fingerprint, intent.lineage.claimFingerprint);
    assert.equal(
      immutableClaim[0]?.reservation_fingerprint,
      intent.lineage.reservationFingerprint,
    );
    assert.equal(Number(immutableClaim[0]?.control_revision), intent.control.revision);
    assert.equal(immutableClaim[0]?.control_fingerprint, intent.control.fingerprint);
  }

  await cleanup();
  {
    const { intent } = await seed("640000005", "gate");
    const reserved = await store.reservePrewrite(intent);
    await assert.rejects(
      store.startDispatch({
        intent,
        expectedRowRevision: reserved.record.rowRevision,
        observedBeforeValue: intent.state.beforeValue,
        observedBeforeFingerprint: intent.state.beforeFingerprint,
        publicSiteWritesEnabled: false,
        policyMutationExecutionEnabled: true,
        credentialProfileId: intent.policy.credentialProfileId,
        credentialScopes: ["write_products"],
      }),
      /p88_w07_execution_gate_disabled/,
    );
    await assert.rejects(
      store.startDispatch({
        intent,
        expectedRowRevision: reserved.record.rowRevision,
        observedBeforeValue: intent.state.beforeValue,
        observedBeforeFingerprint: intent.state.beforeFingerprint,
        publicSiteWritesEnabled: true,
        policyMutationExecutionEnabled: true,
        credentialProfileId: "wrong-profile",
        credentialScopes: ["write_products"],
      }),
      /p88_w07_write_credential_binding_invalid/,
    );
    await assert.rejects(
      store.startDispatch({
        intent,
        expectedRowRevision: reserved.record.rowRevision,
        observedBeforeValue: intent.state.beforeValue,
        observedBeforeFingerprint: intent.state.beforeFingerprint,
        publicSiteWritesEnabled: true,
        policyMutationExecutionEnabled: false,
        credentialProfileId: intent.policy.credentialProfileId,
        credentialScopes: ["write_products"],
      }),
      /p88_w07_execution_gate_disabled/,
    );
    await assert.rejects(
      store.startDispatch({
        intent,
        expectedRowRevision: reserved.record.rowRevision,
        observedBeforeValue: intent.state.beforeValue,
        observedBeforeFingerprint: intent.state.beforeFingerprint,
        publicSiteWritesEnabled: true,
        policyMutationExecutionEnabled: true,
        credentialProfileId: intent.policy.credentialProfileId,
        credentialScopes: [],
      }),
      /p88_w07_write_credential_binding_invalid/,
    );
    const cancelled = await store.cancelBeforeDispatch({
      intent,
      expectedRowRevision: reserved.record.rowRevision,
    });
    assert.equal(cancelled.state, "cancelled_before_dispatch");
  }

  await cleanup();
  {
    const { intent } = await seed("640000009", "reservation-not-claimed");
    await admin.unsafe(
      "UPDATE policy_mutation_reservations SET status='authorized' "
        + "WHERE reservation_id=$1",
      [intent.lineage.reservationId],
    );
    await assert.rejects(
      store.reservePrewrite(intent),
      /p88_w07_reservation_not_claimed/,
    );
  }

  await cleanup();
  {
    const { intent } = await seed("640000010", "w05-lineage-mismatch");
    await admin.unsafe(
      "UPDATE policy_mutation_claims SET claim_fingerprint=$2 WHERE claim_id=$1",
      [intent.lineage.claimId, "f".repeat(64)],
    );
    await assert.rejects(
      store.reservePrewrite(intent),
      /p88_w07_durable_lineage_mismatch/,
    );
  }

  await cleanup();
  {
    const { intent } = await seed("640000011", "control-missing");
    await admin.unsafe(
      "DELETE FROM policy_mutation_control_state WHERE site_id=$1::uuid",
      [intent.siteId],
    );
    await assert.rejects(
      store.reservePrewrite(intent),
      /p88_w07_control_missing/,
    );
  }

  await cleanup();
  {
    const { intent } = await seed("640000012", "control-paused");
    await admin.unsafe(
      "UPDATE policy_mutation_control_state SET mode='paused' WHERE site_id=$1::uuid",
      [intent.siteId],
    );
    await assert.rejects(
      store.reservePrewrite(intent),
      /p88_w07_control_not_running/,
    );
  }

  await cleanup();
  {
    const { intent } = await seed("640000013", "before-and-control-epoch");
    const reserved = await store.reservePrewrite(intent);
    await assert.rejects(
      store.startDispatch({
        intent,
        expectedRowRevision: reserved.record.rowRevision,
        observedBeforeValue:
          intent.state.beforeValue === null ? " " : intent.state.beforeValue + " ",
        observedBeforeFingerprint: intent.state.beforeFingerprint,
        publicSiteWritesEnabled: true,
        policyMutationExecutionEnabled: true,
        credentialProfileId: intent.policy.credentialProfileId,
        credentialScopes: ["write_products"],
      }),
      /p88_w07_final_before_state_mismatch/,
    );
    const stillReserved = await store.read(intent.dispatchId);
    assert.equal(stillReserved?.state, "reserved_prewrite");
    assert.equal(stillReserved?.forwardAttemptCount, 0);

    await admin.unsafe(
      "UPDATE policy_mutation_control_state SET "
        + "revision=revision+1,previous_control_fingerprint=control_fingerprint,"
        + "control_fingerprint=$2,updated_at=transaction_timestamp() "
        + "WHERE site_id=$1::uuid",
      [intent.siteId, "9".repeat(64)],
    );
    await assert.rejects(
      store.startDispatch({
        intent,
        expectedRowRevision: reserved.record.rowRevision,
        observedBeforeValue: intent.state.beforeValue,
        observedBeforeFingerprint: intent.state.beforeFingerprint,
        publicSiteWritesEnabled: true,
        policyMutationExecutionEnabled: true,
        credentialProfileId: intent.policy.credentialProfileId,
        credentialScopes: ["write_products"],
      }),
      /p88_w07_control_epoch_not_forward_eligible/,
    );
    const afterEpochChange = await store.read(intent.dispatchId);
    assert.equal(afterEpochChange?.state, "reserved_prewrite");
    assert.equal(afterEpochChange?.forwardAttemptCount, 0);
  }

  await cleanup();
  {
    const first = await seed("640000006", "quota-first");
    const reserved = await store.reservePrewrite(first.intent);
    const started = await store.startDispatch({
      intent: first.intent,
      expectedRowRevision: reserved.record.rowRevision,
      observedBeforeValue: first.intent.state.beforeValue,
      observedBeforeFingerprint: first.intent.state.beforeFingerprint,
      publicSiteWritesEnabled: true,
      policyMutationExecutionEnabled: true,
      credentialProfileId: first.intent.policy.credentialProfileId,
      credentialScopes: ["write_products"],
    });
    const rejected = await store.markForwardRejectedNoWrite({
      intent: first.intent,
      expectedRowRevision: started.rowRevision,
      providerRequestId: "rejected",
      providerRequestFingerprint: "7".repeat(64),
      providerResponseFingerprint: "8".repeat(64),
    });
    assert.equal(rejected.state, "forward_rejected_no_write");

    const second = await seed("640000007", "quota-second");
    await assert.rejects(
      store.reservePrewrite(second.intent),
      /p88_w07_mutation_quota_exhausted/,
    );

    await admin.unsafe(
      "UPDATE policy_mutation_dispatches SET dispatch_started_at="
        + "transaction_timestamp() - interval '48 hours' "
        + "WHERE dispatch_id=$1",
      [first.intent.dispatchId],
    );
    await admin.unsafe(
      "DELETE FROM policy_mutation_claims WHERE reservation_id=$1",
      [second.intent.lineage.reservationId],
    );
    await admin.unsafe(
      "DELETE FROM policy_mutation_reservations WHERE reservation_id=$1",
      [second.intent.lineage.reservationId],
    );

    const sameTarget = await seed("640000006", "cooldown-same-target");
    await assert.rejects(
      store.reservePrewrite(sameTarget.intent),
      /p88_w07_same_target_cooldown_blocked/,
    );
  }

  await cleanup();
  {
    const { intent } = await seed("640000008", "human-conflict");
    const plans = await admin.unsafe<{ id: string }[]>(
      "INSERT INTO action_plans (site_id,status,risk_level,rationale) "
        + "VALUES ($1::uuid,'active','approval','synthetic W07 conflict') "
        + "RETURNING id::text AS id",
      [intent.siteId],
    );
    assert.ok(plans[0]?.id);
    await admin.unsafe(
      "INSERT INTO deployments (action_plan_id,provider,status) "
        + "VALUES ($1::uuid,'shopify','active')",
      [plans[0]!.id],
    );
    await assert.rejects(
      store.reservePrewrite(intent),
      /p88_w07_human_execution_conflict/,
    );
    const governance = await admin.unsafe<{
      approvals: number;
      actions: number;
      deployments: number;
    }[]>(
      "SELECT "
        + "(SELECT COUNT(*)::int FROM approvals) AS approvals,"
        + "(SELECT COUNT(*)::int FROM actions) AS actions,"
        + "(SELECT COUNT(*)::int FROM deployments) AS deployments",
    );
    assert.equal(governance[0]?.actions, 0);
    assert.equal(governance[0]?.deployments, 1);
  }

  const finalCounts = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(finalCounts[0]?.count, 43);
});
