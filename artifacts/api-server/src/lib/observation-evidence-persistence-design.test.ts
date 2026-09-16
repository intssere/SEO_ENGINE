import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  OBSERVATION_AUTHORIZATION,
  P3_1_LIMITS,
  assertObservationHistoryIntegrity,
  assertObservationIntegrity,
  buildObservationHistory,
  classifyObservationTransition,
  createObservation,
  freshnessAt,
  observationFromTechnicalIssue,
  queryObservationHistory,
  type ObservationRecord,
} from "./observation-evidence-persistence-design.js";
import {
  createTechnicalEvidence,
  createTechnicalIssue,
  type TechnicalIssueLineage,
  type TechnicalUrlReference,
} from "./technical-issue-evidence-model.js";

const fingerprint = (character: string) => character.repeat(64);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function urlRef(pathname = "/products/alpha"): TechnicalUrlReference {
  const canonicalUrl = `https://diamondshelf.us${pathname}`;
  return { canonicalUrl, pathname, urlId: hash(JSON.stringify({ canonicalUrl })) };
}

const lineage: TechnicalIssueLineage = {
  urlExplorerFingerprint: fingerprint("a"),
  inventoryFingerprint: fingerprint("b"),
  recrawlPlanFingerprint: fingerprint("c"),
  completionCertificationFingerprint: fingerprint("d"),
};

function technicalIssue() {
  const affectedUrl = urlRef();
  const evidence = createTechnicalEvidence({
    kind: "supplied_observation",
    dimension: "title",
    quality: "strong",
    source: "supplied_first_party_observation",
    sourceFingerprint: fingerprint("e"),
    label: "Supplied title observation",
    value: null,
    affectedUrl,
  });
  return createTechnicalIssue({
    typeId: "metadata.title_missing",
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    lineage,
    affectedUrl,
    evidence: [evidence],
    summary: "Title is missing according to supplied first-party evidence.",
  });
}

function observation(overrides: Partial<Parameters<typeof createObservation>[0]> = {}): ObservationRecord {
  return createObservation({
    subject: {
      kind: "url",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      urlId: hash(JSON.stringify({ canonicalUrl: "https://diamondshelf.us/products/alpha" })),
      canonicalUrl: "https://diamondshelf.us/products/alpha",
    },
    observationKind: "technical_issue:metadata.title_missing",
    materialValue: { status: "open", severity: "medium" },
    provenance: {
      sourceKind: "unit_source",
      sourceFingerprint: fingerprint("a"),
      collectorId: "unit_collector",
    },
    confidence: "high",
    observedAt: "2026-09-16T06:00:00.000Z",
    freshForMs: 60 * 60 * 1_000,
    ...overrides,
  });
}

test("P3.1 creates deterministic normalized observations independent of material field insertion order", () => {
  const first = observation({ materialValue: { severity: "medium", status: "open" } });
  const second = observation({ materialValue: { status: "open", severity: "medium" } });
  assert.deepEqual(first, second);
  assert.match(first.observationId, /^[a-f0-9]{64}$/);
  assert.match(first.semanticKey, /^[a-f0-9]{64}$/);
  assert.match(first.valueFingerprint, /^[a-f0-9]{64}$/);
  assert.match(first.recordFingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.authorization, OBSERVATION_AUTHORIZATION);
  assert.doesNotThrow(() => assertObservationIntegrity(first));
});

test("P3.1 freshness is derived only from supplied timestamps and bounded policy", () => {
  const record = observation();
  assert.equal(freshnessAt(record, "2026-09-16T06:59:59.000Z"), "fresh");
  assert.equal(freshnessAt(record, "2026-09-16T07:00:00.000Z"), "fresh");
  assert.equal(freshnessAt(record, "2026-09-16T07:00:00.001Z"), "stale");
  assert.throws(() => freshnessAt(record, "2026-09-16T05:59:59.000Z"), /observation_as_of_precedes_observation/);
  assert.throws(() => observation({ freshForMs: P3_1_LIMITS.minFreshForMs - 1 }), /observation_freshness_window_invalid/);
  assert.throws(() => observation({ freshForMs: P3_1_LIMITS.maxFreshForMs + 1 }), /observation_freshness_window_invalid/);
});

