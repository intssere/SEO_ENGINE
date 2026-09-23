import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";
import {
  EXPECTED_P12_2_TABLE_COUNT,
  EXPECTED_P8_8_W04_TABLE_COUNT,
  ensureDiamondShelfIdentity,
} from "./runtime-bootstrap.js";

const TABLE = "policy_mutation_reservations";

const EXPECTED_COLUMNS = Object.freeze([
  "reservation_id",
  "reservation_version",
  "reservation_class",
  "reservation_fingerprint",
  "site_id",
  "policy_id",
  "policy_version",
  "policy_fingerprint",
  "evaluation_id",
  "evaluation_fingerprint",
  "materialization_id",
  "materialization_fingerprint",
  "materialization_idempotency_fingerprint",
  "proposal_id",
  "proposal_fingerprint",
  "recommendation_fingerprint",
  "recommendation_idempotency_key",
  "target_binding_fingerprint",
  "provider",
  "domain",
  "resource_kind",
  "resource_gid",
  "target_url",
  "action_type",
  "field",
  "required_provider_scope",
  "before_fingerprint",
  "after_fingerprint",
  "w03_authorization_id",
  "w03_authorization_fingerprint",
  "policy_action_id",
  "w03_reservation_descriptor_fingerprint",
  "status",
  "authorized_at",
  "expires_at",
  "claimed_at",
  "terminal_at",
  "terminal_reason",
  "created_at",
  "updated_at",
] as const);

function migrationPath(): string {
  return fileURLToPath(
    new URL(
      "../migrations/0005_p8_8_policy_mutation_reservations.sql",
      import.meta.url,
    ),
  );
}

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

test("P8.8 W04 migration source is one additive transactional reservation table with no DML", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 1);
  assert.match(source, /CREATE TABLE policy_mutation_reservations/);
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.equal((source.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+/gi) ?? []).length, 3);
  assert.match(source, /ux_policy_mutation_reservations_active_site/);
  assert.match(source, /ux_policy_mutation_reservations_active_target/);
  assert.match(source, /idx_policy_mutation_reservations_site_history/);
  assert.match(source, /status IN \('authorized', 'claimed', 'manual_intervention'\)/);
  assert.match(source, /reservation_version = 'p8-8-w04-durable-reservation-v1'/);
  assert.match(source, /reservation_class = 'shopify\.product\.seo\.meta_description'/);
  assert.match(source, /provider = 'shopify'/);
  assert.match(source, /domain = 'diamondshelf\.us'/);
  assert.match(source, /field = 'meta_description'/);
  assert.match(source, /required_provider_scope = 'write_products'/);
  assert.match(source, /before_fingerprint <> after_fingerprint/);
  assert.doesNotMatch(
    source,
    /proposal_text|proposed_value|current_value|raw_response|access_token|refresh_token|oauth|secret|approval_actor/i,
  );
});

test("P8.8 W04 migration applies only to the dedicated ephemeral 37-table P12.2 baseline", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P8_8_W04_EPHEMERAL_DATABASE_URL is not configured");
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
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
  );
  assert.equal(Number(before[0]?.count ?? 0), EXPECTED_P12_2_TABLE_COUNT);

  const existing = await sql.unsafe<{ table_name: string }[]>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'policy_mutation_reservations'",
  );
  assert.equal(existing.length, 0, "W04 table must not pre-exist");

  const migration = await readFile(migrationPath(), "utf8");
  await sql.unsafe(migration);

  const after = await sql.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
  );
  assert.equal(Number(after[0]?.count ?? 0), EXPECTED_P8_8_W04_TABLE_COUNT);

  const columns = await sql.unsafe<{ column_name: string }[]>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'policy_mutation_reservations' ORDER BY ordinal_position",
  );
  assert.deepEqual(columns.map((row) => row.column_name), [...EXPECTED_COLUMNS]);

  const indexes = await sql.unsafe<{ indexname: string; indexdef: string }[]>(
    "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'policy_mutation_reservations' ORDER BY indexname",
  );
  const names = indexes.map((row) => row.indexname);
  assert.ok(names.includes("policy_mutation_reservations_pkey"));
  assert.ok(names.includes("policy_mutation_reservations_reservation_fingerprint_key"));
  assert.ok(names.includes("policy_mutation_reservations_w03_authorization_fingerprint_key"));
  assert.ok(names.includes("policy_mutation_reservations_policy_action_id_key"));
  assert.ok(names.includes("ux_policy_mutation_reservations_active_site"));
  assert.ok(names.includes("ux_policy_mutation_reservations_active_target"));
  assert.ok(names.includes("idx_policy_mutation_reservations_site_history"));

  const activeSite = indexes.find(
    (row) => row.indexname === "ux_policy_mutation_reservations_active_site",
  );
  const activeTarget = indexes.find(
    (row) => row.indexname === "ux_policy_mutation_reservations_active_target",
  );
  assert.match(activeSite?.indexdef ?? "", /UNIQUE INDEX/);
  assert.match(activeSite?.indexdef ?? "", /WHERE \(status = ANY/);
  assert.match(activeTarget?.indexdef ?? "", /UNIQUE INDEX/);
  assert.match(activeTarget?.indexdef ?? "", /resource_gid/);
  assert.match(activeTarget?.indexdef ?? "", /field/);

  const checks = await sql.unsafe<{ definition: string }[]>(
    "SELECT pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = 'public' AND t.relname = 'policy_mutation_reservations' AND c.contype = 'c'",
  );
  const checkText = checks.map((row) => row.definition).join("\n");
  assert.match(checkText, /p8-8-w04-durable-reservation-v1/);
  assert.match(checkText, /shopify\.product\.seo\.meta_description/);
  assert.match(checkText, /diamondshelf\.us/);
  assert.match(checkText, /meta_description/);
  assert.match(checkText, /write_products/);

  const rows = await sql.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM policy_mutation_reservations",
  );
  assert.equal(rows[0]?.count, 0);

  const identity = await ensureDiamondShelfIdentity(databaseUrl);
  assert.equal(identity.status, "ready");
  assert.equal(identity.tableCount, EXPECTED_P8_8_W04_TABLE_COUNT);
  assert.equal(identity.domain, "diamondshelf.us");
});
