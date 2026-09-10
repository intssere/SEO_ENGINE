import { createHash } from "node:crypto";

export const PRODUCTION_CERTIFICATION_SITE = "diamondshelf.us" as const;
export type ProductionCertificationStatus = "NOT_STARTED" | "READ_ONLY_READY" | "CONTROLLED_WRITE_READY" | "PILOT_CERTIFIED";

export interface ProductionCertificationInput {
  siteDomain: string;
  softwareBaselineGreen: boolean;
  runtimeDatabaseReady: boolean;
  readOnlyConnectionsVerified: boolean;
  realBaselineCertified: boolean;
  opportunityRunCompleted: boolean;
  dashboardLiveDataVerified: boolean;
  dryRunCompleted: boolean;
  controlledWritePathVerified: boolean;
  controlledProductionActionCompleted: boolean;
  controlledProductionActionVerified: boolean;
  measurementCompleted: boolean;
  guardedAutonomyGateVerified: boolean;
  unresolvedRegressions: number;
  pendingVerifications: number;
  credentialsLeakDetected?: boolean;
  fixtureMetricsRepresentedAsLive?: boolean;
  unsupportedMutationDetected?: boolean;
  approvalOrKillSwitchBypassDetected?: boolean;
  missingBeforeStateDetected?: boolean;
  weakPolicyUsedForExecution?: boolean;
  learningOverrodePolicyOrSafety?: boolean;
  untraceableActionDetected?: boolean;
  certificationActor?: string;
  certificationRef?: string;
  certifiedAt?: string;
}

export interface ProductionCertificationResult {
  status: ProductionCertificationStatus;
  blockers: string[];
  evidence: string[];
  productionReady: boolean;
  fingerprint: string;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function evaluateProductionCertification(input: ProductionCertificationInput): ProductionCertificationResult {
  const blockers: string[] = [];
  const evidence: string[] = [];
  const domain = clean(input.siteDomain).toLowerCase();

  if (domain !== PRODUCTION_CERTIFICATION_SITE) blockers.push("V1 production certification is locked to diamondshelf.us");
  if (!Number.isInteger(input.unresolvedRegressions) || input.unresolvedRegressions < 0) blockers.push("unresolvedRegressions must be a non-negative integer");
  if (!Number.isInteger(input.pendingVerifications) || input.pendingVerifications < 0) blockers.push("pendingVerifications must be a non-negative integer");

  const fatalChecks: Array<[boolean | undefined, string]> = [
    [input.credentialsLeakDetected, "credential leak detected"],
    [input.fixtureMetricsRepresentedAsLive, "fixture metrics represented as live data"],
    [input.unsupportedMutationDetected, "unsupported production mutation detected"],
    [input.approvalOrKillSwitchBypassDetected, "approval or global kill-switch bypass detected"],
    [input.missingBeforeStateDetected, "production mutation missing captured before-state"],
    [input.weakPolicyUsedForExecution, "weak policy tier used as executable authority"],
    [input.learningOverrodePolicyOrSafety, "learning overrode policy or safety"],
    [input.untraceableActionDetected, "untraceable opportunity or action detected"],
  ];
  for (const [failed, reason] of fatalChecks) if (failed) blockers.push(reason);
  if (input.unresolvedRegressions > 0) blockers.push("unresolved production regression exists");
  if (input.pendingVerifications > 0) blockers.push("production verification remains pending");

  const softwareReady = input.softwareBaselineGreen && input.runtimeDatabaseReady;
  if (softwareReady) evidence.push("software baseline and production runtime/database are ready");

  const readOnlyReady = softwareReady && input.readOnlyConnectionsVerified && input.realBaselineCertified && input.opportunityRunCompleted && input.dashboardLiveDataVerified;
  if (readOnlyReady) evidence.push("read-only connections, real baseline, opportunity run, and live dashboard data are verified");

  const controlledWriteReady = readOnlyReady && input.dryRunCompleted && input.controlledWritePathVerified;
  if (controlledWriteReady) evidence.push("dry-run planning and controlled-write safety path are verified");

  const liveChainComplete = controlledWriteReady
    && input.controlledProductionActionCompleted
    && input.controlledProductionActionVerified
    && input.measurementCompleted
    && input.guardedAutonomyGateVerified;
  if (liveChainComplete) evidence.push("controlled production action, verification, measurement, and guarded-autonomy gate are complete");

  const attestationReady = Boolean(clean(input.certificationActor) && clean(input.certificationRef) && input.certifiedAt && Number.isFinite(Date.parse(input.certifiedAt)));
  if (liveChainComplete && !attestationReady) blockers.push("final certification requires actor, certification reference, and valid certifiedAt timestamp");

  let status: ProductionCertificationStatus = "NOT_STARTED";
  if (readOnlyReady) status = "READ_ONLY_READY";
  if (controlledWriteReady) status = "CONTROLLED_WRITE_READY";
  if (liveChainComplete && attestationReady && blockers.length === 0) status = "PILOT_CERTIFIED";

  if (blockers.length > 0 && status === "PILOT_CERTIFIED") status = "CONTROLLED_WRITE_READY";
  const productionReady = status === "PILOT_CERTIFIED" && blockers.length === 0;

  return {
    status,
    blockers,
    evidence,
    productionReady,
    fingerprint: hash([
      domain,
      status,
      blockers,
      evidence,
      clean(input.certificationActor),
      clean(input.certificationRef),
      input.certifiedAt ?? null,
    ]),
  };
}

export function assertProductionCertified(result: ProductionCertificationResult): void {
  if (!result.productionReady || result.status !== "PILOT_CERTIFIED") {
    throw new Error("SEO ENGINE V1 is not production certified for Diamond Shelf.");
  }
}
