import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import type {
  P122L2DurableReceiptStore,
  P122L2Packet,
  P122L2Receipt,
} from "./p12-2-l2-one-shot-operator-caller.js";

type Sql = ReturnType<typeof postgres>;

const HEX64 = /^[0-9a-f]{64}$/;

function requireHex(value: string, code: string): string {
  if (!HEX64.test(value)) throw new Error(code);
  return value;
}

function assertPacket(packet: P122L2Packet): void {
  if (packet.siteId !== DIAMOND_SHELF_SITE_ID) throw new Error("p12_2_l2_store_site_id_mismatch");
  if (packet.canonicalOrigin !== DIAMOND_SHELF_CANONICAL_ORIGIN) {
    throw new Error("p12_2_l2_store_origin_mismatch");
  }
  requireHex(packet.fingerprint, "p12_2_l2_store_packet_fingerprint_invalid");
}

function assertReceipt(packet: P122L2Packet, receipt: P122L2Receipt): void {
  if (receipt.packetFingerprint !== packet.fingerprint) {
    throw new Error("p12_2_l2_store_receipt_packet_mismatch");
  }
  if (receipt.phase !== packet.phase || receipt.runId !== packet.runId) {
    throw new Error("p12_2_l2_store_receipt_lineage_mismatch");
  }
  requireHex(receipt.fingerprint, "p12_2_l2_store_receipt_fingerprint_invalid");
}

export type P122L2PostgresReceiptStoreOptions = {
  databaseUrl?: string | null;
  sqlFactory?: ((databaseUrl: string) => Sql) | null;
};

export class P122L2PostgresReceiptStore implements P122L2DurableReceiptStore {
  private readonly databaseUrl: string;
  private readonly sqlFactory: (databaseUrl: string) => Sql;

  constructor(options: P122L2PostgresReceiptStoreOptions = {}) {
    this.databaseUrl = options.databaseUrl?.trim() ?? "";
    this.sqlFactory = options.sqlFactory ?? ((databaseUrl) => postgres(databaseUrl, {
      max: 1,
      prepare: false,
      connect_timeout: 8,
      idle_timeout: 2,
    }));
  }

  private async withSql<T>(operation: (sql: Sql) => Promise<T>): Promise<T> {
    if (!this.databaseUrl) throw new Error("p12_2_l2_store_database_unconfigured");
    const sql = this.sqlFactory(this.databaseUrl);
    try {
      return await operation(sql);
    } finally {
      await sql.end({ timeout: 1 }).catch(() => undefined);
    }
  }

  async claim(packet: P122L2Packet): Promise<void> {
    assertPacket(packet);
    await this.withSql(async (sql) => {
      const rows = await sql<{ packet_fingerprint: string }[]>`
        INSERT INTO first_party_crawl_l2_invocations (
          invocation_id, site_id, packet_fingerprint, phase, run_id,
          canonical_origin, observed_at, status, receipt_fingerprint, receipt_payload
        ) VALUES (
          ${randomUUID()}::uuid, ${DIAMOND_SHELF_SITE_ID}::uuid, ${packet.fingerprint},
          ${packet.phase}, ${packet.runId}, ${DIAMOND_SHELF_CANONICAL_ORIGIN},
          ${packet.observedAt}::timestamptz, 'claimed', NULL, NULL
        )
        ON CONFLICT (packet_fingerprint) DO NOTHING
        RETURNING packet_fingerprint
      `;
      if (rows.length !== 1) throw new Error("p12_2_l2_packet_already_consumed");
    });
  }

  async complete(packet: P122L2Packet, receipt: P122L2Receipt): Promise<void> {
    assertPacket(packet);
    assertReceipt(packet, receipt);
    await this.withSql(async (sql) => {
      const rows = await sql<{ packet_fingerprint: string }[]>`
        UPDATE first_party_crawl_l2_invocations
        SET status = 'completed',
            receipt_fingerprint = ${receipt.fingerprint},
            receipt_payload = ${sql.json(receipt)}
        WHERE packet_fingerprint = ${packet.fingerprint}
          AND site_id = ${DIAMOND_SHELF_SITE_ID}::uuid
          AND phase = ${packet.phase}
          AND run_id = ${packet.runId}
          AND canonical_origin = ${DIAMOND_SHELF_CANONICAL_ORIGIN}
          AND observed_at = ${packet.observedAt}::timestamptz
          AND status = 'claimed'
          AND receipt_fingerprint IS NULL
          AND receipt_payload IS NULL
        RETURNING packet_fingerprint
      `;
      if (rows.length !== 1) throw new Error("p12_2_l2_store_completion_state_invalid");
    });
  }
}

export function p122L2DurableReceiptStoreCapability() {
  return Object.freeze({
    version: "p12-2-l2-durable-receipt-store-v1",
    siteId: DIAMOND_SHELF_SITE_ID,
    canonicalOrigin: DIAMOND_SHELF_CANONICAL_ORIGIN,
    table: "first_party_crawl_l2_invocations",
    claimBeforeExecution: true,
    replayDeniedAcrossProcesses: true,
    failureConsumesClaim: true,
    completionUpgradesClaim: true,
    automaticRetry: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  });
}
