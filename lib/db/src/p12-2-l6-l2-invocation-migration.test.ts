import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";

function migrationPath(): string {
  return fileURLToPath(
    new URL("../migrations/0008_first_party_crawl_l2_invocations.sql", import.meta.url),
  );
}

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P12_2_L6_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p12_2_l6_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p12_2_l6_ephemeral_database_name_invalid");
  }
  return raw;
}

test("P12.2-L6.1 durable invocation migration is additive, transactional, and DML-free", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 1);
  assert.match(source, /CREATE TABLE first_party_crawl_l2_invocations/);
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.equal(
    /\bDEFAULT\s+(?:now\s*\(|current_timestamp|gen_random_uuid\s*\(|uuid_generate)/i.test(source),
    false,
  );
  assert.equal((source.match(/\bCREATE\s+INDEX\s+/gi) ?? []).length, 1);
});

test("P12.2-L6.1 durable invocation migration adds exactly one empty table on dedicated ephemeral DB", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P12_2_L6_EPHEMERAL_DATABASE_URL is not configured");
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

  const before = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const beforeCount = Number(before[0]?.count ?? 0);
  assert.ok([37, 43].includes(beforeCount), `unexpected pre-0008 table count: ${beforeCount}`);

  const existing = await sql<{ present: boolean }[]>`
    SELECT to_regclass('public.first_party_crawl_l2_invocations') IS NOT NULL AS present
  `;
  assert.equal(existing[0]?.present, false);

  const migration = await readFile(migrationPath(), "utf8");
  await sql.unsafe(migration);

  const after = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  assert.equal(Number(after[0]?.count ?? 0), beforeCount + 1);

  const columns = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'first_party_crawl_l2_invocations'
    ORDER BY ordinal_position
  `;
  assert.deepEqual(columns.map((row) => row.column_name), [
    "invocation_id",
    "site_id",
    "packet_fingerprint",
    "phase",
    "run_id",
    "canonical_origin",
    "observed_at",
    "status",
    "receipt_fingerprint",
    "receipt_payload",
  ]);

  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM first_party_crawl_l2_invocations
  `;
  assert.equal(rows[0]?.count, 0);
});
