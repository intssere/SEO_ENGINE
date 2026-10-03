import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {
  buildP122L2Packet,
  executeP122L2OneShotDurable,
  p122L2AuthorizationLiteral,
} from "./p12-2-l2-one-shot-operator-caller.js";
import { P122L2PostgresReceiptStore } from "./p12-2-l2-durable-receipt-store.js";
import {
  defaultP12_2InspectionConfig,
  P12_2_EXECUTION_CONFIRMATION,
} from "./first-party-crawl-manual.js";

const HEX_C = "c".repeat(64);

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

function executableConfig() {
  const config = defaultP12_2InspectionConfig();
  return {
    ...config,
    confirmation: P12_2_EXECUTION_CONFIRMATION,
    networkReady: true,
    liveExecutionAuthorized: true,
    persistenceReady: true,
    persistenceAuthorized: true,
  };
}

test("Postgres durable L2 receipt store claims once and upgrades the exact claim on dedicated ephemeral DB", async (t) => {
  const databaseUrl = dedicatedEphemeralUrl();
  if (!databaseUrl) {
    t.skip("P12_2_L6_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }

  const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 8, idle_timeout: 2 });
  t.after(async () => {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  });

  await sql`DELETE FROM first_party_crawl_l2_invocations`;

  const packet = buildP122L2Packet({
    phase: "full_initial",
    runId: "p12-2-l6-ephemeral-001",
    observedAt: "2026-10-02T18:45:00.000Z",
    config: executableConfig(),
  });
  const store = new P122L2PostgresReceiptStore({ databaseUrl });

  const receipt = await executeP122L2OneShotDurable({
    packet,
    authorizationLiteral: p122L2AuthorizationLiteral(packet),
    receiptStore: store,
    executor: {
      async execute() {
        return { status: "completed" as const, receiptFingerprint: HEX_C };
      },
    },
  });

  const rows = await sql<{
    packet_fingerprint: string;
    phase: string;
    run_id: string;
    status: string;
    receipt_fingerprint: string | null;
  }[]>`
    SELECT packet_fingerprint, phase, run_id, status, receipt_fingerprint
    FROM first_party_crawl_l2_invocations
    WHERE packet_fingerprint = ${packet.fingerprint}
  `;
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.packet_fingerprint, packet.fingerprint);
  assert.equal(rows[0]?.phase, packet.phase);
  assert.equal(rows[0]?.run_id, packet.runId);
  assert.equal(rows[0]?.status, "completed");
  assert.equal(rows[0]?.receipt_fingerprint, receipt.fingerprint);

  await assert.rejects(
    executeP122L2OneShotDurable({
      packet,
      authorizationLiteral: p122L2AuthorizationLiteral(packet),
      receiptStore: new P122L2PostgresReceiptStore({ databaseUrl }),
      executor: {
        async execute() {
          return { status: "completed" as const, receiptFingerprint: HEX_C };
        },
      },
    }),
    /p12_2_l2_packet_already_consumed/,
  );
});
