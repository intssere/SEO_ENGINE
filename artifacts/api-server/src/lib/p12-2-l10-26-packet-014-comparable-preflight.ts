import { createHash } from "node:crypto";
import {
  P12_2_L10_15_RUN_ID,
} from "./p12-2-l10-15-packet-014-full-initial.js";
import {
  P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
} from "./p12-2-l10-18-packet-014-finalization-repair.js";
import {
  P12_2_L10_19_C_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT,
} from "./p12-2-l10-19-c-packet-014-post-disposition-certification.js";
import { DIAMOND_SHELF_SITE_ID } from "./first-party-live-adapters.js";
import { DIAMOND_SHELF_CANONICAL_ORIGIN } from "./first-party-crawl-runtime-bridge.js";

export const P12_2_L10_26_VERSION =
  "p12-2-l10-26-packet-014-comparable-readonly-preflight-v1" as const;
export type P122L1026Query = { id: "packet_014_comparable_candidate" | "packet_014_raw_history_immutability" | "packet_014_comparable_guard"; sql: string };

const sourcePredicate = [
  "r.site_id='" + DIAMOND_SHELF_SITE_ID + "'::uuid",
  "r.run_id='" + P12_2_L10_15_RUN_ID + "'",
  "r.canonical_origin='" + DIAMOND_SHELF_CANONICAL_ORIGIN + "'",
  "r.execution_plan_fingerprint='" + P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT + "'",
  "r.source_accounting_snapshot_fingerprint='" + P12_2_L10_19_C_SOURCE_ACCOUNTING_SNAPSHOT_FINGERPRINT + "'",
].join(" AND ");

const candidate = `SELECT a.snapshot_fingerprint, a.observed_at, r.receipt_fingerprint,
  r.raw_terminal_failure_count, r.expected_absence_count,
  r.effective_unresolved_terminal_failure_count
 FROM first_party_crawl_terminal_failure_reconciliation_receipts r
 JOIN first_party_crawl_accounting_snapshots a
 ON a.site_id=r.site_id AND a.run_id=r.run_id
 AND a.canonical_origin=r.canonical_origin
 AND a.execution_plan_fingerprint=r.execution_plan_fingerprint
 AND a.snapshot_fingerprint=r.source_accounting_snapshot_fingerprint
 WHERE ${sourcePredicate}
 AND r.status='certified_with_expected_absence'
 AND r.raw_terminal_failure_count=1 AND r.expected_absence_count=1
 AND r.effective_unresolved_terminal_failure_count=0
 AND a.terminal_failure_count=1 AND a.whole_site_certified=false
 AND a.snapshot_payload->>'fingerprint'=a.snapshot_fingerprint
 AND a.snapshot_payload->'certification'->'certification'->>'wholeSiteCertified'='false'
 AND r.receipt_payload->>'fingerprint'=r.receipt_fingerprint
 AND r.receipt_payload->>'sourceAccountingSnapshotFingerprint'=r.source_accounting_snapshot_fingerprint
 AND r.receipt_payload->>'dispositionFingerprint'=r.disposition_fingerprint
 AND r.receipt_payload->>'legacyWholeSiteCertified'='false'
 AND r.receipt_payload->>'status'='certified_with_expected_absence'
 AND (r.receipt_payload->>'rawTerminalFailureCount')::int=1
 AND (r.receipt_payload->>'expectedAbsenceCount')::int=1
 AND (r.receipt_payload->>'effectiveUnresolvedTerminalFailureCount')::int=0
 AND EXISTS (SELECT 1 FROM first_party_crawl_terminal_failure_dispositions d
 WHERE d.site_id=r.site_id AND d.run_id=r.run_id
 AND d.canonical_origin=r.canonical_origin
 AND d.execution_plan_fingerprint=r.execution_plan_fingerprint
 AND d.disposition_fingerprint=r.disposition_fingerprint
 AND d.absence_http_status IN (404,410)
 AND d.disposition_payload->>'fingerprint'=d.disposition_fingerprint)
`;

