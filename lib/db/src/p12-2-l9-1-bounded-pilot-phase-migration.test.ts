import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";

const SITE_ID = "eb1da9ee-539c-4200-8f04-f64ccaea7768";
const ORIGIN = "https://diamondshelf.us";
const ALLOWED_PHASES = ["bounded_pilot", "full_initial", "full_interrupt", "full_resume", "full_reconciliation", "incremental"] as const;

function migrationPath(): string {
  return fileURLToPath(new URL("../migrations/0009_first_party_crawl_l2_bounded_pilot_phase.sql", import.meta.url));
}

function dedicatedEphemeralUrl(): string | null {
  const raw = process.env.P12_2_L6_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const parsed = new URL(raw);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error("p12_2_l9_1_ephemeral_database_must_be_localhost");
  }
  if (parsed.pathname.replace(/^\//, "") !== "seo_engine_test") {
    throw new Error("p12_2_l9_1_ephemeral_database_name_invalid");
  }
  return raw;
}

function fingerprint(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

test("P12.2-L9.1 migration changes only the durable invocation phase constraint", async () => {
  const source = await readFile(migrationPath(), "utf8");
  assert.match(source, /^BEGIN;/);
  assert.match(source, /COMMIT;\s*$/);
  assert.match(source, /DROP CONSTRAINT first_party_crawl_l2_invocations_phase_check/);
  assert.match(source, /ADD CONSTRAINT first_party_crawl_l2_invocations_phase_check/);
  for (const phase of ALLOWED_PHASES) {
    assert.match(source, new RegExp("'" + phase + "'"));
  }
  assert.equal((source.match(/\bCREATE\s+TABLE\b/gi) ?? []).length, 0);
  assert.equal((source.match(/\bDROP\s+TABLE\b/gi) ?? []).length, 0);
  assert.equal((source.match(/\bCREATE\s+INDEX\b/gi) ?? []).length, 0);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
});

test("P12.2-L9.1 admits bounded_pilot, preserves legacy phases, and rejects unknown phases", async (t) => {
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

  const table = await sql.unsafe<{ present: boolean }[]>(
    "SELECT to_regclass('public.first_party_crawl_l2_invocations') IS NOT NULL AS present",
  );
  assert.equal(table[0]?.present, true, "0008 durable invocation table must already exist");

  const before = await sql.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  const beforeCount = Number(before[0]?.count ?? 0);

  await sql.unsafe(await readFile(migrationPath(), "utf8"));

  const after = await sql.unsafe<{ count: number }[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(after[0]?.count ?? 0), beforeCount);

  const inserted: string[] = [];
  t.after(async () => {
    for (const value of inserted) {
      await sql
        .unsafe("DELETE FROM first_party_crawl_l2_invocations WHERE packet_fingerprint = $1", [value])
        .catch(() => undefined);
    }
  });

  for (const [index, phase] of ALLOWED_PHASES.entries()) {
    const packetFingerprint = fingerprint("p12-2-l9-1:" + phase);
    inserted.push(packetFingerprint);
    const rows = await sql.unsafe<{ phase: string }[]>(
      "INSERT INTO first_party_crawl_l2_invocations (invocation_id, site_id, packet_fingerprint, phase, run_id, canonical_origin, observed_at, status, receipt_fingerprint, receipt_payload) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7::timestamptz,'claimed',NULL,NULL) RETURNING phase",
      [randomUUID(), SITE_ID, packetFingerprint, phase, "p12-2-l9-1-" + index, ORIGIN, "2026-10-04T09:30:00.000Z"],
    );
    assert.equal(rows[0]?.phase, phase);
  }

  await assert.rejects(
    () =>
      sql.unsafe(
        "INSERT INTO first_party_crawl_l2_invocations (invocation_id, site_id, packet_fingerprint, phase, run_id, canonical_origin, observed_at, status, receipt_fingerprint, receipt_payload) VALUES ($1::uuid,$2::uuid,$3,'unknown_phase','p12-2-l9-1-unknown',$4,$5::timestamptz,'claimed',NULL,NULL)",
        [randomUUID(), SITE_ID, fingerprint("p12-2-l9-1:unknown"), ORIGIN, "2026-10-04T09:30:01.000Z"],
      ),
    /first_party_crawl_l2_invocations_phase_check/,
  );
});
