import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {
  P88W04ReservationStore,
  pairP88W03W04DurableReservation,
} from "./p8-8-reservation-store.js";
import { buildP88W04TestScenario } from "./p8-8-w04-test-fixture.js";

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P8_8_W04_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p88_w04_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p88_w04_ephemeral_database_name_invalid");
  }
  return raw;
}

test("P8.8 W04 PostgreSQL reservation store preserves replay/concurrency invariants on dedicated ephemeral DB only", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P8_8_W04_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }

  const admin = postgres(databaseUrl, {
    max: 4,
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
  assert.equal(counts[0]?.count, 38);

  const siteRows = await admin.unsafe<{ id: string }[]>(
    "SELECT id::text AS id FROM sites WHERE lower(domain)='diamondshelf.us' AND canonical_origin='https://diamondshelf.us' AND is_active=true ORDER BY created_at LIMIT 1",
  );
  const siteId = siteRows[0]?.id;
  assert.ok(siteId, "ephemeral W04 baseline must contain Diamond Shelf site");

  const clockRows = await admin.unsafe<{ now: Date }[]>(
    "SELECT transaction_timestamp() AS now",
  );
  const now = clockRows[0]?.now;
  assert.ok(now instanceof Date);
  const baseTime = now.toISOString();

  const store = new P88W04ReservationStore({ databaseUrl });

  const clear = async () => {
    await admin.unsafe("DELETE FROM policy_mutation_reservations");
  };

  const governanceCounts = async () => {
    const rows = await admin.unsafe<
      { approvals: number; actions: number }[]
    >(
      "SELECT (SELECT COUNT(*)::int FROM approvals) AS approvals, (SELECT COUNT(*)::int FROM actions) AS actions",
    );
    return rows[0]!;
  };

  const governanceBefore = await governanceCounts();

  await t.test("simultaneous exact duplicates produce one row and one exact replay", async () => {
    await clear();
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000001",
      handle: "w04-product-one",
      subjectSuffix: "duplicate",
    });

    const results = await Promise.all([
      store.reserve(scenario.input),
      store.reserve(scenario.input),
    ]);

    const kinds = results.map((result) => result.kind).sort();
    assert.deepEqual(kinds, ["created", "existing_authorized"]);

    const rows = await admin.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_reservations",
    );
    assert.equal(rows[0]?.count, 1);

    const created = results.find((result) => result.kind === "created");
    assert.ok(created && "receipt" in created);
    if (created && "receipt" in created) {
      const pairing = pairP88W03W04DurableReservation(
        scenario.input.w03Authorization,
        created.receipt,
      );
      assert.equal(pairing.paired, true);
      assert.equal(pairing.policyAwareControlEligible, true);
      assert.equal(pairing.providerDispatchAuthorized, false);
      assert.equal(pairing.publicSiteWrites, false);
    }
  });

  await t.test("different target on the same site cannot become active concurrently", async () => {
    await clear();
    const first = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000002",
      handle: "w04-product-two",
      subjectSuffix: "site-a",
    });
    const second = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000003",
      handle: "w04-product-three",
      subjectSuffix: "site-b",
    });

    assert.equal((await store.reserve(first.input)).kind, "created");
    const blocked = await store.reserve(second.input);
    assert.equal(blocked.kind, "site_concurrency_conflict");

    const rows = await admin.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_reservations",
    );
    assert.equal(rows[0]?.count, 1);
  });

  await t.test("different lineage for the same target fails as target conflict", async () => {
    await clear();
    const first = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000004",
      handle: "w04-product-four",
      proposedValue: "After target first",
      subjectSuffix: "target-a",
    });
    const second = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000004",
      handle: "w04-product-four",
      proposedValue: "After target second",
      subjectSuffix: "target-b",
    });

    assert.equal((await store.reserve(first.input)).kind, "created");
    const blocked = await store.reserve(second.input);
    assert.equal(blocked.kind, "target_reservation_conflict");
  });

  await t.test("deterministic reservation-id mismatch is collision and never overwrite", async () => {
    await clear();
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000005",
      handle: "w04-product-five",
      subjectSuffix: "collision",
    });
    assert.equal((await store.reserve(scenario.input)).kind, "created");

    await admin.unsafe(
      "UPDATE policy_mutation_reservations SET recommendation_fingerprint=$2 WHERE reservation_id=$1",
      [scenario.input.intent.reservationId, "f".repeat(64)],
    );

    const collision = await store.reserve(scenario.input);
    assert.equal(collision.kind, "identity_collision");

    const rows = await admin.unsafe<
      { recommendation_fingerprint: string; count: number }[]
    >(
      "SELECT recommendation_fingerprint, COUNT(*) OVER ()::int AS count FROM policy_mutation_reservations WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );
    assert.equal(rows[0]?.count, 1);
    assert.equal(rows[0]?.recommendation_fingerprint, "f".repeat(64));
  });

  await t.test("stale unclaimed authorized reservation expires opportunistically and allows replacement", async () => {
    await clear();
    const first = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000006",
      handle: "w04-product-six",
      subjectSuffix: "expiry-a",
    });
    assert.equal((await store.reserve(first.input)).kind, "created");

    await admin.unsafe(
      "UPDATE policy_mutation_reservations SET expires_at=transaction_timestamp()-interval '1 minute' WHERE reservation_id=$1",
      [first.input.intent.reservationId],
    );

    const second = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000007",
      handle: "w04-product-seven",
      subjectSuffix: "expiry-b",
    });
    assert.equal((await store.reserve(second.input)).kind, "created");

    const oldRows = await admin.unsafe<
      { status: string; terminal_reason: string | null }[]
    >(
      "SELECT status, terminal_reason FROM policy_mutation_reservations WHERE reservation_id=$1",
      [first.input.intent.reservationId],
    );
    assert.equal(oldRows[0]?.status, "expired");
    assert.equal(
      oldRows[0]?.terminal_reason,
      "authorization_window_elapsed",
    );
  });

  await t.test("claimed rows are never auto-expired", async () => {
    await clear();
    const first = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000008",
      handle: "w04-product-eight",
      subjectSuffix: "claimed-a",
    });
    assert.equal((await store.reserve(first.input)).kind, "created");

    await admin.unsafe(
      "UPDATE policy_mutation_reservations SET status='claimed', claimed_at=transaction_timestamp(), expires_at=transaction_timestamp()-interval '1 minute' WHERE reservation_id=$1",
      [first.input.intent.reservationId],
    );

    const second = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000009",
      handle: "w04-product-nine",
      subjectSuffix: "claimed-b",
    });
    assert.equal(
      (await store.reserve(second.input)).kind,
      "site_concurrency_conflict",
    );

    const oldRows = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [first.input.intent.reservationId],
    );
    assert.equal(oldRows[0]?.status, "claimed");
  });

  await t.test("manual-intervention rows are never auto-expired", async () => {
    await clear();
    const first = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000010",
      handle: "w04-product-ten",
      subjectSuffix: "manual-a",
    });
    assert.equal((await store.reserve(first.input)).kind, "created");

    await admin.unsafe(
      "UPDATE policy_mutation_reservations SET status='manual_intervention', expires_at=transaction_timestamp()-interval '1 minute' WHERE reservation_id=$1",
      [first.input.intent.reservationId],
    );

    const second = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000011",
      handle: "w04-product-eleven",
      subjectSuffix: "manual-b",
    });
    assert.equal(
      (await store.reserve(second.input)).kind,
      "site_concurrency_conflict",
    );

    const oldRows = await admin.unsafe<{ status: string }[]>(
      "SELECT status FROM policy_mutation_reservations WHERE reservation_id=$1",
      [first.input.intent.reservationId],
    );
    assert.equal(oldRows[0]?.status, "manual_intervention");
  });

  await t.test("terminal replay returns terminal state and never creates a second row", async () => {
    await clear();
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime,
      productId: "100000012",
      handle: "w04-product-twelve",
      subjectSuffix: "terminal",
    });
    assert.equal((await store.reserve(scenario.input)).kind, "created");

    await admin.unsafe(
      "UPDATE policy_mutation_reservations SET status='consumed', terminal_at=transaction_timestamp(), terminal_reason='synthetic_test_terminal' WHERE reservation_id=$1",
      [scenario.input.intent.reservationId],
    );

    const replay = await store.reserve(scenario.input);
    assert.equal(replay.kind, "already_consumed");

    const rows = await admin.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM policy_mutation_reservations",
    );
    assert.equal(rows[0]?.count, 1);
  });

  await t.test("database transaction time rejects future-issued W03 authorization", async () => {
    await clear();
    const future = new Date(now.getTime() + 20 * 60_000).toISOString();
    const scenario = buildP88W04TestScenario({
      siteId,
      baseTime: future,
      productId: "100000013",
      handle: "w04-product-thirteen",
      subjectSuffix: "future",
    });

    await assert.rejects(
      store.reserve(scenario.input),
      /p88_w04_authorization_not_yet_issued/,
    );
  });

  const governanceAfter = await governanceCounts();
  assert.deepEqual(governanceAfter, governanceBefore);

  const storedColumns = await admin.unsafe<{ column_name: string }[]>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='policy_mutation_reservations' ORDER BY ordinal_position",
  );
  const names = storedColumns.map((row) => row.column_name).join(" ");
  assert.doesNotMatch(
    names,
    /proposal_text|current_value|proposed_value|access_token|refresh_token|secret|approval_actor/i,
  );
});
