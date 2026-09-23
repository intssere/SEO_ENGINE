import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";
import {
  EXPECTED_P8_8_W04_TABLE_COUNT,
  EXPECTED_P8_8_W05_TABLE_COUNT,
  ensureDiamondShelfIdentity,
} from "./runtime-bootstrap.js";

const TABLES = Object.freeze([
  "policy_mutation_control_state",
  "policy_mutation_control_events",
  "policy_mutation_claims",
]);

function migrationPath(): string {
  return fileURLToPath(
    new URL(
      "../migrations/0006_p8_8_policy_mutation_controls.sql",
      import.meta.url,
    ),
  );
}

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

test("P8.8 W05 migration source is additive, transactional and contains no DML", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 3);
  assert.equal((source.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+/gi) ?? []).length, 2);
  for (const table of TABLES) {
    assert.match(source, new RegExp("CREATE TABLE " + table));
  }
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.match(source, /p8-8-w05-control-v1/);
  assert.match(source, /p8-8-w05-control-event-v1/);
  assert.match(source, /p8-8-w05-control-claim-v1/);
  assert.match(source, /transition_action IN \('initialize', 'pause', 'drain', 'kill', 'resume'\)/);
  assert.match(source, /field = 'meta_description'/);
  assert.match(source, /gid:\/\/shopify\/Product/);
  assert.doesNotMatch(
    source,
    /proposal_text|proposed_value|current_value|raw_response|access_token|refresh_token|oauth|secret|approval_actor|APPLY_AND_VERIFY_TASK54/i,
  );
});

test("P8.8 W05 migration applies only to the dedicated ephemeral W04 38-table baseline", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P8_8_W05_EPHEMERAL_DATABASE_URL is not configured");
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
  assert.equal(Number(before[0]?.count ?? 0), EXPECTED_P8_8_W04_TABLE_COUNT);

  const existing = await sql.unsafe<{ table_name: string }[]>(
    "SELECT table_name FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_name IN ("
      + "'policy_mutation_control_state',"
      + "'policy_mutation_control_events',"
      + "'policy_mutation_claims') ORDER BY table_name",
  );
  assert.equal(existing.length, 0, "W05 tables must not pre-exist");

  const migration = await readFile(migrationPath(), "utf8");
  await sql.unsafe(migration);

  const after = await sql.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(after[0]?.count ?? 0), EXPECTED_P8_8_W05_TABLE_COUNT);

  const actualTables = await sql.unsafe<{ table_name: string }[]>(
    "SELECT table_name FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_name IN ("
      + "'policy_mutation_control_state',"
      + "'policy_mutation_control_events',"
      + "'policy_mutation_claims') ORDER BY table_name",
  );
  assert.deepEqual(
    actualTables.map((row) => row.table_name).sort(),
    [...TABLES].sort(),
  );

  const eventIndexes = await sql.unsafe<{ indexname: string }[]>(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='policy_mutation_control_events' ORDER BY indexname",
  );
  assert.ok(
    eventIndexes.some(
      (row) =>
        row.indexname === "idx_policy_mutation_control_events_site_history",
    ),
  );

  const claimIndexes = await sql.unsafe<{ indexname: string }[]>(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='policy_mutation_claims' ORDER BY indexname",
  );
  assert.ok(
    claimIndexes.some(
      (row) => row.indexname === "idx_policy_mutation_claims_site_history",
    ),
  );
  assert.ok(
    claimIndexes.some(
      (row) => row.indexname === "policy_mutation_claims_reservation_id_key",
    ),
  );

  for (const table of TABLES) {
    const rows = await sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM " + table,
    );
    assert.equal(rows[0]?.count, 0);
  }

  const identity = await ensureDiamondShelfIdentity(databaseUrl);
  assert.equal(identity.status, "ready");
  assert.equal(identity.tableCount, EXPECTED_P8_8_W05_TABLE_COUNT);
  assert.equal(identity.domain, "diamondshelf.us");
});