test("P3.1 distinguishes duplicate, supersession, conflict, corroboration and independent transitions", () => {
  const current = observation();
  const duplicate = observation();
  assert.equal(classifyObservationTransition(current, duplicate).action, "duplicate_existing");

  const changed = observation({
    materialValue: { status: "resolved", severity: "medium" },
    observedAt: "2026-09-16T06:30:00.000Z",
  });
  assert.equal(classifyObservationTransition(current, changed).action, "supersede_existing");

  const conflicting = observation({
    materialValue: { status: "open", severity: "high" },
    provenance: { sourceKind: "other_source", sourceFingerprint: fingerprint("b"), collectorId: "other_collector" },
    observedAt: "2026-09-16T06:30:00.000Z",
  });
  assert.equal(classifyObservationTransition(current, conflicting).action, "conflict");

  const corroborating = observation({
    provenance: { sourceKind: "other_source", sourceFingerprint: fingerprint("b"), collectorId: "other_collector" },
    observedAt: "2026-09-16T06:30:00.000Z",
  });
  assert.equal(classifyObservationTransition(current, corroborating).action, "corroborate");

  const independent = observation({ observationKind: "technical_issue:metadata.h1_missing" });
  assert.equal(classifyObservationTransition(current, independent).action, "independent");

  const older = observation({ materialValue: { status: "resolved" }, observedAt: "2026-09-16T05:30:00.000Z" });
  assert.throws(() => classifyObservationTransition(current, older), /observation_transition_out_of_order/);
});

test("P3.1 builds deterministic history with explicit supersession and conflict relationships", () => {
  const oldRecord = observation();
  const replacement = observation({ materialValue: { status: "resolved", severity: "medium" }, observedAt: "2026-09-16T06:30:00.000Z" });
  const conflict = observation({
    materialValue: { status: "open", severity: "critical" },
    provenance: { sourceKind: "independent_source", sourceFingerprint: fingerprint("b"), collectorId: "independent_collector" },
    observedAt: "2026-09-16T06:40:00.000Z",
  });

  const history = buildObservationHistory([conflict, replacement, oldRecord, replacement], "2026-09-16T06:45:00.000Z");
  assert.equal(history.entries.length, 3, "exact duplicate IDs are deduplicated");
  assert.equal(history.relations.filter((item) => item.relationType === "supersedes").length, 1);
  assert.equal(history.relations.filter((item) => item.relationType === "conflicts_with").length, 1);

  const oldEntry = history.entries.find((item) => item.observation.observationId === oldRecord.observationId);
  const replacementEntry = history.entries.find((item) => item.observation.observationId === replacement.observationId);
  const conflictEntry = history.entries.find((item) => item.observation.observationId === conflict.observationId);
  assert.equal(oldEntry?.lifecycle, "superseded");
  assert.equal(oldEntry?.supersededByObservationId, replacement.observationId);
  assert.equal(replacementEntry?.lifecycle, "conflicting");
  assert.deepEqual(replacementEntry?.conflictsWithObservationIds, [conflict.observationId]);
  assert.equal(conflictEntry?.lifecycle, "conflicting");
  assert.doesNotThrow(() => assertObservationHistoryIntegrity(history));

  const reordered = buildObservationHistory([oldRecord, conflict, replacement], "2026-09-16T06:45:00.000Z");
  assert.equal(reordered.historyFingerprint, history.historyFingerprint);
});

test("P3.1 models corroboration separately from conflict", () => {
  const first = observation();
  const corroborating = observation({
    provenance: { sourceKind: "independent_source", sourceFingerprint: fingerprint("b"), collectorId: "independent_collector" },
    observedAt: "2026-09-16T06:10:00.000Z",
  });
  const history = buildObservationHistory([first, corroborating], "2026-09-16T06:20:00.000Z");
  assert.equal(history.relations.length, 1);
  assert.equal(history.relations[0]?.relationType, "corroborates");
  assert.ok(history.entries.every((entry) => entry.lifecycle === "current"));
  assert.ok(history.entries.every((entry) => entry.corroboratesObservationIds.length === 1));
});

