import assert from "node:assert/strict";
import test from "node:test";
import {
  assertP122L6ReadyForFirstLiveCrawl,
  currentP122L6LiveExecutorAudit,
  inspectP122L6LiveExecutorReadiness,
  P12_2_L6_BLOCKERS,
} from "./p12-2-l6-live-executor-readiness.js";

test("current post-L5 state remains fail-closed for first live crawl", () => {
  const readiness = currentP122L6LiveExecutorAudit();

  assert.equal(readiness.readyForFirstLiveCrawl, false);
  assert.equal(readiness.capabilities.l2OperatorArtifactPresent, true);
  assert.equal(readiness.capabilities.manualFullInitialBindingPresent, true);
  assert.equal(readiness.capabilities.fullInterruptCheckpointStopBindingPresent, true);
  assert.equal(readiness.capabilities.fullResumePersistenceBindingPresent, true);
  assert.equal(readiness.capabilities.fullReconciliationBindingPresent, true);
  assert.equal(readiness.capabilities.incrementalMaterialBindingPresent, true);
  assert.equal(readiness.capabilities.durablePacketConsumptionReceiptPresent, true);
  assert.deepEqual(readiness.blockers, [
    "live_executable_entrypoint_missing",
    "production_image_live_entrypoint_proof_missing",
  ]);
  assert.ok(P12_2_L6_BLOCKERS.includes("full_interrupt_checkpoint_stop_binding_missing"));
  assert.ok(P12_2_L6_BLOCKERS.includes("durable_packet_consumption_receipt_missing"));
  assert.equal(readiness.executionPerformed, false);
  assert.equal(readiness.schedulerEnabled, false);
  assert.equal(readiness.autonomousWorkerEnabled, false);
  assert.equal(readiness.providerWrites, false);
  assert.equal(readiness.publicSiteWrites, false);
  assert.equal(readiness.automaticWholeRunRetry, false);

  assert.throws(
    () => assertP122L6ReadyForFirstLiveCrawl(readiness),
    /p12_2_l6_live_executor_not_ready:live_executable_entrypoint_missing,production_image_live_entrypoint_proof_missing/,
  );
});

test("readiness cannot become true when a foundational binding is absent", () => {
  const readiness = inspectP122L6LiveExecutorReadiness({
    l2OperatorArtifactPresent: false,
    manualFullInitialBindingPresent: true,
    fullInterruptCheckpointStopBindingPresent: true,
    fullResumePersistenceBindingPresent: true,
    fullReconciliationBindingPresent: true,
    incrementalMaterialBindingPresent: true,
    durablePacketConsumptionReceiptPresent: true,
    liveExecutableEntrypointPresent: true,
    productionImageContainsLiveEntrypoint: true,
  });
  assert.equal(readiness.blockers.length, 0);
  assert.equal(readiness.readyForFirstLiveCrawl, false);
});

test("readiness becomes true only when all live executor bindings and durable proof exist", () => {
  const readiness = inspectP122L6LiveExecutorReadiness({
    l2OperatorArtifactPresent: true,
    manualFullInitialBindingPresent: true,
    fullInterruptCheckpointStopBindingPresent: true,
    fullResumePersistenceBindingPresent: true,
    fullReconciliationBindingPresent: true,
    incrementalMaterialBindingPresent: true,
    durablePacketConsumptionReceiptPresent: true,
    liveExecutableEntrypointPresent: true,
    productionImageContainsLiveEntrypoint: true,
  });

  assert.equal(readiness.readyForFirstLiveCrawl, true);
  assert.deepEqual(readiness.blockers, []);
  assert.doesNotThrow(() => assertP122L6ReadyForFirstLiveCrawl(readiness));
});
