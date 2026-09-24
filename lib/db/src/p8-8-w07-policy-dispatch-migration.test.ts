import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";
import {
  EXPECTED_P8_8_W05_TABLE_COUNT,
  EXPECTED_P8_8_W07_TABLE_COUNT,
  ensureDiamondShelfIdentity,
} from "./runtime-bootstrap.js";

const TABLES = Object.freeze([
  "policy_mutation_dispatches",
  "policy_mutation_dispatch_events",
]);

function migrationPath(): string {
  return fileURLToPath(
    new URL(
      "../migrations/0007_p8_8_policy_mutation_dispatch.sql",
      import.meta.url,
    ),
  );
}

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

test("P8.8 W07 migration source is additive, transactional and contains no DML", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 2);
  assert.equal((source.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+/gi) ?? []).length, 4);
  for (const table of TABLES) {
    assert.match(source, new RegExp("CREATE TABLE " + table));
  }
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.match(source, /p8-8-w07-policy-single-action-apply-v1/);
  assert.match(source, /p8-8-w07-policy-dispatch-event-v1/);
  assert.match(source, /forward_attempt_count BETWEEN 0 AND 1/);
  assert.match(source, /rollback_attempt_count BETWEEN 0 AND 1/);
  assert.match(source, /execution_provenance = 'policy_single_action_apply'/);
  assert.match(source, /field = 'meta_description'/);
  assert.match(source, /gid:\/\/shopify\/Product/);
  assert.doesNotMatch(
    source,
    /raw_response|access_token|refresh_token|oauth|secret|approval_actor|APPLY_AND_VERIFY_TASK54|EXECUTE_AND_ROLLBACK_TASK53/i,
  );
});

test("P8.8 W07 migration applies only to the dedicated ephemeral W05 41-table baseline", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P8_8_W07_EPHEMERAL_DATABASE_URL is not configured");
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
  assert.equal(Number(before[0]?.count ?? 0), EXPECTED_P8_8_W05_TABLE_COUNT);

  const existing = await sql.unsafe<{ table_name: string }[]>(
    "SELECT table_name FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_name IN ("
      + "'policy_mutation_dispatches','policy_mutation_dispatch_events') "
      + "ORDER BY table_name",
  );
  assert.equal(existing.length, 0, "W07 tables must not pre-exist");

  const migration = await readFile(migrationPath(), "utf8");
  await sql.unsafe(migration);

  const after = await sql.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(after[0]?.count ?? 0), EXPECTED_P8_8_W07_TABLE_COUNT);

  const actual = await sql.unsafe<{ table_name: string }[]>(
    "SELECT table_name FROM information_schema.tables "
      + "WHERE table_schema='public' AND table_name IN ("
      + "'policy_mutation_dispatches','policy_mutation_dispatch_events') "
      + "ORDER BY table_name",
  );
  assert.deepEqual(actual.map((row) => row.table_name), [...TABLES].sort());

  for (const table of TABLES) {
    const rows = await sql.unsafe<{ count: number }[]>(
      "SELECT COUNT(*)::int AS count FROM " + table,
    );
    assert.equal(rows[0]?.count, 0);
  }

  const dispatchIndexes = await sql.unsafe<{ indexname: string }[]>(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' "
      + "AND tablename='policy_mutation_dispatches' ORDER BY indexname",
  );
  assert.ok(dispatchIndexes.some((row) =>
    row.indexname === "ux_policy_mutation_dispatches_blocking_site"));
  assert.ok(dispatchIndexes.some((row) =>
    row.indexname === "ux_policy_mutation_dispatches_blocking_target"));

  const identity = await ensureDiamondShelfIdentity(databaseUrl);
  assert.equal(identity.status, "ready");
  assert.equal(identity.tableCount, EXPECTED_P8_8_W07_TABLE_COUNT);
  assert.equal(identity.domain, "diamondshelf.us");
});
