import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {
  P88W05MutationControlStore,
} from "./p8-8-mutation-control-store.js";
import {
  projectP88W04DurableReceipt,
  type P88W04DurableReservationReceipt,
} from "./p8-8-reservation-store.js";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P8_8_W05_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p88_w05_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p88_w05_ephemeral_database_name_invalid");
  }
  return raw;
}

test("P8.8 W05 PostgreSQL control/claim bridge preserves durable race and safety invariants on dedicated ephemeral DB only", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P8_8_W05_EPHEMERAL_DATABASE_URL is not configured");
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

  const counts = await admin.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(counts[0]?.count, 41);

  const siteRows = await admin.unsafe<{ id: string }[]>(
    "SELECT id::text AS id FROM sites WHERE lower(domain)='diamondshelf.us' AND canonical_origin='https://diamondshelf.us' AND is_active=true ORDER BY created_at LIMIT 1",
  );
  const siteId = siteRows[0]?.id;
  assert.ok(siteId, "ephemeral W05 baseline must contain Diamond Shelf site");

  const clockRows = await admin.unsafe<{ now: Date }[]>(
    "SELECT transaction_timestamp() AS now",
  );
  const now = clockRows[0]?.now;
  assert.ok(now instanceof Date);
  const baseTime = now.toISOString();

  const store = new P88W05MutationControlStore({ databaseUrl });

  const clear = async () => {
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

  const seedReservation = async (
    scenario: ReturnType<typeof buildP88W04TestScenario>,
  ): Promise<P88W04DurableReservationReceipt> => {
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

    const row: Parameters<typeof projectP88W04DurableReceipt>[0] = {
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
      materialization_fingerprint:
        intent.materialization.materializationFingerprint,
      materialization_idempotency_fingerprint:
        intent.materialization.materializationIdempotencyFingerprint,
      proposal_id: intent.proposal.proposalId,
      proposal_fingerprint: intent.proposal.proposalFingerprint,
      recommendation_fingerprint:
        intent.recommendation.recommendationFingerprint,
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
      w03_reservation_descriptor_fingerprint:
        w03.reservation.descriptorFingerprint,
      status: "authorized",
      authorized_at: new Date(w03.issuedAt),
      expires_at: new Date(w03.expiresAt),
      claimed_at: null,
      terminal_at: null,
      terminal_reason: null,
    };
    return projectP88W04DurableReceipt(row);
  };

  const claimInput = (
    scenario: ReturnType<typeof buildP88W04TestScenario>,
    receipt: P88W04DurableReservationReceipt,
    control: Awaited<ReturnType<typeof store.initializeControl>>["projection"]["state"],
  ) => ({
    w03Authorization: scenario.input.w03Authorization,
    w04Receipt: receipt,
    expectedControlRevision: control.revision,
    expectedControlFingerprint: control.controlFingerprint,
  });

  const governanceBefore = await governanceCounts();

  await t.test("missing durable control fails closed", async () => {
    await clear();
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "300000001",
      handle: "w05-product-one",
      subjectSuffix: "missing-control",
    });
    const receipt = await seedReservation(scenario);
    const result = await store.claim({
      w03Authorization: scenario.input.w03Authorization,
      w04Receipt: receipt,
      expectedControlRevision: 1,
      expectedControlFingerprint: "f".repeat(64),
    });
    assert.equal(result.kind, "control_not_initialized");
  });

  await t.test("simultaneous exact duplicate claims produce one durable claim plus exact replay", async () => {
    await clear();
    const initialized = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "300000002",
      handle: "w05-product-two",
      subjectSuffix: "duplicate",
    });
    const receipt = await seedReservation(scenario);
    const input = claimInput(scenario, receipt, initialized.projection.state);

    const results = await Promise.all([
      store.claim(input),
      store.claim(input),
    ]);
    assert.deepEqual(
      results.map((result) => result.kind).sort(),
      ["claimed_new", "existing_claimed"],
    );

    const claims = await admin.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_claims",
    );
    assert.equal(claims[0]?.count, 1);
    const reservation = await admin.unsafe<
      { status: string; claimed_at: Date | null }[]
    >(
      "SELECT status,claimed_at FROM policy_mutation_reservations WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );
    assert.equal(reservation[0]?.status, "claimed");
    assert.ok(reservation[0]?.claimed_at instanceof Date);
  });

  for (const action of ["pause", "drain", "kill"] as const) {
    await t.test("claim racing " + action + " has one serial control ordering and no claim under a closed revision", async () => {
      await clear();
      const initialized = await store.initializeControl({
        siteId,
        mode: "running",
      });
      const scenario = buildP88W04TestScenario({
        siteId,
        baseTime,
        productId:
          action === "pause"
            ? "300000003"
            : action === "drain"
              ? "300000004"
              : "300000005",
        handle: "w05-race-" + action,
        subjectSuffix: "race-" + action,
      });
      const receipt = await seedReservation(scenario);
      const input = claimInput(
        scenario,
        receipt,
        initialized.projection.state,
      );

      const [claim, transition] = await Promise.all([
        store.claim(input),
        store.transitionControl({
          siteId,
          expectedRevision: initialized.projection.state.revision,
          expectedControlFingerprint:
            initialized.projection.state.controlFingerprint,
          action,
          releaseBinding: {
            w03Authorization: scenario.input.w03Authorization,
            w04Receipt: receipt,
          },
        }).catch((error: unknown) => error),
      ]);

      assert.ok(
        ["claimed_new", "reservation_not_claimable"].includes(claim.kind),
      );
      if (transition instanceof Error) {
        assert.match(
          transition.message,
          /p88_w05_control_revision_conflict/,
        );
        assert.equal(claim.kind, "claimed_new");
      } else {
        assert.equal(transition.state.revision, 2);
        assert.equal(transition.state.mode === "running", false);
      }

      const control = await store.readControl(siteId);
      assert.ok(control);
      assert.notEqual(control?.mode, "running");

      const claimRows = await admin.unsafe<
        { control_revision: number; control_fingerprint: string }[]
      >(
        "SELECT control_revision,control_fingerprint FROM policy_mutation_claims",
      );
      if (claimRows[0]) {
        assert.equal(Number(claimRows[0].control_revision), 1);
        assert.equal(
          claimRows[0].control_fingerprint,
          initialized.projection.state.controlFingerprint,
        );
      }
    });
  }

  await t.test("stale control revision cannot claim", async () => {
    await clear();
    const initial = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const paused = await store.transitionControl({
      siteId,
      expectedRevision: initial.projection.state.revision,
      expectedControlFingerprint:
        initial.projection.state.controlFingerprint,
      action: "pause",
    });
    const resumed = await store.transitionControl({
      siteId,
      expectedRevision: paused.state.revision,
      expectedControlFingerprint: paused.state.controlFingerprint,
      action: "resume",
    });
    assert.equal(resumed.state.mode, "running");

    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "300000006",
      handle: "w05-product-six",
      subjectSuffix: "stale-control",
    });
    const receipt = await seedReservation(scenario);
    const result = await store.claim(
      claimInput(scenario, receipt, initial.projection.state),
    );
    assert.equal(result.kind, "control_revision_conflict");
  });

  await t.test("pause releases only an exact unclaimed authorized reservation", async () => {
    await clear();
    const initialized = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "300000007",
      handle: "w05-product-seven",
      subjectSuffix: "release-authorized",
    });
    const receipt = await seedReservation(scenario);
    const paused = await store.transitionControl({
      siteId,
      expectedRevision: initialized.projection.state.revision,
      expectedControlFingerprint:
        initialized.projection.state.controlFingerprint,
      action: "pause",
      releaseBinding: {
        w03Authorization: scenario.input.w03Authorization,
        w04Receipt: receipt,
      },
    });
    assert.equal(paused.state.mode, "paused");
    assert.equal(
      paused.releasedReservationId,
      scenario.input.intent.reservationId,
    );

    const rows = await admin.unsafe<
      { status: string; terminal_reason: string }[]
    >(
      "SELECT status,terminal_reason FROM policy_mutation_reservations WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );
    assert.equal(rows[0]?.status, "released");
    assert.equal(rows[0]?.terminal_reason, "control_pause_before_claim");
  });

  await t.test("claimed reservation remains blocking through pause and blocks ordinary resume", async () => {
    await clear();
    const initialized = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "300000008",
      handle: "w05-product-eight",
      subjectSuffix: "claimed-blocker",
    });
    const receipt = await seedReservation(scenario);
    assert.equal(
      (
        await store.claim(
          claimInput(scenario, receipt, initialized.projection.state),
        )
      ).kind,
      "claimed_new",
    );

    const paused = await store.transitionControl({
      siteId,
      expectedRevision: initialized.projection.state.revision,
      expectedControlFingerprint:
        initialized.projection.state.controlFingerprint,
      action: "pause",
    });
    assert.equal(paused.state.mode, "paused");
    assert.equal(paused.releasedReservationId, null);

    const rows = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );
    assert.equal(rows[0]?.status, "claimed");

    await assert.rejects(
      store.transitionControl({
        siteId,
        expectedRevision: paused.state.revision,
        expectedControlFingerprint: paused.state.controlFingerprint,
        action: "resume",
      }),
      /p88_w05_resume_blocked_by_unresolved_mutation/,
    );
  });

  await t.test("manual intervention remains blocking and is never auto-released", async () => {
    await clear();
    const initialized = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "300000009",
      handle: "w05-product-nine",
      subjectSuffix: "manual-blocker",
    });
    await seedReservation(scenario);
    await admin.unsafe(
      "UPDATE policy_mutation_reservations SET status='manual_intervention' WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );

    const draining = await store.transitionControl({
      siteId,
      expectedRevision: initialized.projection.state.revision,
      expectedControlFingerprint:
        initialized.projection.state.controlFingerprint,
      action: "drain",
    });
    assert.equal(draining.state.mode, "draining");
    assert.equal(draining.releasedReservationId, null);

    const rows = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );
    assert.equal(rows[0]?.status, "manual_intervention");
  });

  await t.test("drain becomes drained only after safe unclaimed release leaves zero blockers", async () => {
    await clear();
    const initialized = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "300000010",
      handle: "w05-product-ten",
      subjectSuffix: "drain-release",
    });
    const receipt = await seedReservation(scenario);
    const drained = await store.transitionControl({
      siteId,
      expectedRevision: initialized.projection.state.revision,
      expectedControlFingerprint:
        initialized.projection.state.controlFingerprint,
      action: "drain",
      releaseBinding: {
        w03Authorization: scenario.input.w03Authorization,
        w04Receipt: receipt,
      },
    });
    assert.equal(drained.state.mode, "drained");
    assert.equal(
      drained.releasedReservationId,
      scenario.input.intent.reservationId,
    );
  });

  await t.test("killed state is latched and cannot ordinary-resume", async () => {
    await clear();
    const initialized = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const killed = await store.transitionControl({
      siteId,
      expectedRevision: initialized.projection.state.revision,
      expectedControlFingerprint:
        initialized.projection.state.controlFingerprint,
      action: "kill",
    });
    assert.equal(killed.state.mode, "killed");
    await assert.rejects(
      store.transitionControl({
        siteId,
        expectedRevision: killed.state.revision,
        expectedControlFingerprint: killed.state.controlFingerprint,
        action: "resume",
      }),
      /p88_w05_killed_requires_recovery_review/,
    );
  });

  await t.test("expired authorized reservation cannot be claimed", async () => {
    await clear();
    const initialized = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const expiredBase = new Date(now.getTime() - 30 * 60_000).toISOString();
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime: expiredBase,
      productId: "300000011",
      handle: "w05-product-eleven",
      subjectSuffix: "expired",
    });
    const receipt = await seedReservation(scenario);
    const result = await store.claim(
      claimInput(scenario, receipt, initialized.projection.state),
    );
    assert.equal(result.kind, "authorization_expired");

    const rows = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );
    assert.equal(rows[0]?.status, "expired");
  });

  await t.test("claimed reservation without exact immutable W05 claim fails closed as uncertain", async () => {
    await clear();
    const initialized = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "300000012",
      handle: "w05-product-twelve",
      subjectSuffix: "claimed-without-claim",
    });
    const receipt = await seedReservation(scenario);
    await admin.unsafe(
      "UPDATE policy_mutation_reservations SET status='claimed',claimed_at=transaction_timestamp() WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );

    const result = await store.claim(
      claimInput(scenario, receipt, initialized.projection.state),
    );
    assert.equal(result.kind, "claim_state_uncertain");
  });

  await t.test("conflicting immutable claim binding cannot produce a false W04 claimed transition", async () => {
    await clear();
    const initialized = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "300000013",
      handle: "w05-product-thirteen",
      subjectSuffix: "claim-conflict",
    });
    const receipt = await seedReservation(scenario);

    await admin.unsafe(
      "INSERT INTO policy_mutation_claims ("
        + "claim_id,claim_version,claim_fingerprint,reservation_id,"
        + "reservation_fingerprint,w03_authorization_id,"
        + "w03_authorization_fingerprint,policy_action_id,site_id,"
        + "control_revision,control_fingerprint,resource_gid,target_url,"
        + "field,before_fingerprint,after_fingerprint,claimed_at"
        + ") VALUES ($1,'p8-8-w05-control-claim-v1',$2,$3,$4,$5,$6,$7,"
        + "$8::uuid,$9,$10,$11,$12,'meta_description',$13,$14,"
        + "transaction_timestamp())",
      [
        "p88w05-claim-" + "a".repeat(24),
        "a".repeat(64),
        scenario.input.intent.reservationId,
        scenario.input.intent.reservationFingerprint,
        scenario.input.w03Authorization.policyAuthorizationId,
        scenario.input.w03Authorization.policyAuthorizationFingerprint,
        scenario.input.w03Authorization.policyActionId,
        siteId,
        initialized.projection.state.revision,
        initialized.projection.state.controlFingerprint,
        scenario.input.intent.target.resourceGid,
        scenario.input.intent.target.targetUrl,
        scenario.input.intent.state.beforeFingerprint,
        scenario.input.intent.state.afterFingerprint,
      ],
    );

    const result = await store.claim(
      claimInput(scenario, receipt, initialized.projection.state),
    );
    assert.equal(result.kind, "claim_identity_collision");

    const rows = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );
    assert.equal(rows[0]?.status, "authorized");
  });

  await t.test("serialized pause -> drain -> kill revisions preserve precedence", async () => {
    await clear();
    const initial = await store.initializeControl({
      siteId,
      mode: "running",
    });
    const paused = await store.transitionControl({
      siteId,
      expectedRevision: initial.projection.state.revision,
      expectedControlFingerprint:
        initial.projection.state.controlFingerprint,
      action: "pause",
    });
    const drained = await store.transitionControl({
      siteId,
      expectedRevision: paused.state.revision,
      expectedControlFingerprint: paused.state.controlFingerprint,
      action: "drain",
    });
    const killed = await store.transitionControl({
      siteId,
      expectedRevision: drained.state.revision,
      expectedControlFingerprint: drained.state.controlFingerprint,
      action: "kill",
    });
    assert.equal(paused.state.revision, 2);
    assert.equal(drained.state.revision, 3);
    assert.equal(killed.state.revision, 4);
    assert.equal(paused.state.mode, "paused");
    assert.equal(drained.state.mode, "drained");
    assert.equal(killed.state.mode, "killed");

    const events = await admin.unsafe<
      { transition_action: string; to_revision: number }[]
    >(
      "SELECT transition_action,to_revision FROM policy_mutation_control_events WHERE site_id=$1::uuid ORDER BY to_revision",
      [siteId],
    );
    assert.deepEqual(
      events.map((row) => [row.transition_action, Number(row.to_revision)]),
      [
        ["initialize", 1],
        ["pause", 2],
        ["drain", 3],
        ["kill", 4],
      ],
    );
  });

  const governanceAfter = await governanceCounts();
  assert.deepEqual(governanceAfter, governanceBefore);

  const sensitiveColumns = await admin.unsafe<{ column_name: string }[]>(
    "SELECT column_name FROM information_schema.columns "
      + "WHERE table_schema='public' "
      + "AND table_name IN ('policy_mutation_control_state',"
      + "'policy_mutation_control_events','policy_mutation_claims') "
      + "ORDER BY table_name,ordinal_position",
  );
  assert.doesNotMatch(
    sensitiveColumns.map((row) => row.column_name).join(" "),
    /proposal_text|current_value|proposed_value|raw_response|access_token|refresh_token|oauth|secret|approval_actor/i,
  );
});
