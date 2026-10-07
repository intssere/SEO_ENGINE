import assert from "node:assert/strict";
import test from "node:test";
import { createTerminalFailureEvent } from "./first-party-crawl-terminal-recovery.js";
import {
  P12_2_L10_19_FAILURE_URL,
  P12_2_L10_19_SOURCE_EVENT_FINGERPRINT,
  buildP122L1019ReconciliationReceipt,
  classifyExpectedAbsenceInventory,
  classifyPermanentExpectedAbsenceEvent,
  currentAbsenceStatus,
  executeP122L1019ExpectedAbsenceDisposition,
  p122L1019Capability,
  p122L1019DispositionAuthorizationFingerprint,
  p122L1019DispositionAuthorizationLiteral,
  type P122L1019Disposition,
} from "./p12-2-l10-19-packet-014-expected-absence-disposition.js";

const IMAGE =
  "ghcr.io/intssere/seo-engine-p12-2-l10-19-packet-014-expected-absence-disposition@sha256:" +
  "a".repeat(64);

function event(status: number, reason: "permanent_http" | "attempts_exhausted" = "permanent_http") {
  return createTerminalFailureEvent({
    eventType: "terminal_failure",
    runId: "test-run",
    observedAt: "2026-10-07T00:00:00.000Z",
    siteId: "test-site",
    canonicalOrigin: "https://diamondshelf.us",
    executionPlanFingerprint: "b".repeat(64),
    canonicalUrl: "https://diamondshelf.us/missing",
    checkpointRevision: 1,
    checkpointFingerprint: "c".repeat(64),
    batchId: "batch-1",
    attempt: 1,
    sourceEventFingerprint: null,
    outcome: {
      canonicalUrl: "https://diamondshelf.us/missing",
      kind: "failure",
      signal: { kind: "http_status", httpStatus: status },
    },
    decisionReason: reason,
  });
}

test("L10.19 expected-absence event classifier accepts only permanent 404/410", () => {
  assert.equal(classifyPermanentExpectedAbsenceEvent(event(404)), 404);
  assert.equal(classifyPermanentExpectedAbsenceEvent(event(410)), 410);
  assert.throws(
    () => classifyPermanentExpectedAbsenceEvent(event(403)),
    /p12_2_l10_19_expected_absence_event_invalid/,
  );
  assert.throws(
    () => classifyPermanentExpectedAbsenceEvent(event(404, "attempts_exhausted")),
    /p12_2_l10_19_expected_absence_event_invalid/,
  );
});

test("L10.19 current live outcome classifier accepts only HTTP 404/410", () => {
  assert.equal(currentAbsenceStatus({
    kind: "failure",
    signal: { kind: "http_status", httpStatus: 404 },
  }), 404);
  assert.equal(currentAbsenceStatus({
    kind: "failure",
    signal: { kind: "http_status", httpStatus: 410 },
  }), 410);
  assert.throws(
    () => currentAbsenceStatus({ kind: "success" }),
    /p12_2_l10_19_current_absence_not_proven/,
  );
  assert.throws(
    () => currentAbsenceStatus({
      kind: "failure",
      signal: { kind: "http_status", httpStatus: 500 },
    }),
    /p12_2_l10_19_current_absence_not_proven/,
  );
});

test("L10.19 fresh sitemap membership distinguishes stale inventory from sitemap orphan", () => {
  const stale = classifyExpectedAbsenceInventory(
    [{ canonicalUrl: "https://diamondshelf.us/products/a", sourceSitemaps: ["https://diamondshelf.us/sitemap.xml"] }],
    P12_2_L10_19_FAILURE_URL,
  );
  assert.equal(stale.presentInFreshInventory, false);
  assert.equal(stale.dispositionType, "stale_inventory_absence");
  assert.deepEqual(stale.sourceSitemaps, []);

  const orphan = classifyExpectedAbsenceInventory(
    [{
      canonicalUrl: P12_2_L10_19_FAILURE_URL,
      sourceSitemaps: [
        "https://diamondshelf.us/sitemap_blogs_1.xml?from=100&to=200",
        "https://diamondshelf.us/sitemap.xml",
      ],
    }],
    P12_2_L10_19_FAILURE_URL,
  );
  assert.equal(orphan.presentInFreshInventory, true);
  assert.equal(orphan.dispositionType, "sitemap_orphan_absence");
  assert.deepEqual(orphan.sourceSitemaps, [
    "https://diamondshelf.us/sitemap.xml",
    "https://diamondshelf.us/sitemap_blogs_1.xml?from=100&to=200",
  ]);
});

