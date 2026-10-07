import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_18_FAILURE_EVENT_FINGERPRINT,
  P12_2_L10_18_FAILURE_URL,
  P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT,
  P12_2_L10_18_FINAL_CHECKPOINT_REVISION,
  P12_2_L10_18_INVENTORY_FINGERPRINT,
  P12_2_L10_18_VERSION,
  assertP122L1018DeterministicOutputs,
  buildP122L1018AccountingReceipt,
  buildP122L1018CompactFinalizationSnapshot,
  buildP122L1018L2Receipt,
  executeP122L1018FinalizationRepair,
  p122L1018Capability,
  p122L1018RepairAuthorizationFingerprint,
  p122L1018RepairAuthorizationLiteral,
} from "./p12-2-l10-18-packet-014-finalization-repair.js";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_RUN_ID,
} from "./p12-2-l10-15-packet-014-full-initial.js";

test("L10.18 compact durable finalization is exact, deterministic, and non-recrawling", () => {
  assert.doesNotThrow(() => assertP122L1018DeterministicOutputs());
  const snapshot = buildP122L1018CompactFinalizationSnapshot();
  const accounting = buildP122L1018AccountingReceipt(snapshot);
  const l2 = buildP122L1018L2Receipt(accounting);

  assert.equal(snapshot.version, P12_2_L10_18_VERSION);
  assert.equal(snapshot.packetFingerprint, P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT);
  assert.equal(snapshot.runId, P12_2_L10_15_RUN_ID);
  assert.equal(snapshot.executionPlanFingerprint, P12_2_L10_18_EXECUTION_PLAN_FINGERPRINT);
  assert.equal(snapshot.inventoryFingerprint, P12_2_L10_18_INVENTORY_FINGERPRINT);
  assert.equal(snapshot.checkpoint.fingerprint, P12_2_L10_18_FINAL_CHECKPOINT_FINGERPRINT);
  assert.equal(snapshot.checkpoint.sequence, P12_2_L10_18_FINAL_CHECKPOINT_REVISION);
  assert.equal(snapshot.checkpoint.status, "completed");
  assert.equal(snapshot.checkpoint.progress.totalUrls, 3044);
  assert.equal(snapshot.checkpoint.progress.finalizedUrls, 3044);
  assert.equal(snapshot.checkpoint.progress.pendingUrls, 0);
  assert.equal(snapshot.checkpoint.counters.terminalFailures, 1);
  assert.equal(snapshot.terminalFailureEvidence.length, 1);
  assert.equal(snapshot.terminalFailureEvidence[0].canonicalUrl, P12_2_L10_18_FAILURE_URL);
  assert.equal(snapshot.terminalFailureEvidence[0].eventFingerprint, P12_2_L10_18_FAILURE_EVENT_FINGERPRINT);
  assert.equal(snapshot.certification.certification.wholeSiteCertified, false);
  assert.deepEqual(snapshot.certification.certification.blockers, ["terminal_failures_present"]);
  assert.equal(snapshot.reconstruction.fullBridgeSnapshotReconstructed, false);
  assert.equal(snapshot.reconstruction.noNetworkRefetch, true);
  assert.equal(snapshot.reconstruction.noCrawlReplay, true);

  assert.equal(accounting.status, "accounting_complete_uncertified");
  assert.equal(accounting.accountingSnapshotFingerprint, snapshot.fingerprint);
  assert.equal(accounting.terminalFailures, 1);
  assert.equal(l2.result.status, "accounting_complete_uncertified");
  if (l2.result.status !== "accounting_complete_uncertified") throw new Error("unreachable");
  assert.equal(l2.result.accountingSnapshotFingerprint, snapshot.fingerprint);
  assert.equal(l2.result.receiptFingerprint, accounting.fingerprint);
  assert.match(snapshot.fingerprint, /^[0-9a-f]{64}$/);
  assert.match(accounting.fingerprint, /^[0-9a-f]{64}$/);
  assert.match(l2.fingerprint, /^[0-9a-f]{64}$/);
});

test("L10.18 capability grants only bounded finalization writes", () => {
  const capability = p122L1018Capability();
  assert.equal(capability.accountingSnapshotInsert, true);
  assert.equal(capability.l2InvocationCompletion, true);
  assert.equal(capability.fullBridgeSnapshotReconstruction, false);
  assert.equal(capability.networkRefetch, false);
  assert.equal(capability.crawlReplay, false);
  assert.equal(capability.checkpointMutation, false);
  assert.equal(capability.terminalFailureEventMutation, false);
  assert.equal(capability.completedRunMutation, false);
  assert.equal(capability.recoveryReceiptMutation, false);
  assert.equal(capability.schemaMigrationRequired, false);
  assert.equal(capability.automaticRetry, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
});

test("L10.18 authorization fingerprint binds deterministic outputs", () => {
  assert.match(p122L1018RepairAuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L1018RepairAuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_18_PACKET_014_FINALIZATION_REPAIR:" +
      p122L1018RepairAuthorizationFingerprint(),
  );
});

test("L10.18 rejects wrong authorization before opening a database connection", async () => {
  let opened = false;
  await assert.rejects(
    executeP122L1018FinalizationRepair({
      authorizationLiteral: "AUTHORIZE:WRONG",
      databaseUrl: "postgres://must-not-open",
      sqlFactory: (() => {
        opened = true;
        throw new Error("must_not_open");
      }) as never,
    }),
    /p12_2_l10_18_repair_authorization_required/,
  );
  assert.equal(opened, false);
});
