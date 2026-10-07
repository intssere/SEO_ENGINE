import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";

const TARGET_TABLES = Object.freeze([
  "first_party_crawl_terminal_failure_dispositions",
  "first_party_crawl_terminal_failure_reconciliation_receipts",
] as const);

function migrationPath(): string {
  return fileURLToPath(
    new URL("../migrations/0011_first_party_crawl_expected_absence_disposition.sql", import.meta.url),
  );
}

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P12_2_L10_19_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p12_2_l10_19_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_p12_2_prod_lineage_test") {
    throw new Error("p12_2_l10_19_ephemeral_database_name_invalid");
  }
  return raw;
}

test("P12.2-L10.19 migration is additive, transactional, append-only, and contains no backfill", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 2);
  assert.deepEqual(
    [...source.matchAll(/\bCREATE\s+TABLE\s+([a-z_]+)/gi)].map((match) => match[1]).sort(),
    [...TARGET_TABLES].sort(),
  );
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.equal((source.match(/\bCREATE\s+TRIGGER\s+/gi) ?? []).length, 2);
  assert.match(source, /reject_p12_2_l10_13b_immutable_mutation/);
  assert.match(source, /absence_http_status IN \(404, 410\)/);
  assert.match(source, /stale_inventory_absence/);
  assert.match(source, /sitemap_orphan_absence/);
  assert.match(source, /certified_with_expected_absence/);
});

