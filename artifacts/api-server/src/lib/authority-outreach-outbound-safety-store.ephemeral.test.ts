import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {
  AuthorityOutreachOutboundSafetyStore,
} from "./authority-outreach-outbound-safety-store.js";
import {
  buildAuthorityOutreachOutboundSafetyIntent,
} from "./authority-outreach-outbound-safety-intent.js";
import { buildUgp1031AuthorizationFixture } from "./authority-outreach-ugp-10-31-test-fixture.js";

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.UGP_10_31_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("ugp10_31_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("ugp10_31_ephemeral_database_name_invalid");
  }
  return raw;
}

const FP = (c: string) => c.repeat(64);

test("UGP-10.31 PostgreSQL outbound safety store fails closed under replay, uncertainty, rate, and suppression conditions", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("UGP_10_31_EPHEMERAL_DATABASE_URL is not configured");
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
  assert.equal(counts[0]?.count, 47);

  const siteRows = await admin.unsafe<{ id: string }[]>(
    "SELECT id::text AS id FROM sites WHERE lower(domain)='diamondshelf.us' AND is_active=true ORDER BY updated_at DESC LIMIT 1",
  );
  const siteId = siteRows[0]?.id;
  assert.ok(siteId);

  const emailFixture = buildUgp1031AuthorizationFixture("email_address");
  const emailIntentInput = {
    deliveryBindingAuthorizationDecision:
      emailFixture.deliveryBindingAuthorizationDecision,
    deliveryBindingAuthorizationDecisionInput:
      emailFixture.deliveryBindingAuthorizationDecisionInput,
  };
  const emailIntent =
    buildAuthorityOutreachOutboundSafetyIntent(emailIntentInput);

  const webFixture = buildUgp1031AuthorizationFixture("web_contact_form");
  const webIntentInput = {
    deliveryBindingAuthorizationDecision:
      webFixture.deliveryBindingAuthorizationDecision,
    deliveryBindingAuthorizationDecisionInput:
      webFixture.deliveryBindingAuthorizationDecisionInput,
  };
  const webIntent =
    buildAuthorityOutreachOutboundSafetyIntent(webIntentInput);

  assert.notEqual(
    emailIntent.selectedContactPointFingerprint,
    webIntent.selectedContactPointFingerprint,
  );

  const store = new AuthorityOutreachOutboundSafetyStore({ databaseUrl });

  await t.test("simultaneous exact duplicates create one reservation and one exact replay", async () => {
    const input = {
      intent: emailIntent,
      intentInput: emailIntentInput,
      actorId: "operator@example.com",
    };
    const results = await Promise.all([
      store.reserve(input),
      store.reserve(input),
    ]);
    assert.deepEqual(
      results.map((result) => result.kind).sort(),
      ["created", "existing_reserved"],
    );

    const reservations = await admin.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM authority_outreach_send_reservations WHERE logical_send_key=$1",
      [emailIntent.logicalSendKey],
    );
    assert.equal(reservations[0]?.count, 1);

    const events = await admin.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM authority_outreach_send_safety_events WHERE reservation_id=$1",
      [emailIntent.reservationId],
    );
    assert.equal(events[0]?.count, 1);
  });

  await t.test("uncertain result is sticky and blocks exact replay", async () => {
    const transitioned = await store.transition({
      reservationId: emailIntent.reservationId,
      reservationFingerprint: emailIntent.reservationFingerprint,
      transition: "mark_uncertain",
      actorId: "operator@example.com",
    });
    assert.equal(transitioned.status, "transitioned");
    assert.equal(transitioned.receipt.status, "uncertain");

    const replay = await store.reserve({
      intent: emailIntent,
      intentInput: emailIntentInput,
      actorId: "operator@example.com",
    });
    assert.equal(replay.kind, "uncertain_previous_attempt");

    const events = await admin.unsafe<{ event_type: string }[]>(
      "SELECT event_type FROM authority_outreach_send_safety_events WHERE reservation_id=$1 ORDER BY sequence",
      [emailIntent.reservationId],
    );
    assert.deepEqual(
      events.map((row) => row.event_type),
      ["reserved", "marked_uncertain"],
    );
  });

  await t.test("expired reservation is reconciled durably before contact-rate rejection", async () => {
    const nowRows = await admin.unsafe<{ now: Date }[]>(
      "SELECT transaction_timestamp() AS now",
    );
    const now = nowRows[0]!.now;
    const reservedAt = new Date(now.getTime() - 60_000);
    const expiresAt = new Date(now.getTime() - 1_000);
    const reservationFingerprint = FP("a");
    const reservationId = "uaosr-" + reservationFingerprint.slice(0, 24);

    await admin.unsafe(
      "INSERT INTO authority_outreach_send_reservations(reservation_id,reservation_version,reservation_fingerprint,logical_send_key,site_id,delivery_binding_authorization_decision_fingerprint,delivery_binding_authorization_review_spec_fingerprint,prospect_fingerprint,opportunity_fingerprint,candidate_fingerprint,selected_role_candidate_fingerprint,selected_contact_point_fingerprint,send_review_fingerprint,quality_gate_fingerprint,recipient_domain,status,reserved_at,expires_at) VALUES($1,'ugp-10-31-outbound-safety-reservation-v1',$2,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'reserved',$15::timestamptz,$16::timestamptz)",
      [
        reservationId,
        reservationFingerprint,
        FP("b"),
        siteId,
        FP("c"),
        FP("d"),
        FP("e"),
        FP("f"),
        FP("1"),
        FP("2"),
        webIntent.selectedContactPointFingerprint,
        FP("3"),
        FP("4"),
        webIntent.recipientDomain,
        reservedAt.toISOString(),
        expiresAt.toISOString(),
      ],
    );
    const eventFingerprint = FP("5");
    await admin.unsafe(
      "INSERT INTO authority_outreach_send_safety_events(event_id,event_version,event_fingerprint,reservation_id,reservation_fingerprint,site_id,sequence,previous_event_fingerprint,event_type,event_reason,actor_id,occurred_at) VALUES($1,'ugp-10-31-outbound-safety-event-v1',$2,$3,$4,$5::uuid,1,NULL,'reserved','safety_preflight_passed','fixture:seed',$6::timestamptz)",
      [
        "uaose-" + eventFingerprint.slice(0, 24),
        eventFingerprint,
        reservationId,
        reservationFingerprint,
        siteId,
        reservedAt.toISOString(),
      ],
    );

    const blocked = await store.reserve({
      intent: webIntent,
      intentInput: webIntentInput,
      actorId: "operator@example.com",
    });
    assert.equal(blocked.kind, "contact_rate_limited");

    const row = await admin.unsafe<{ status: string; terminal_reason: string }[]>(
      "SELECT status,terminal_reason FROM authority_outreach_send_reservations WHERE reservation_id=$1",
      [reservationId],
    );
    assert.equal(row[0]?.status, "released");
    assert.equal(row[0]?.terminal_reason, "reservation_expired");

    const events = await admin.unsafe<{ event_type: string; event_reason: string }[]>(
      "SELECT event_type,event_reason FROM authority_outreach_send_safety_events WHERE reservation_id=$1 ORDER BY sequence",
      [reservationId],
    );
    assert.deepEqual(
      Array.from(events, (row) => ({
        event_type: row.event_type,
        event_reason: row.event_reason,
      })),
      [
        { event_type: "reserved", event_reason: "safety_preflight_passed" },
        { event_type: "released", event_reason: "reservation_expired" },
      ],
    );

    await admin.unsafe(
      "UPDATE authority_outreach_send_reservations SET reserved_at=transaction_timestamp()-interval '8 days',expires_at=transaction_timestamp()-interval '7 days' WHERE reservation_id=$1",
      [reservationId],
    );
  });

  await t.test("recipient-domain limit fails closed after five recent reservations", async () => {
    const nowRows = await admin.unsafe<{ now: Date }[]>(
      "SELECT transaction_timestamp() AS now",
    );
    const now = nowRows[0]!.now;
    for (const [index, c] of ["6", "7", "8", "9", "b"].entries()) {
      const reservationFingerprint = FP(c);
      const reservationId =
        "uaosr-" + reservationFingerprint.slice(0, 24);
      await admin.unsafe(
        "INSERT INTO authority_outreach_send_reservations(reservation_id,reservation_version,reservation_fingerprint,logical_send_key,site_id,delivery_binding_authorization_decision_fingerprint,delivery_binding_authorization_review_spec_fingerprint,prospect_fingerprint,opportunity_fingerprint,candidate_fingerprint,selected_role_candidate_fingerprint,selected_contact_point_fingerprint,send_review_fingerprint,quality_gate_fingerprint,recipient_domain,status,reserved_at,expires_at,terminal_at,terminal_reason) VALUES($1,'ugp-10-31-outbound-safety-reservation-v1',$2,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'released',$15::timestamptz,$16::timestamptz,$17::timestamptz,'fixture_historical_release')",
        [
          reservationId,
          reservationFingerprint,
          FP(String((index + 10) % 10)),
          siteId,
          FP("a"),
          FP("b"),
          FP("c"),
          FP("d"),
          FP("e"),
          FP("f"),
          FP(String(index)),
          FP("a"),
          FP("b"),
          webIntent.recipientDomain,
          new Date(now.getTime() - (index + 1) * 1000).toISOString(),
          new Date(now.getTime() + 900_000).toISOString(),
          now.toISOString(),
        ],
      );
    }

    const blocked = await store.reserve({
      intent: webIntent,
      intentInput: webIntentInput,
      actorId: "operator@example.com",
    });
    assert.equal(blocked.kind, "domain_rate_limited");
  });

  await t.test("monotonic suppression overrides later rate and reservation eligibility", async () => {
    const first = await store.suppress({
      ownedSiteDomain: webIntent.ownedSiteDomain,
      recipientDomain: webIntent.recipientDomain,
      contactPointFingerprint: webIntent.selectedContactPointFingerprint,
      reasonCode: "explicit_opt_out",
      actorId: "operator@example.com",
    });
    const replay = await store.suppress({
      ownedSiteDomain: webIntent.ownedSiteDomain,
      recipientDomain: webIntent.recipientDomain,
      contactPointFingerprint: webIntent.selectedContactPointFingerprint,
      reasonCode: "compliance_hold",
      actorId: "other-operator@example.com",
    });
    assert.equal(replay.suppressionFingerprint, first.suppressionFingerprint);
    assert.equal(replay.reasonCode, "explicit_opt_out");

    const blocked = await store.reserve({
      intent: webIntent,
      intentInput: webIntentInput,
      actorId: "operator@example.com",
    });
    assert.equal(blocked.kind, "suppressed_contact");
  });

  const rawColumns = await admin.unsafe<{ column_name: string }[]>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('authority_outreach_suppressions','authority_outreach_send_reservations','authority_outreach_send_safety_events') ORDER BY table_name,ordinal_position",
  );
  assert.doesNotMatch(
    rawColumns.map((row) => row.column_name).join(" "),
    /email_address|contact_value|message_body|email_body|access_token|refresh_token|password|provider_secret|credential_value/i,
  );
});
