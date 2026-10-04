import { describe, expect, it } from "vitest";
import {
  P12_2_L10_PACKET_FINGERPRINT,
  P12_2_L10_PHASE,
  P12_2_L10_QUERIES,
  P12_2_L10_RUN_ID,
  assertP122L10QueryContract,
  p122L10AuthorizationFingerprint,
  p122L10AuthorizationLiteral,
  p122L10QuerySetFingerprint,
} from "./p12-2-l10-packet-005-durable-receipt-certification.js";

describe("P12.2-L10 packet 005 durable receipt certification", () => {
  it("is bound to packet 005 and bounded_pilot", () => {
    expect(P12_2_L10_PACKET_FINGERPRINT).toBe("669a9120f744e3470d1f106d7a094b414015d25b5da8f37ac2864765f4254f85");
    expect(P12_2_L10_RUN_ID).toBe("p12-2-diamond-shelf-bounded-pilot-005");
    expect(P12_2_L10_PHASE).toBe("bounded_pilot");
  });

  it("contains only single SELECT statements", () => {
    expect(() => assertP122L10QueryContract()).not.toThrow();
    expect(P12_2_L10_QUERIES).toHaveLength(7);
    for (const query of P12_2_L10_QUERIES) {
      expect(query.sql.trim().toUpperCase().startsWith("SELECT")).toBe(true);
      expect(query.sql.includes(";")).toBe(false);
    }
  });

  it("binds durable invocation, checkpoint, and no completed whole-site run", () => {
    const byId = new Map(P12_2_L10_QUERIES.map((query) => [query.id, query.sql]));
    expect(byId.get("invocation_receipt")).toContain("first_party_crawl_l2_invocations");
    expect(byId.get("checkpoint_state")).toContain("first_party_crawl_checkpoints");
    expect(byId.get("completed_run_state")).toContain("first_party_crawl_completed_runs");
    expect(byId.get("bounded_persistence_guard")).toContain("NOT EXISTS");
    expect(byId.get("durable_completion_guard")).toContain("status='completed'");
  });

  it("produces deterministic fingerprints and exact authorization prefix", () => {
    expect(p122L10QuerySetFingerprint()).toMatch(/^[0-9a-f]{64}$/);
    expect(p122L10AuthorizationFingerprint()).toMatch(/^[0-9a-f]{64}$/);
    expect(p122L10AuthorizationLiteral()).toBe(
      "AUTHORIZE:P12_2_L10_PACKET_005_READ_ONLY:" + p122L10AuthorizationFingerprint(),
    );
  });
});