test("P12.2-L10.19 migration adds exactly two empty immutable tables to Production lineage", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P12_2_L10_19_EPHEMERAL_DATABASE_URL is not configured");
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
  assert.equal(Number(before[0]?.count ?? 0), 41);

  const lineage = await sql<{
    l2_present: boolean;
    recovery_table_count: number;
    policy_table_count: number;
  }[]>`
    SELECT
      to_regclass('public.first_party_crawl_l2_invocations') IS NOT NULL AS l2_present,
      (
        (to_regclass('public.first_party_crawl_terminal_failure_events') IS NOT NULL)::int +
        (to_regclass('public.first_party_crawl_accounting_snapshots') IS NOT NULL)::int +
        (to_regclass('public.first_party_crawl_terminal_failure_recovery_receipts') IS NOT NULL)::int
      ) AS recovery_table_count,
      (
        SELECT COUNT(*)::int
        FROM information_schema.tables
        WHERE table_schema='public'
          AND table_name IN (
            'policy_mutation_reservations',
            'policy_mutation_control_state',
            'policy_mutation_control_events',
            'policy_mutation_claims',
            'policy_mutation_dispatches',
            'policy_mutation_dispatch_events'
          )
      ) AS policy_table_count
  `;
  assert.equal(lineage[0]?.l2_present, true);
  assert.equal(Number(lineage[0]?.recovery_table_count ?? 0), 3);
  assert.equal(Number(lineage[0]?.policy_table_count ?? -1), 0);

  const beforeTargets = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name = ANY(${TARGET_TABLES as unknown as string[]})
  `;
  assert.equal(beforeTargets.length, 0);

  await sql.unsafe(await readFile(migrationPath(), "utf8"));

  const after = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(Number(after[0]?.count ?? 0), 43);

  const counts = await sql<{ table_name: string; count: number }[]>`
    SELECT 'first_party_crawl_terminal_failure_dispositions' AS table_name, COUNT(*)::int AS count
      FROM first_party_crawl_terminal_failure_dispositions
    UNION ALL
    SELECT 'first_party_crawl_terminal_failure_reconciliation_receipts', COUNT(*)::int
      FROM first_party_crawl_terminal_failure_reconciliation_receipts
    ORDER BY table_name
  `;
  assert.deepEqual(counts.map((row) => row.count), [0, 0]);

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
  const hexD = "d".repeat(64);
  const hexE = "e".repeat(64);

  await sql`
    INSERT INTO first_party_crawl_terminal_failure_events (
      event_id, site_id, run_id, canonical_origin, execution_plan_fingerprint,
      canonical_url, event_type, source_event_fingerprint,
      checkpoint_fingerprint, checkpoint_revision, observed_at,
      event_fingerprint, event_payload
    ) VALUES (
      '31111111-1111-4111-8111-111111111111'::uuid,
      ${siteId}::uuid,
      'l10-19-immutability',
      'https://diamondshelf.us',
      ${hexA},
      'https://diamondshelf.us/blogs/news',
      'terminal_failure',
      NULL,
      ${hexB},
      1,
      '2026-10-07T00:00:00.000Z'::timestamptz,
      ${hexC},
      ${sql.json({ fingerprint: hexC })}
    )
  `;

  await sql`
    INSERT INTO first_party_crawl_accounting_snapshots (
      accounting_snapshot_id, site_id, run_id, canonical_origin,
      execution_plan_fingerprint, checkpoint_fingerprint, checkpoint_revision,
      snapshot_fingerprint, whole_site_certified, terminal_failure_count,
      observed_at, snapshot_payload
    ) VALUES (
      '32222222-2222-4222-8222-222222222222'::uuid,
      ${siteId}::uuid,
      'l10-19-immutability',
      'https://diamondshelf.us',
      ${hexA},
      ${hexB},
      1,
      ${hexD},
      false,
      1,
      '2026-10-07T00:00:00.000Z'::timestamptz,
      ${sql.json({ version: "test", fingerprint: hexD })}
    )
  `;

  await sql`
    INSERT INTO first_party_crawl_terminal_failure_dispositions (
      disposition_id, site_id, run_id, canonical_origin,
      execution_plan_fingerprint, source_event_fingerprint,
      canonical_url, disposition_type, absence_http_status,
      fresh_inventory_fingerprint, present_in_fresh_inventory,
      verifier_image, verifier_deployment_id, observed_at,
      disposition_fingerprint, disposition_payload
    ) VALUES (
      '33333333-3333-4333-8333-333333333333'::uuid,
      ${siteId}::uuid,
      'l10-19-immutability',
      'https://diamondshelf.us',
      ${hexA},
      ${hexC},
      'https://diamondshelf.us/blogs/news',
      'stale_inventory_absence',
      404,
      ${hexE},
      false,
      'ghcr.io/intssere/test@sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      '34444444-4444-4444-8444-444444444444'::uuid,
      '2026-10-07T00:01:00.000Z'::timestamptz,
      ${hexB},
      ${sql.json({ version: "test", fingerprint: hexB })}
    )
  `;

  await sql`
    INSERT INTO first_party_crawl_terminal_failure_reconciliation_receipts (
      reconciliation_receipt_id, site_id, run_id, canonical_origin,
      execution_plan_fingerprint, source_accounting_snapshot_fingerprint,
      disposition_fingerprint, raw_terminal_failure_count,
      expected_absence_count, effective_unresolved_terminal_failure_count,
      status, observed_at, receipt_fingerprint, receipt_payload
    ) VALUES (
      '35555555-5555-4555-8555-555555555555'::uuid,
      ${siteId}::uuid,
      'l10-19-immutability',
      'https://diamondshelf.us',
      ${hexA},
      ${hexD},
      ${hexB},
      1,
      1,
      0,
      'certified_with_expected_absence',
      '2026-10-07T00:01:00.000Z'::timestamptz,
      ${hexE},
      ${sql.json({ version: "test", fingerprint: hexE })}
    )
  `;

  await assert.rejects(
    sql`
      UPDATE first_party_crawl_terminal_failure_dispositions
      SET absence_http_status=410
      WHERE disposition_id='33333333-3333-4333-8333-333333333333'::uuid
    `,
    /p12_2_l10_13b_append_only_violation/,
  );

  await assert.rejects(
    sql`
      DELETE FROM first_party_crawl_terminal_failure_reconciliation_receipts
      WHERE reconciliation_receipt_id='35555555-5555-4555-8555-555555555555'::uuid
    `,
    /p12_2_l10_13b_append_only_violation/,
  );
});
