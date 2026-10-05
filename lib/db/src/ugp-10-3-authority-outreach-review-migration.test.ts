import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";
import {
  EXPECTED_P8_8_W07_TABLE_COUNT,
  EXPECTED_UGP_10_3_TABLE_COUNT,
  ensureDiamondShelfIdentity,
} from "./runtime-bootstrap.js";

function migrationPath(): string {
  return fileURLToPath(
    new URL(
      "../migrations/0008_ugp_10_3_authority_outreach_review_events.sql",
      import.meta.url,
    ),
  );
}

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.UGP_10_3_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("ugp10_3_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("ugp10_3_ephemeral_database_name_invalid");
  }
  return raw;
}

test("UGP-10.3 migration is additive, transactional, immutable and contains no DML", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi) ?? []).length, 1);
  assert.equal((source.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+/gi) ?? []).length, 3);
  assert.equal((source.match(/\bCREATE\s+TRIGGER\s+/gi) ?? []).length, 2);
  assert.equal((source.match(/\bCREATE\s+FUNCTION\s+/gi) ?? []).length, 1);
  assert.match(source, /CREATE TABLE authority_outreach_review_events/);
  assert.match(source, /ON DELETE RESTRICT/);
  assert.match(source, /request_fingerprint char\(64\) NOT NULL UNIQUE/);
  assert.match(source, /review_fingerprint char\(64\) NOT NULL UNIQUE/);
  assert.match(source, /UNIQUE \(site_id, qualification_fingerprint, prospect_fingerprint, sequence\)/);
  assert.match(source, /approved_for_draft/);
  assert.match(source, /deferred/);
  assert.match(source, /editorial_fit_confirmed/);
  assert.match(source, /BEFORE UPDATE OR DELETE/);
  assert.match(source, /BEFORE TRUNCATE/);
  assert.match(source, /authority_outreach_review_events_are_immutable/);
  assert.equal(/\bCREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(source), false);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.doesNotMatch(
    source,
    /access_token|refresh_token|oauth|secret|password|email_body|message_body|provider_request/i,
  );
});

test("UGP-10.3 migration applies only to localhost W07 baseline and database rejects audit mutation", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("UGP_10_3_EPHEMERAL_DATABASE_URL is not configured");
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

  const before = await sql<{ count: number }[]>\`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  \`;
  assert.equal(Number(before[0]?.count ?? 0), EXPECTED_P8_8_W07_TABLE_COUNT);

  const absent = await sql<{ relation: string | null }[]>\`
    SELECT to_regclass('public.authority_outreach_review_events')::text AS relation
  \`;
  assert.equal(absent[0]?.relation ?? null, null);

  const migration = await readFile(migrationPath(), "utf8");
  await sql.unsafe(migration);

  const after = await sql<{ count: number }[]>\`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  \`;
  assert.equal(Number(after[0]?.count ?? 0), EXPECTED_UGP_10_3_TABLE_COUNT);

  const triggers = await sql<{ tgname: string }[]>\`
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid='authority_outreach_review_events'::regclass
      AND NOT tgisinternal
    ORDER BY tgname
  \`;
  assert.deepEqual(
    triggers.map((row) => row.tgname),
    [
      "authority_outreach_review_events_reject_truncate",
      "authority_outreach_review_events_reject_update_delete",
    ],
  );

  const identity = await ensureDiamondShelfIdentity(databaseUrl);
  assert.equal(identity.status, "ready");
  assert.equal(identity.tableCount, EXPECTED_UGP_10_3_TABLE_COUNT);

  const sites = await sql<{ id: string }[]>\`
    SELECT id::text AS id
    FROM sites
    WHERE lower(domain)='diamondshelf.us' AND is_active=true
    ORDER BY updated_at DESC
    LIMIT 1
  \`;
  const siteId = sites[0]?.id;
  assert.ok(siteId);

  await sql.unsafe("BEGIN");
  try {
    await sql\`
      INSERT INTO authority_outreach_review_events(
        event_id,event_version,event_fingerprint,request_fingerprint,site_id,
        sequence,previous_event_fingerprint,workspace_version,workspace_fingerprint,
        workspace_item_id,workspace_item_fingerprint,qualification_fingerprint,
        prospect_fingerprint,opportunity_fingerprint,target_domain,source_domain,
        target_url,qualification_status,decision,reason_code,reviewer_id,reviewed_at,
        review_fingerprint
      ) VALUES(
        \${"uaoe-"+"a".repeat(24)},
        \${"ugp-10-3-outreach-review-persistence-contract-v1"},
        \${"a".repeat(64)},
        \${"b".repeat(64)},
        \${siteId}::uuid,
        1,
        NULL,
        \${"ugp-10-1-outreach-review-workspace-v1"},
        \${"c".repeat(64)},
        \${"uaow-"+"d".repeat(24)},
        \${"d".repeat(64)},
        \${"e".repeat(64)},
        \${"f".repeat(64)},
        \${"1".repeat(64)},
        \${"diamondshelf.us"},
        \${"publisher.example.org"},
        \${"https://diamondshelf.us/guide"},
        \${"qualified_for_review"},
        \${"deferred"},
        \${"needs_more_context"},
        \${"operator@example.com"},
        \${"2026-10-05T14:55:00.000Z"},
        \${"2".repeat(64)}
      )
    \`;

    for (const [name, statement] of [
      ["update", "UPDATE authority_outreach_review_events SET reason_code='timing_not_right'"],
      ["delete", "DELETE FROM authority_outreach_review_events"],
      ["truncate", "TRUNCATE authority_outreach_review_events"],
    ] as const) {
      await sql.unsafe("SAVEPOINT immutability_" + name);
      try {
        await sql.unsafe(statement);
        assert.fail(name + " unexpectedly succeeded");
      } catch (error) {
        assert.equal((error as { code?: string }).code, "55000");
      }
      await sql.unsafe("ROLLBACK TO SAVEPOINT immutability_" + name);
      await sql.unsafe("RELEASE SAVEPOINT immutability_" + name);
    }
  } finally {
    await sql.unsafe("ROLLBACK");
  }

  const rows = await sql<{ count: number }[]>\`
    SELECT COUNT(*)::int AS count FROM authority_outreach_review_events
  \`;
  assert.equal(rows[0]?.count, 0);
});
