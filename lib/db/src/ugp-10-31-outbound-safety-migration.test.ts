import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";
import {
  EXPECTED_UGP_10_3_TABLE_COUNT,
  EXPECTED_UGP_10_31_TABLE_COUNT,
  ensureDiamondShelfIdentity,
} from "./runtime-bootstrap.js";

function migrationPath(): string {
  return fileURLToPath(
    new URL("../migrations/0009_ugp_10_31_outbound_safety_ledger.sql", import.meta.url),
  );
}

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

test("UGP-10.31 migration source is additive, transactional, bounded, and contains no DML", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 3);
  assert.equal((source.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+/gi) ?? []).length, 6);
  assert.equal((source.match(/\bCREATE\s+TRIGGER\s+/gi) ?? []).length, 4);
  assert.equal((source.match(/\bCREATE\s+FUNCTION\s+/gi) ?? []).length, 1);
  assert.match(source, /CREATE TABLE authority_outreach_suppressions/);
  assert.match(source, /CREATE TABLE authority_outreach_send_reservations/);
  assert.match(source, /CREATE TABLE authority_outreach_send_safety_events/);
  assert.match(source, /logical_send_key char\(64\) NOT NULL UNIQUE/);
  assert.match(source, /ux_authority_outreach_send_reservations_active_contact/);
  assert.match(source, /status IN \('reserved','uncertain'\)/);
  assert.match(source, /explicit_opt_out/);
  assert.match(source, /provider_result_uncertain/);
  assert.match(source, /authority_outreach_safety_audit_is_immutable/);
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.doesNotMatch(
    source,
    /email_address|contact_value|message_body|email_body|access_token|refresh_token|oauth|password|provider_secret|credential_value/i,
  );
});

