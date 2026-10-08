import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { buildP122L1026Queries } from "./p12-2-l10-26-packet-014-comparable-preflight.js";

// Never use generic DATABASE_URL or a remote host for this verification.
function ephemeralDatabaseUrl(): string | null {
  const raw = process.env.P12_2_L10_27_EPHEMERAL_DATABASE_URL?.trim();
  if (!raw) return null;
  const value = new URL(raw);
  if (!["localhost", "127.0.0.1"].includes(value.hostname) ||
      value.pathname !== "/seo_engine_p12_2_prod_lineage_test") {
    throw new Error("p12_2_l10_27_requires_isolated_localhost_database");
  }
  return raw;
}

test("L10.27 executes all three exact L10.26 read-only queries on isolated PostgreSQL and fails closed absent Packet 014", async (t) => {
  const url = ephemeralDatabaseUrl();
  if (!url) {
    t.skip("P12_2_L10_27_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }
  const sql = postgres(url, { max: 1, prepare: false });
  t.after(async () => { await sql.end({ timeout: 1 }); });

  const before = await sql<{ table_count: number }[]>`
    SELECT COUNT(*)::int AS table_count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(before[0]?.table_count, 43);

  const [candidate, history, guard] = buildP122L1026Queries();
  assert.ok(candidate && history && guard);
  const candidates = await sql.unsafe(candidate.sql);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.candidate_count, 0);

  const rawHistory = await sql.unsafe(history.sql);
  assert.equal(rawHistory.length, 1);
  assert.deepEqual(
    {
      completed_run_count: rawHistory[0]?.completed_run_count,
      recovery_receipt_count: rawHistory[0]?.recovery_receipt_count,
      raw_uncertified_count: rawHistory[0]?.raw_uncertified_count,
    },
    { completed_run_count: 0, recovery_receipt_count: 0, raw_uncertified_count: 0 },
  );

  await assert.rejects(sql.unsafe(guard.sql), /division by zero/i);

  const after = await sql<{ table_count: number }[]>`
    SELECT COUNT(*)::int AS table_count
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `;
  assert.equal(after[0]?.table_count, before[0]?.table_count);
});
