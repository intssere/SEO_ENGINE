import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";

const TARGET_TABLES = Object.freeze([
  "first_party_crawl_terminal_failure_events",
  "first_party_crawl_accounting_snapshots",
  "first_party_crawl_terminal_failure_recovery_receipts",
] as const);

function migrationPath(): string {
  return fileURLToPath(
    new URL("../migrations/0010_first_party_crawl_terminal_failure_recovery.sql", import.meta.url),
  );
}

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P12_2_L10_13B_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p12_2_l10_13b_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p12_2_l10_13b_ephemeral_database_name_invalid");
  }
  return raw;
}

test("P12.2-L10.13B migration is additive, transactional, append-only, and contains no data backfill", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 3);
  assert.deepEqual(
    [...source.matchAll(/\bCREATE\s+TABLE\s+([a-z_]+)/gi)].map((match) => match[1]).sort(),
    [...TARGET_TABLES].sort(),
  );
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.equal((source.match(/\bCREATE\s+TRIGGER\s+/gi) ?? []).length, 3);
  assert.match(source, /p12_2_l10_13b_append_only_violation/);
  assert.match(source, /UNIQUE \(source_event_fingerprint\)/);
});

test("P12.2-L10.13B migration adds exactly three empty tables and rejects UPDATE/DELETE on disposable PostgreSQL", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P12_2_L10_13B_EPHEMERAL_DATABASE_URL is not configured");
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
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(Number(before[0]?.count ?? 0), 44);

  const beforeTargets = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name IN (
        'first_party_crawl_terminal_failure_events',
        'first_party_crawl_accounting_snapshots',
        'first_party_crawl_terminal_failure_recovery_receipts'
      )
  `;
  assert.equal(beforeTargets.length, 0);

  await sql.unsafe(await readFile(migrationPath(), "utf8"));

  const after = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(Number(after[0]?.count ?? 0), 47);

  const counts = await sql<{ table_name: string; count: number }[]>`
    SELECT 'first_party_crawl_terminal_failure_events' AS table_name, COUNT(*)::int AS count
      FROM first_party_crawl_terminal_failure_events
    UNION ALL
    SELECT 'first_party_crawl_accounting_snapshots', COUNT(*)::int
      FROM first_party_crawl_accounting_snapshots
    UNION ALL
    SELECT 'first_party_crawl_terminal_failure_recovery_receipts', COUNT(*)::int
      FROM first_party_crawl_terminal_failure_recovery_receipts
    ORDER BY table_name
  `;
  assert.ok(counts.every((row) => row.count === 0));

  const identities = await sql<{ id: string }[]>`
    SELECT id::text AS id FROM sites
    WHERE lower(domain)='diamondshelf.us'
      AND canonical_origin='https://diamondshelf.us'
      AND is_active=true
    LIMIT 1
  `;
  const siteId = identities[0]?.id;
  assert.ok(siteId);

  const hexA = "a".repeat(64);
  const hexB = "b".repeat(64);
  const hexC = "c".repeat(64);

  await assert.rejects(
    sql.begin(async (tx) => {
      await tx`
        INSERT INTO first_party_crawl_accounting_snapshots (
          accounting_snapshot_id, site_id, run_id, canonical_origin,
          execution_plan_fingerprint, checkpoint_fingerprint, checkpoint_revision,
          snapshot_fingerprint, whole_site_certified, terminal_failure_count,
          observed_at, snapshot_payload
        ) VALUES (
          '11111111-1111-4111-8111-111111111111'::uuid, ${siteId}::uuid, 'immutability-update',
          'https://diamondshelf.us', ${hexA}, ${hexB}, 1,
          ${hexC}, false, 1, '2026-10-06T00:00:00.000Z'::timestamptz,
          '{"version":"test"}'::jsonb
        )
      `;
      await tx`
        UPDATE first_party_crawl_accounting_snapshots
        SET terminal_failure_count=0
        WHERE run_id='immutability-update'
      `;
    }),
    /p12_2_l10_13b_append_only_violation/,
  );

  await assert.rejects(
    sql.begin(async (tx) => {
      await tx`
        INSERT INTO first_party_crawl_accounting_snapshots (
          accounting_snapshot_id, site_id, run_id, canonical_origin,
          execution_plan_fingerprint, checkpoint_fingerprint, checkpoint_revision,
          snapshot_fingerprint, whole_site_certified, terminal_failure_count,
          observed_at, snapshot_payload
        ) VALUES (
          '22222222-2222-4222-8222-222222222222'::uuid, ${siteId}::uuid, 'immutability-delete',
          'https://diamondshelf.us', ${hexA}, ${hexB}, 1,
          ${hexC}, false, 1, '2026-10-06T00:00:00.000Z'::timestamptz,
          '{"version":"test"}'::jsonb
        )
      `;
      await tx`
        DELETE FROM first_party_crawl_accounting_snapshots
        WHERE run_id='immutability-delete'
      `;
    }),
    /p12_2_l10_13b_append_only_violation/,
  );
});
