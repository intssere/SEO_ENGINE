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


test("L10.27 accepts exact Packet 014 comparable evidence and rejects inconsistent lineage", async (t) => {
  const url = ephemeralDatabaseUrl();
  if (!url) { t.skip("P12_2_L10_27_EPHEMERAL_DATABASE_URL is not configured"); return; }
  const { randomUUID } = await import("node:crypto");
  const { DIAMOND_SHELF_SITE_ID } = await import("./first-party-live-adapters.js");
  const { DIAMOND_SHELF_CANONICAL_ORIGIN } = await import("./first-party-crawl-runtime-bridge.js");
  const { P12_2_L10_15_RUN_ID } = await import("./p12-2-l10-15-packet-014-full-initial.js");
  const {
    P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT: plan,
    P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT: checkpoint,
    P12_2_L10_18_FAILURE_EVENT_FINGERPRINT: failure,
    P12_2_L10_18_FAILURE_URL: failureUrl,
  } = await import("./p12-2-l10-18-packet-014-finalization-repair.js");
  const { P12_2_L10_19_C_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT: snapshot } =
    await import("./p12-2-l10-19-c-packet-014-post-disposition-certification.js");
  const sql = postgres(url, { max: 1, prepare: false });
  t.after(async () => { await sql.end({ timeout: 1 }); });
  const [candidate, history, guard] = buildP122L1026Queries();
  assert.ok(candidate && history && guard);
  const hex = (marker: string) => marker.padEnd(64, "0").slice(0, 64);
  const disposition = hex("a");
  const receipt = hex("b");
  const inventory = hex("c");
  const now = "2026-10-08T12:00:00.000Z";

  async function scenario(change: "valid" | "missing_disposition" | "missing_reconciliation" | "wrong_disposition" | "wrong_disposition_type" | "tampered_reconciliation" | "extra_raw" | "recovery") {
    const rollbackMarker = "p12_2_l10_27_rollback_" + change;
    await assert.rejects(sql.begin(async (tx) => {
      // Fixture inserts are permitted only inside this rollback-only localhost transaction.
      await tx`
        INSERT INTO first_party_crawl_terminal_failure_events (
          event_id, site_id, run_id, canonical_origin, execution_plan_fingerprint,
          canonical_url, event_type, source_event_fingerprint, checkpoint_fingerprint,
          checkpoint_revision, observed_at, event_fingerprint, event_payload
        ) VALUES (
          ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${P12_2_L10_15_RUN_ID},
          ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${plan}, ${failureUrl},
          'terminal_failure', NULL, ${checkpoint}, 1, ${now}::timestamptz,
          ${failure}, ${tx.json({fingerprint:failure})}
        )
      `;
      await tx`
        INSERT INTO first_party_crawl_accounting_snapshots (
          accounting_snapshot_id, site_id, run_id, canonical_origin,
          execution_plan_fingerprint, checkpoint_fingerprint, checkpoint_revision,
          snapshot_fingerprint, whole_site_certified, terminal_failure_count,
          observed_at, snapshot_payload
        ) VALUES (
          ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${P12_2_L10_15_RUN_ID},
          ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${plan}, ${checkpoint}, 306,
          ${snapshot}, false, 1, ${now}::timestamptz,
          ${tx.json({fingerprint:snapshot,certification:{certification:{wholeSiteCertified:false}}})}
        )
      `;
      if (change === "extra_raw") {
        await tx`
          INSERT INTO first_party_crawl_accounting_snapshots (
            accounting_snapshot_id, site_id, run_id, canonical_origin,
            execution_plan_fingerprint, checkpoint_fingerprint, checkpoint_revision,
            snapshot_fingerprint, whole_site_certified, terminal_failure_count,
            observed_at, snapshot_payload
          ) VALUES (
            ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${P12_2_L10_15_RUN_ID},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${plan}, ${hex("d")}, 307,
            ${hex("e")}, false, 1, ${now}::timestamptz,
            ${tx.json({fingerprint:hex("e"),certification:{certification:{wholeSiteCertified:false}}})}
          )
        `;
      }
      if (change !== "missing_disposition") {
        await tx`
          INSERT INTO first_party_crawl_terminal_failure_dispositions (
            disposition_id, site_id, run_id, canonical_origin, execution_plan_fingerprint,
            source_event_fingerprint, canonical_url, disposition_type, absence_http_status,
            fresh_inventory_fingerprint, present_in_fresh_inventory, verifier_image,
            verifier_deployment_id, observed_at, disposition_fingerprint, disposition_payload
          ) VALUES (
            ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${P12_2_L10_15_RUN_ID},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${plan}, ${failure},
            ${change==="wrong_disposition" ? DIAMOND_SHELF_CANONICAL_ORIGIN+"/not-news" : failureUrl},
            ${change==="wrong_disposition_type"?"stale_inventory_absence":"sitemap_orphan_absence"}, 404, ${inventory}, ${change!=="wrong_disposition_type"},
            ${"ghcr.io/intssere/seo-engine-test@sha256:"+hex("f")},
            ${randomUUID()}::uuid, ${now}::timestamptz,
            ${disposition}, ${tx.json({fingerprint:disposition})}
          )
        `;
      }
      if (change !== "missing_disposition" && change !== "missing_reconciliation") {
        await tx`
          INSERT INTO first_party_crawl_terminal_failure_reconciliation_receipts (
            reconciliation_receipt_id, site_id, run_id, canonical_origin, execution_plan_fingerprint,
            source_accounting_snapshot_fingerprint, disposition_fingerprint,
            raw_terminal_failure_count, expected_absence_count,
            effective_unresolved_terminal_failure_count, status, observed_at,
            receipt_fingerprint, receipt_payload
          ) VALUES (
            ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${P12_2_L10_15_RUN_ID},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${plan}, ${snapshot}, ${disposition},
            1, 1, 0, 'certified_with_expected_absence', ${now}::timestamptz,
            ${receipt},
            ${tx.json({
              fingerprint:receipt,
              sourceAccountingSnapshotFingerprint:change==="tampered_reconciliation"?hex("9"):snapshot,
              dispositionFingerprint:disposition,legacyWholeSiteCertified:false,
              status:"certified_with_expected_absence",rawTerminalFailureCount:1,
              expectedAbsenceCount:1,effectiveUnresolvedTerminalFailureCount:0,
            })}
          )
        `;
      }
      if (change === "recovery") {
        await tx`
          INSERT INTO first_party_crawl_terminal_failure_recovery_receipts (
            recovery_receipt_id, site_id, run_id, canonical_origin,
            execution_plan_fingerprint, source_checkpoint_fingerprint,
            source_checkpoint_revision, result_checkpoint_fingerprint,
            result_checkpoint_revision, recovery_plan_fingerprint,
            receipt_fingerprint, status, observed_at, receipt_payload
          ) VALUES (
            ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${P12_2_L10_15_RUN_ID},
            ${DIAMOND_SHELF_CANONICAL_ORIGIN}, ${plan}, ${checkpoint},
            1, ${hex("1")}, 2, ${hex("2")}, ${hex("3")}, 'incomplete',
            ${now}::timestamptz, ${tx.json({fixture:true})}
          )
        `;
      }

      const rows = await tx.unsafe(candidate.sql);
      const raw = await tx.unsafe(history.sql);
      if (change === "valid") {
        assert.equal(rows[0]?.candidate_count, 1);
        assert.equal(raw[0]?.completed_run_count, 0);
        assert.equal(raw[0]?.recovery_receipt_count, 0);
        assert.equal(raw[0]?.raw_uncertified_count, 1);
        const accepted = await tx.unsafe(guard.sql);
        assert.equal(accepted[0]?.comparable_guard, 1);
      } else {
        if (change === "extra_raw" || change === "recovery") {
          assert.equal(rows[0]?.candidate_count, 1);
        } else {
          assert.equal(rows[0]?.candidate_count, 0);
        }
        // A failed guard aborts this transaction; a savepoint makes its expected
        // SQL error observable without jeopardizing the outer rollback.
        await assert.rejects(tx.savepoint(async (sp) => {
          await sp.unsafe(guard.sql);
        }), /division by zero/i);
      }
      throw new Error(rollbackMarker);
    }), new RegExp(rollbackMarker));
  }
  for (const variant of [
    "valid", "missing_disposition", "missing_reconciliation", "wrong_disposition",
    "wrong_disposition_type", "tampered_reconciliation", "extra_raw", "recovery",
  ] as const) {
    await t.test(variant, async () => { await scenario(variant); });
  }
});
