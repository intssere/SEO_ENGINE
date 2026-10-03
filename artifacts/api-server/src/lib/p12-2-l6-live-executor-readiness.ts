export const P12_2_L6_VERSION = "p12-2-l6-live-executor-readiness-v1" as const;

export const P12_2_L6_BLOCKERS = [
  "full_interrupt_checkpoint_stop_binding_missing",
  "incremental_material_binding_missing",
  "durable_packet_consumption_receipt_missing",
  "live_executable_entrypoint_missing",
  "production_image_live_entrypoint_proof_missing",
] as const;

export type P122L6Blocker = (typeof P12_2_L6_BLOCKERS)[number];

export type P122L6Capabilities = {
  l2OperatorArtifactPresent: boolean;
  manualFullInitialBindingPresent: boolean;
  fullInterruptCheckpointStopBindingPresent: boolean;
  fullResumePersistenceBindingPresent: boolean;
  fullReconciliationBindingPresent: boolean;
  incrementalMaterialBindingPresent: boolean;
  durablePacketConsumptionReceiptPresent: boolean;
  liveExecutableEntrypointPresent: boolean;
  productionImageContainsLiveEntrypoint: boolean;
};

export type P122L6Readiness = {
  version: typeof P12_2_L6_VERSION;
  capabilities: Readonly<P122L6Capabilities>;
  blockers: readonly P122L6Blocker[];
  readyForFirstLiveCrawl: boolean;
  firstPartyReadOnly: true;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
  automaticWholeRunRetry: false;
  executionPerformed: false;
};

export function inspectP122L6LiveExecutorReadiness(
  capabilities: P122L6Capabilities,
): P122L6Readiness {
  const blockers: P122L6Blocker[] = [];
  if (!capabilities.fullInterruptCheckpointStopBindingPresent) {
    blockers.push("full_interrupt_checkpoint_stop_binding_missing");
  }
  if (!capabilities.incrementalMaterialBindingPresent) {
    blockers.push("incremental_material_binding_missing");
  }
  if (!capabilities.durablePacketConsumptionReceiptPresent) {
    blockers.push("durable_packet_consumption_receipt_missing");
  }
  if (!capabilities.liveExecutableEntrypointPresent) {
    blockers.push("live_executable_entrypoint_missing");
  }
  if (!capabilities.productionImageContainsLiveEntrypoint) {
    blockers.push("production_image_live_entrypoint_proof_missing");
  }

  const foundationalBindingsPresent =
    capabilities.l2OperatorArtifactPresent &&
    capabilities.manualFullInitialBindingPresent &&
    capabilities.fullResumePersistenceBindingPresent &&
    capabilities.fullReconciliationBindingPresent;

  return Object.freeze({
    version: P12_2_L6_VERSION,
    capabilities: Object.freeze({ ...capabilities }),
    blockers: Object.freeze(blockers),
    readyForFirstLiveCrawl: foundationalBindingsPresent && blockers.length === 0,
    firstPartyReadOnly: true,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticWholeRunRetry: false,
    executionPerformed: false,
  });
}

export function currentP122L6LiveExecutorAudit(): P122L6Readiness {
  return inspectP122L6LiveExecutorReadiness({
    l2OperatorArtifactPresent: true,
    manualFullInitialBindingPresent: true,
    fullInterruptCheckpointStopBindingPresent: true,
    fullResumePersistenceBindingPresent: true,
    fullReconciliationBindingPresent: true,
    incrementalMaterialBindingPresent: true,
    durablePacketConsumptionReceiptPresent: true,
    liveExecutableEntrypointPresent: false,
    productionImageContainsLiveEntrypoint: false,
  });
}

export function assertP122L6ReadyForFirstLiveCrawl(
  readiness: P122L6Readiness = currentP122L6LiveExecutorAudit(),
): void {
  if (!readiness.readyForFirstLiveCrawl) {
    throw new Error(`p12_2_l6_live_executor_not_ready:${readiness.blockers.join(",")}`);
  }
}
