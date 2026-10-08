import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_26_VERSION,
  buildP122L1026Queries,
  assertP122L1026QueryContract,
  p122L1026QuerySetFingerprint,
} from "./p12-2-l10-26-packet-014-comparable-preflight.js";

test("L10.26 Packet 014 comparable certification is deterministic, read-only and fail-closed", () => {
  assert.equal(P12_2_L10_26_VERSION, "p12-2-l10-26-packet-014-comparable-readonly-preflight-v1");
  const queries=buildP122L1026Queries();
  assert.equal(queries.length,3);
  assert.deepEqual(queries.map(q=>q.id),[
    "packet_014_comparable_candidate",
    "packet_014_raw_history_immutability",
    "packet_014_comparable_guard",
  ]);
  assert.ok(queries.every(q=>/^SELECT\b/.test(q.sql)));
  assert.ok(queries[0]!.sql.includes("certified_with_expected_absence"));
  assert.ok(queries[0]!.sql.includes("whole_site_certified=false"));
  assert.ok(queries[0]!.sql.includes("effective_unresolved_terminal_failure_count=0"));
  assert.ok(queries[0]!.sql.includes("first_party_crawl_terminal_failure_dispositions"));
  assert.ok(queries[1]!.sql.includes("completed_run_count"));
  assert.ok(queries[1]!.sql.includes("recovery_receipt_count"));
  assert.ok(queries[2]!.sql.includes("SELECT 1 / CASE WHEN"));
  assert.doesNotThrow(()=>assertP122L1026QueryContract(queries));
  assert.match(p122L1026QuerySetFingerprint(),/^[0-9a-f]{64}$/);
  assert.equal(p122L1026QuerySetFingerprint(),p122L1026QuerySetFingerprint());
  assert.throws(()=>assertP122L1026QueryContract(queries.slice(0,2)),/query_count_invalid/);
  const changed=queries.map(q=>({...q}));
  changed[0]!.sql=changed[0]!.sql.replace("r.raw_terminal_failure_count=1","r.raw_terminal_failure_count=0");
  assert.throws(()=>assertP122L1026QueryContract(changed),/query_content_mismatch/);
  const write=queries.map(q=>({...q}));
  write[1]!.sql="UPDATE first_party_crawl_accounting_snapshots SET whole_site_certified=true";
  assert.throws(()=>assertP122L1026QueryContract(write),/non_select_or_order_invalid/);
});