test("P3.1 query contract is bounded, deterministic and supports lifecycle/freshness/source filters", () => {
  const active = observation();
  const old = observation({ observedAt: "2026-09-14T06:00:00.000Z", materialValue: { status: "old" } });
  const secondKind = observation({ observationKind: "technical_issue:metadata.h1_missing", provenance: { sourceKind: "other_source", sourceFingerprint: fingerprint("b"), collectorId: "other_collector" } });
  const history = buildObservationHistory([old, active, secondKind], "2026-09-16T08:00:00.000Z");
  const result = queryObservationHistory(history, {
    observationKinds: ["technical_issue:metadata.title_missing"],
    sourceKinds: ["unit_source"],
    lifecycles: ["current"],
    freshness: ["stale"],
    sort: { field: "observedAt", direction: "desc" },
    page: { offset: 0, limit: 10 },
  });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.observation.observationId, active.observationId);
  assert.equal(result.page.totalMatched, 1);
  assert.equal(result.authorization.persistenceEnabled, false);
  assert.match(result.queryFingerprint, /^[a-f0-9]{64}$/);
  assert.match(result.resultFingerprint, /^[a-f0-9]{64}$/);
  assert.throws(() => queryObservationHistory(history, { page: { offset: 0, limit: P3_1_LIMITS.queryLimit + 1 } }), /observation_query_page_invalid/);
});

test("P3.1 adapts P2.8 technical issues without retaining summaries, labels or raw evidence values", () => {
  const issue = technicalIssue();
  const record = observationFromTechnicalIssue({ issue, observedAt: "2026-09-16T06:00:00.000Z" });
  assert.equal(record.subject.kind, "url");
  assert.equal(record.subject.urlId, issue.affectedUrl?.urlId);
  assert.equal(record.observationKind, `technical_issue:${issue.typeId}`);
  assert.equal(record.provenance.sourceKind, "p2_8_technical_issue");
  assert.equal(record.provenance.sourceFingerprint, issue.fingerprint);
  assert.equal(record.evidenceReferences.length, issue.evidence.length);
  assert.equal(record.materialValue.issueKey, issue.issueKey);
  assert.equal(record.materialValue.issueFingerprint, issue.fingerprint);

  const serialized = JSON.stringify(record);
  assert.equal(serialized.includes(issue.summary), false, "free-form issue summary must not be retained");
  assert.equal(serialized.includes(issue.evidence[0]?.label ?? "__missing__"), false, "evidence label must not be retained");
  assert.equal(Object.prototype.hasOwnProperty.call(record.materialValue, "detail"), false);
  assert.doesNotThrow(() => assertObservationIntegrity(record));
});

test("P3.1 rejects secret-like material, credential-bearing URLs, malformed timestamps and invalid fingerprints", () => {
  assert.throws(() => observation({ materialValue: { token: "Bearer abcdefghijklmnopqrstuvwxyz" } }), /secret_material_denied/);
  assert.throws(() => observation({ materialValue: { apiKey: "sk-abcdefghijk123456789" } }), /secret_material_denied/);
  assert.throws(() => observation({ materialValue: { endpoint: "https://user:password@example.com/path" } }), /url_credentials_denied/);
  assert.throws(() => observation({ observedAt: "not-a-timestamp" }), /observation_observed_at_invalid/);
  assert.throws(() => observation({
    subject: { kind: "url", siteId: "diamond-shelf", canonicalOrigin: "https://diamondshelf.us", urlId: "bad", canonicalUrl: "https://diamondshelf.us/products/alpha" },
  }), /observation_url_id_invalid/);
  assert.throws(() => observation({
    subject: { kind: "url", siteId: "diamond-shelf", canonicalOrigin: "https://diamondshelf.us", urlId: fingerprint("a"), canonicalUrl: "https://example.com/products/alpha" },
  }), /observation_url_invalid/);
});

test("P3.1 detects forged observation and history records", () => {
  const record = observation();
  const forged = { ...record, valueFingerprint: fingerprint("f") } as ObservationRecord;
  assert.throws(() => assertObservationIntegrity(forged), /observation_record_fingerprint_mismatch/);

  const history = buildObservationHistory([record], "2026-09-16T06:10:00.000Z");
  const forgedHistory = { ...history, historyFingerprint: fingerprint("f") };
  assert.throws(() => assertObservationHistoryIntegrity(forgedHistory), /observation_history_fingerprint_mismatch/);
});