test("UGP-10.31 migration applies only to localhost UGP-10.3 baseline and immutable ledgers reject mutation", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("UGP_10_31_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 2,
  });
  t.after(async () => {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  });

  const before = await sql.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(before[0]?.count ?? 0), EXPECTED_UGP_10_3_TABLE_COUNT);

  for (const table of [
    "authority_outreach_suppressions",
    "authority_outreach_send_reservations",
    "authority_outreach_send_safety_events",
  ]) {
    const rows = await sql.unsafe<{ relation: string | null }[]>(
      "SELECT to_regclass($1)::text AS relation",
      ["public." + table],
    );
    assert.equal(rows[0]?.relation ?? null, null);
  }

  await sql.unsafe(await readFile(migrationPath(), "utf8"));

  const after = await sql.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(after[0]?.count ?? 0), EXPECTED_UGP_10_31_TABLE_COUNT);

  const identity = await ensureDiamondShelfIdentity(databaseUrl);
  assert.equal(identity.status, "ready");
  assert.equal(identity.tableCount, EXPECTED_UGP_10_31_TABLE_COUNT);

  const columns = await sql.unsafe<{ table_name: string; column_name: string }[]>(
    "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('authority_outreach_suppressions','authority_outreach_send_reservations','authority_outreach_send_safety_events') ORDER BY table_name,ordinal_position",
  );
  const names = columns.map((row) => row.column_name).join(" ");
  assert.doesNotMatch(
    names,
    /email_address|contact_value|message_body|email_body|access_token|refresh_token|password|provider_secret|credential_value/i,
  );

  const triggers = await sql.unsafe<{ table_name: string; tgname: string }[]>(
    "SELECT c.relname AS table_name,t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE NOT t.tgisinternal AND c.relname IN ('authority_outreach_suppressions','authority_outreach_send_safety_events') ORDER BY c.relname,t.tgname",
  );
  assert.deepEqual(
    triggers.map((row) => row.table_name + ":" + row.tgname),
    [
      "authority_outreach_send_safety_events:authority_outreach_send_safety_events_reject_truncate",
      "authority_outreach_send_safety_events:authority_outreach_send_safety_events_reject_update_delete",
      "authority_outreach_suppressions:authority_outreach_suppressions_reject_truncate",
      "authority_outreach_suppressions:authority_outreach_suppressions_reject_update_delete",
    ],
  );

  const sites = await sql.unsafe<{ id: string }[]>(
    "SELECT id::text AS id FROM sites WHERE lower(domain)='diamondshelf.us' AND is_active=true ORDER BY updated_at DESC LIMIT 1",
  );
  const siteId = sites[0]?.id;
  assert.ok(siteId);

  await sql.unsafe("BEGIN");
  try {
    await sql.unsafe(
      "INSERT INTO authority_outreach_suppressions(suppression_id,suppression_version,suppression_fingerprint,site_id,recipient_domain,contact_point_fingerprint,reason_code,suppressed_by,suppressed_at) VALUES($1,$2,$3,$4::uuid,$5,$6,$7,$8,$9::timestamptz)",
      [
        "uaos-" + "a".repeat(24),
        "ugp-10-31-outbound-suppression-v1",
        "a".repeat(64),
        siteId,
        "diamondshelf.us",
        "b".repeat(64),
        "manual_suppression",
        "operator@example.com",
        "2026-10-07T15:10:00.000Z",
      ],
    );

    await sql.unsafe(
      "INSERT INTO authority_outreach_send_reservations(reservation_id,reservation_version,reservation_fingerprint,logical_send_key,site_id,delivery_binding_authorization_decision_fingerprint,delivery_binding_authorization_review_spec_fingerprint,prospect_fingerprint,opportunity_fingerprint,candidate_fingerprint,selected_role_candidate_fingerprint,selected_contact_point_fingerprint,send_review_fingerprint,quality_gate_fingerprint,recipient_domain,status,reserved_at,expires_at) VALUES($1,$2,$3,$4,$5::uuid,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'reserved',$16::timestamptz,$17::timestamptz)",
      [
        "uaosr-" + "c".repeat(24),
        "ugp-10-31-outbound-safety-reservation-v1",
        "c".repeat(64),
        "d".repeat(64),
        siteId,
        "e".repeat(64),
        "f".repeat(64),
        "1".repeat(64),
        "2".repeat(64),
        "3".repeat(64),
        "4".repeat(64),
        "5".repeat(64),
        "6".repeat(64),
        "7".repeat(64),
        "diamondshelf.us",
        "2026-10-07T15:10:00.000Z",
        "2026-10-07T15:25:00.000Z",
      ],
    );

    await sql.unsafe(
      "INSERT INTO authority_outreach_send_safety_events(event_id,event_version,event_fingerprint,reservation_id,reservation_fingerprint,site_id,sequence,previous_event_fingerprint,event_type,event_reason,actor_id,occurred_at) VALUES($1,$2,$3,$4,$5,$6::uuid,1,NULL,'reserved','safety_preflight_passed',$7,$8::timestamptz)",
      [
        "uaose-" + "8".repeat(24),
        "ugp-10-31-outbound-safety-event-v1",
        "8".repeat(64),
        "uaosr-" + "c".repeat(24),
        "c".repeat(64),
        siteId,
        "operator@example.com",
        "2026-10-07T15:10:00.000Z",
      ],
    );

    for (const [name, statement] of [
      ["suppression_update", "UPDATE authority_outreach_suppressions SET reason_code='compliance_hold'"],
      ["suppression_delete", "DELETE FROM authority_outreach_suppressions"],
      ["suppression_truncate", "TRUNCATE authority_outreach_suppressions"],
      ["event_update", "UPDATE authority_outreach_send_safety_events SET event_reason='operator_release'"],
      ["event_delete", "DELETE FROM authority_outreach_send_safety_events"],
      ["event_truncate", "TRUNCATE authority_outreach_send_safety_events"],
    ] as const) {
      await sql.unsafe("SAVEPOINT " + name);
      try {
        await sql.unsafe(statement);
        assert.fail(name + " unexpectedly succeeded");
      } catch (error) {
        assert.equal((error as { code?: string }).code, "55000");
      }
      await sql.unsafe("ROLLBACK TO SAVEPOINT " + name);
      await sql.unsafe("RELEASE SAVEPOINT " + name);
    }

    await sql.unsafe(
      "UPDATE authority_outreach_send_reservations SET status='released',terminal_at=$2::timestamptz,terminal_reason='migration_test_release',updated_at=$2::timestamptz WHERE reservation_id=$1",
      ["uaosr-" + "c".repeat(24), "2026-10-07T15:11:00.000Z"],
    );
    const updated = await sql.unsafe<{ status: string }[]>(
      "SELECT status FROM authority_outreach_send_reservations WHERE reservation_id=$1",
      ["uaosr-" + "c".repeat(24)],
    );
    assert.equal(updated[0]?.status, "released");
  } finally {
    await sql.unsafe("ROLLBACK");
  }
});