test("L10.19 reconciliation preserves raw failure but resolves effective blocker", () => {
  const disposition = {
    sourceEventFingerprint: P12_2_L10_19_SOURCE_EVENT_FINGERPRINT,
    canonicalUrl: P12_2_L10_19_FAILURE_URL,
    fingerprint: "d".repeat(64),
    observedAt: "2026-10-07T01:00:00.000Z",
  } as P122L1019Disposition;
  const receipt = buildP122L1019ReconciliationReceipt(disposition);
  assert.equal(receipt.rawTerminalFailureCount, 1);
  assert.equal(receipt.expectedAbsenceCount, 1);
  assert.equal(receipt.effectiveUnresolvedTerminalFailureCount, 0);
  assert.equal(receipt.status, "certified_with_expected_absence");
  assert.equal(receipt.legacyWholeSiteCertified, false);
  assert.equal(receipt.completedRunPersisted, false);
  assert.equal(receipt.recoveryReceiptPersisted, false);
  assert.match(receipt.fingerprint, /^[0-9a-f]{64}$/);
});

test("L10.19 authorization is bound to the immutable verifier image", () => {
  assert.match(p122L1019DispositionAuthorizationFingerprint(IMAGE), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L1019DispositionAuthorizationLiteral(IMAGE),
    "AUTHORIZE:P12_2_L10_19_PACKET_014_EXPECTED_ABSENCE_DISPOSITION:" +
      p122L1019DispositionAuthorizationFingerprint(IMAGE),
  );
  assert.throws(
    () => p122L1019DispositionAuthorizationFingerprint("ghcr.io/intssere/wrong@sha256:" + "a".repeat(64)),
    /p12_2_l10_19_verifier_image_invalid/,
  );
});

test("L10.19 wrong authorization fails before DB or network construction", async () => {
  let opened = false;
  await assert.rejects(
    executeP122L1019ExpectedAbsenceDisposition({
      authorizationLiteral: "AUTHORIZE:WRONG",
      databaseUrl: "postgres://must-not-open",
      verifierImage: IMAGE,
      verifierDeploymentId: "11111111-1111-4111-8111-111111111111",
      sqlFactory: (() => {
        opened = true;
        throw new Error("must_not_open");
      }) as never,
    }),
    /p12_2_l10_19_authorization_required/,
  );
  assert.equal(opened, false);
});

test("L10.19 capability forbids synthetic recovery and all writes outside disposition receipts", () => {
  const capability = p122L1019Capability();
  assert.deepEqual(capability.acceptedAbsenceHttpStatuses, [404, 410]);
  assert.equal(capability.historicalAbsenceEvidenceRequired, true);
  assert.equal(capability.currentAbsenceEvidenceRequired, true);
  assert.equal(capability.freshSitemapInventoryRequired, true);
  assert.equal(capability.rawTerminalFailureCountPreserved, true);
  assert.equal(capability.effectiveUnresolvedTerminalFailures, 0);
  assert.equal(capability.checkpointMutation, false);
  assert.equal(capability.terminalFailureEventMutation, false);
  assert.equal(capability.accountingSnapshotMutation, false);
  assert.equal(capability.l2InvocationMutation, false);
  assert.equal(capability.completedRunMutation, false);
  assert.equal(capability.recoveryReceiptMutation, false);
  assert.equal(capability.crawlReplay, false);
  assert.equal(capability.recoveryExecution, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
});
