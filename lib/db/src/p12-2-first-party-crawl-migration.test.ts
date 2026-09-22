import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";
import {
  EXPECTED_CURRENT_TABLE_COUNT,
  EXPECTED_P12_2_TABLE_COUNT,
  ensureDiamondShelfIdentity,
} from "./runtime-bootstrap.js";

const TARGET_TABLES = Object.freeze([
  "first_party_crawl_checkpoints",
  "first_party_crawl_completed_runs",
  "first_party_crawl_incremental_receipts",
] as const);

const EXPECTED_COLUMNS = Object.freeze({
  first_party_crawl_checkpoints: Object.freeze([
    "checkpoint_id",
    "site_id",
    "run_id",
    "canonical_origin",
    "execution_plan_fingerprint",
    "checkpoint_fingerprint",
    "checkpoint_revision",
    "observed_at",
    "checkpoint_payload",
  ]),
  first_party_crawl_completed_runs: Object.freeze([
    "completed_run_id",
    "site_id",
    "run_id",
    "canonical_origin",
    "execution_plan_fingerprint",
    "snapshot_fingerprint",
    "observed_at",
    "snapshot_payload",
  ]),
  first_party_crawl_incremental_receipts: Object.freeze([
    "receipt_id",
    "site_id",
    "run_id",
    "canonical_origin",
    "incremental_plan_fingerprint",
    "execution_plan_fingerprint",
    "observed_at",
    "receipt_payload",
  ]),
} as const);

function migrationPath(): string {
  return fileURLToPath(
    new URL("../migrations/0004_first_party_crawl_execution_state.sql", import.meta.url),
  );
}

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P12_2_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p12_2_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p12_2_ephemeral_database_name_invalid");
  }
  return raw;
}

test("P12.2 migration source is additive, transactional, and contains no DML or hidden defaults", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 3);
  assert.deepEqual(
    [...source.matchAll(/\bCREATE\s+TABLE\s+([a-z_]+)/gi)]
      .map((match) => match[1])
      .sort(),
    [...TARGET_TABLES].sort(),
  );
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.equal(
    /\bDEFAULT\s+(?:now\s*\(|current_timestamp|gen_random_uuid\s*\(|uuid_generate)/i.test(source),
    false,
  );
  assert.equal(/raw_response|raw_sitemap|page_content|content_text|\bhtml\b|\bxml\b/i.test(source), false);
  assert.equal((source.match(/\bCREATE\s+INDEX\s+/gi) ?? []).length, 1);
});

test("P12.2 migration applies only to the dedicated ephemeral 34-table baseline", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P12_2_EPHEMERAL_DATABASE_URL is not configured");
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

  const beforeCount = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  assert.equal(Number(beforeCount[0]?.count ?? 0), EXPECTED_CURRENT_TABLE_COUNT);

  const beforeTargets = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'first_party_crawl_checkpoints',
        'first_party_crawl_completed_runs',
        'first_party_crawl_incremental_receipts'
      )
  `;
  assert.equal(beforeTargets.length, 0, "P12.2 target tables must not pre-exist");

  const migration = await readFile(migrationPath(), "utf8");
  await sql.unsafe(migration);

  const afterCount = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  assert.equal(Number(afterCount[0]?.count ?? 0), EXPECTED_P12_2_TABLE_COUNT);

  const columns = await sql<{ table_name: keyof typeof EXPECTED_COLUMNS; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'first_party_crawl_checkpoints',
        'first_party_crawl_completed_runs',
        'first_party_crawl_incremental_receipts'
      )
    ORDER BY table_name, ordinal_position
  `;
  for (const table of TARGET_TABLES) {
    assert.deepEqual(
      columns.filter((row) => row.table_name === table).map((row) => row.column_name),
      EXPECTED_COLUMNS[table],
    );
  }

  const latestIndex = await sql<{ indexname: string }[]>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_first_party_crawl_completed_latest'
  `;
  assert.equal(latestIndex.length, 1);

  const rowCounts = await sql<{ table_name: string; row_count: number }[]>`
    SELECT 'first_party_crawl_checkpoints' AS table_name, COUNT(*)::int AS row_count
      FROM first_party_crawl_checkpoints
    UNION ALL
    SELECT 'first_party_crawl_completed_runs', COUNT(*)::int
      FROM first_party_crawl_completed_runs
    UNION ALL
    SELECT 'first_party_crawl_incremental_receipts', COUNT(*)::int
      FROM first_party_crawl_incremental_receipts
    ORDER BY table_name
  `;
  assert.ok(rowCounts.every((row) => row.row_count === 0));

  const identity = await ensureDiamondShelfIdentity(databaseUrl);
  assert.equal(identity.status, "ready");
  assert.equal(identity.tableCount, EXPECTED_P12_2_TABLE_COUNT);
  assert.equal(identity.domain, "diamondshelf.us");
});
