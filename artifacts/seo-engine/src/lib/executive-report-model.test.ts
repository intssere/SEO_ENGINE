import test from "node:test";
import assert from "node:assert/strict";

import {
  P11_7_SYNTHETIC_EXECUTIVE_REPORT_FIXTURE,
  buildExecutivePrintText,
  buildExecutiveReport,
  executiveReportCapability,
  normalizeExecutiveReportShareState,
  parseExecutiveReportShareState,
  serializeExecutiveReportCsv,
  serializeExecutiveReportJson,
  serializeExecutiveReportShareState,
  type ExecutiveReportFixture,
} from "./executive-report-model";

function cloneFixture(): ExecutiveReportFixture {
  return structuredClone(P11_7_SYNTHETIC_EXECUTIVE_REPORT_FIXTURE);
}

test("P11.7 builds one deterministic synthetic/read-only executive report", () => {
  const report = buildExecutiveReport(cloneFixture());

  assert.equal(report.version, "p11.7-executive-report-v1");
  assert.equal(report.fixtureKind, "synthetic_read_only");
  assert.equal(report.reportId, "p117-executive-report-synthetic");
  assert.equal(report.siteLabel, "Diamond Shelf · synthetic executive report");
  assert.equal(report.domain, "diamondshelf.us");
  assert.equal(report.summary.length, 6);
  assert.equal(report.metrics.length, 5);
  assert.equal(report.highlights.length, 4);
  assert.equal(report.evidenceLineage.length, 5);
  assert.match(report.reportFingerprint, /^[0-9a-f]{16}$/);
});

test("P11.7 fingerprint and serializers are stable across supplied ordering", () => {
  const first = cloneFixture();
  const second = cloneFixture();

  second.summary.reverse();
  second.metrics.reverse();
  second.highlights.reverse();
  second.evidenceLineage.reverse();
  second.guardrails.reverse();
  second.diagnostics.reverse();

  const reportA = buildExecutiveReport(first);
  const reportB = buildExecutiveReport(second);

  assert.equal(reportA.reportFingerprint, reportB.reportFingerprint);
  assert.equal(
    serializeExecutiveReportCsv(reportA),
    serializeExecutiveReportCsv(reportB),
  );
  assert.equal(
    serializeExecutiveReportJson(reportA),
    serializeExecutiveReportJson(reportB),
  );
});

test("P11.7 CSV is canonical, quoted and protects spreadsheet formulas", () => {
  const fixture = cloneFixture();
  fixture.metrics.push({
    key: "formula_test",
    label: "Formula-like supplied text",
    value: "=HYPERLINK(\"https://example.test\",\"x\")",
    delta: "+1",
    source: "Synthetic formula fixture",
  });

  const csv = serializeExecutiveReportCsv(buildExecutiveReport(fixture));

  assert.ok(csv.startsWith('"section","key","label","value","detail","source"\r\n'));
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.test"",\""?x/);
  assert.ok(csv.endsWith("\r\n"));
  assert.equal(csv.replaceAll("\r\n", "").includes("\n"), false);
});

test("P11.7 JSON export exposes safety and never mutates the model", () => {
  const report = buildExecutiveReport(cloneFixture());
  const before = structuredClone(report);
  const json = serializeExecutiveReportJson(report);
  const parsed = JSON.parse(json);

  assert.equal(parsed.version, "p11.7-executive-report-v1");
  assert.equal(parsed.reportFingerprint, report.reportFingerprint);
  assert.equal(parsed.safety.productionDataExportAuthorized, false);
  assert.equal(parsed.safety.publicSharePublicationAuthorized, false);
  assert.deepEqual(report, before);
});

test("P11.7 share state round-trips only supported view configuration", () => {
  const state = normalizeExecutiveReportShareState({
    view: "operations",
    sections: ["guardrails", "summary", "kpis", "summary"],
  });

  assert.deepEqual(state, {
    view: "operations",
    sections: ["summary", "kpis", "guardrails"],
  });

  const serialized = serializeExecutiveReportShareState(state);
  assert.equal(
    serialized,
    "view=operations&sections=summary%2Ckpis%2Cguardrails",
  );
  assert.deepEqual(parseExecutiveReportShareState(serialized), state);
  assert.deepEqual(parseExecutiveReportShareState("?" + serialized), state);
  assert.equal(serialized.includes("Diamond"), false);
  assert.equal(serialized.includes("diamondshelf"), false);
  assert.equal(serialized.includes("fingerprint"), false);
});

test("P11.7 share state fails closed on unknown, malformed or oversized input", () => {
  assert.throws(
    () => parseExecutiveReportShareState("view=public"),
    /executive_report_share_state_invalid_view/,
  );
  assert.throws(
    () =>
      parseExecutiveReportShareState(
        "view=executive&sections=summary,production-data",
      ),
    /executive_report_share_state_invalid_sections/,
  );
  assert.throws(
    () => parseExecutiveReportShareState("view=executive&token=secret"),
    /executive_report_share_state_unknown_parameter/,
  );
  assert.throws(
    () => parseExecutiveReportShareState("x".repeat(513)),
    /executive_report_share_state_too_long/,
  );
});

test("P11.7 print text obeys selected sections without inventing claims", () => {
  const report = buildExecutiveReport(cloneFixture());
  const text = buildExecutivePrintText(report, {
    view: "executive",
    sections: ["summary", "guardrails"],
  });

  assert.match(text, /Executive summary/);
  assert.match(text, /Guardrails/);
  assert.doesNotMatch(text, /^KPIs$/m);
  assert.doesNotMatch(text, /^Highlights$/m);
  assert.match(text, /Report fingerprint:/);
  assert.match(text, /does not authorize approvals, execution/i);
});

test("P11.7 rejects duplicate identities and invalid evidence lineage", () => {
  const duplicateMetric = cloneFixture();
  duplicateMetric.metrics.push(structuredClone(duplicateMetric.metrics[0]!));
  assert.throws(
    () => buildExecutiveReport(duplicateMetric),
    /duplicate_executive_report_metric_key/,
  );

  const badFingerprint = cloneFixture();
  badFingerprint.evidenceLineage[0]!.fingerprint = "not-a-fingerprint";
  assert.throws(
    () => buildExecutiveReport(badFingerprint),
    /invalid_executive_report_lineage_fingerprint/,
  );
});

test("P11.7 capability is local serialization only and grants no delivery/runtime authority", () => {
  assert.deepEqual(executiveReportCapability(), {
    version: "p11.7-executive-report-v1",
    syntheticFixtureOnly: true,
    readOnly: true,
    localSerializationOnly: true,
    serverReportGenerationAuthorized: false,
    serverReportPersistenceAuthorized: false,
    productionDataExportAuthorized: false,
    externalFileDeliveryAuthorized: false,
    emailDeliveryAuthorized: false,
    slackDeliveryAuthorized: false,
    webhookDeliveryAuthorized: false,
    publicSharePublicationAuthorized: false,
    providerNetworkReadAuthorized: false,
    providerNetworkWriteAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    publicSiteWrites: false,
    task51ExecutionAuthorized: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    autonomousMutationAuthorized: false,
    p98ImplementationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
});