export function buildP122L1026Queries(): readonly P122L1026Query[] {
  const countSql = "SELECT COUNT(*)::int AS candidate_count FROM (" + candidate + ") packet_candidate";
  const rawSql = `SELECT
  (SELECT COUNT(*)::int FROM first_party_crawl_completed_runs WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}') AS completed_run_count,
  (SELECT COUNT(*)::int FROM first_party_crawl_terminal_failure_recovery_receipts WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}') AS recovery_receipt_count,
  (SELECT COUNT(*)::int FROM first_party_crawl_accounting_snapshots WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}' AND whole_site_certified=false AND terminal_failure_count=1) AS raw_uncertified_count`;
  const guardSql = "SELECT 1 / CASE WHEN (SELECT COUNT(*) FROM (" + candidate + ") candidate)=1 AND (SELECT COUNT(*) FROM first_party_crawl_completed_runs WHERE site_id='" + DIAMOND_SHELF_SITE_ID + "'::uuid AND run_id='" + P12_2_L10_15_RUN_ID + "')=0 THEN 1 ELSE 0 END AS comparable_guard";
  const queries: P122L1026Query[] = [
    {id:"packet_014_comparable_candidate",sql:countSql},
    {id:"packet_014_raw_history_immutability",sql:rawSql},
    {id:"packet_014_comparable_guard",sql:guardSql},
  ];
  assertP122L1026QueryContract(queries);
  return Object.freeze(queries);
}

export function assertP122L1026QueryContract(queries: readonly P122L1026Query[]): void {
  const ids = ["packet_014_comparable_candidate","packet_014_raw_history_immutability","packet_014_comparable_guard"];
  if (queries.length !== ids.length) throw new Error("p12_2_l10_26_query_count_invalid");
  for (let i=0;i<ids.length;i++) {
    const query=queries[i];
    if (!query || query.id!==ids[i] || !/^SELECT\b/i.test(query.sql.trim()) || /;|\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/i.test(query.sql)) throw new Error("p12_2_l10_26_non_select_or_order_invalid");
  }
  const expected=buildUncheckedQueries();
  if (queries.some((q,i)=>q.sql!==expected[i]!.sql)) throw new Error("p12_2_l10_26_query_content_mismatch");
}

function buildUncheckedQueries(): P122L1026Query[] {
  const countSql = "SELECT COUNT(*)::int AS candidate_count FROM (" + candidate + ") packet_candidate";
  const rawSql = `SELECT
  (SELECT COUNT(*)::int FROM first_party_crawl_completed_runs WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}') AS completed_run_count,
  (SELECT COUNT(*)::int FROM first_party_crawl_terminal_failure_recovery_receipts WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}') AS recovery_receipt_count,
  (SELECT COUNT(*)::int FROM first_party_crawl_accounting_snapshots WHERE site_id='${DIAMOND_SHELF_SITE_ID}'::uuid AND run_id='${P12_2_L10_15_RUN_ID}' AND whole_site_certified=false AND terminal_failure_count=1) AS raw_uncertified_count`;
  const guardSql = "SELECT 1 / CASE WHEN (SELECT COUNT(*) FROM (" + candidate + ") candidate)=1 AND (SELECT COUNT(*) FROM first_party_crawl_completed_runs WHERE site_id='" + DIAMOND_SHELF_SITE_ID + "'::uuid AND run_id='" + P12_2_L10_15_RUN_ID + "')=0 THEN 1 ELSE 0 END AS comparable_guard";
  return [{id:"packet_014_comparable_candidate",sql:countSql},{id:"packet_014_raw_history_immutability",sql:rawSql},{id:"packet_014_comparable_guard",sql:guardSql}];
}

export function p122L1026QuerySetFingerprint(): string {
  return createHash("sha256").update(JSON.stringify({version:P12_2_L10_26_VERSION,queries:buildP122L1026Queries()})).digest("hex");
}
