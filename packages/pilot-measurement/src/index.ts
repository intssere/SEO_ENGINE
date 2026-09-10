import {
  evaluateExperiment,
  normalizeExperimentDefinition,
  toOutcomeInserts,
  type ExperimentAssignment,
  type ExperimentDefinition,
  type ExperimentEvaluation,
  type MetricObservation,
} from "@seo-engine/experiment-engine";

export type PilotMeasurementStatus = "blocked" | "awaiting_data" | "measured";
export type VerifiedDeploymentStatus = "verified" | "failed" | "regressed" | "pending";

export interface PilotMeasurementInput {
  siteId: string;
  siteDomain: string;
  experimentId: string;
  deploymentId: string;
  treatmentPageId: string;
  controlPageIds: string[];
  deploymentStatus: "completed" | "failed" | "pending";
  verificationStatus: VerifiedDeploymentStatus;
  definition: ExperimentDefinition;
  observations: MetricObservation[];
  metricSource: "gsc" | "ga4";
  publicSiteWritesEnabled?: boolean;
}

export interface PilotMeasurementResult {
  status: PilotMeasurementStatus;
  blockers: string[];
  evaluation: ExperimentEvaluation | null;
  outcomeInserts: ReturnType<typeof toOutcomeInserts>;
  provenance: {
    siteId: string;
    deploymentId: string;
    experimentId: string;
    metricSource: "gsc" | "ga4";
    treatmentPageId: string;
    controlPageIds: string[];
    causalClaimAllowed: boolean;
  };
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function blocked(input: PilotMeasurementInput, blockers: string[]): PilotMeasurementResult {
  return {
    status: "blocked",
    blockers,
    evaluation: null,
    outcomeInserts: [],
    provenance: {
      siteId: input.siteId.trim(),
      deploymentId: input.deploymentId.trim(),
      experimentId: input.experimentId.trim(),
      metricSource: input.metricSource,
      treatmentPageId: input.treatmentPageId.trim(),
      controlPageIds: uniqueNonEmpty(input.controlPageIds),
      causalClaimAllowed: false,
    },
  };
}

export function measureControlledPilot(input: PilotMeasurementInput): PilotMeasurementResult {
  const blockers: string[] = [];
  const siteId = input.siteId.trim();
  const siteDomain = input.siteDomain.trim().toLowerCase();
  const deploymentId = input.deploymentId.trim();
  const experimentId = input.experimentId.trim();
  const treatmentPageId = input.treatmentPageId.trim();
  const controlPageIds = uniqueNonEmpty(input.controlPageIds).filter((id) => id !== treatmentPageId);

  if (!siteId) blockers.push("siteId is required");
  if (siteDomain !== "diamondshelf.us") blockers.push("Task #28 is locked to diamondshelf.us");
  if (!deploymentId) blockers.push("deploymentId is required");
  if (!experimentId) blockers.push("experimentId is required");
  if (!treatmentPageId) blockers.push("treatmentPageId is required");
  if (controlPageIds.length === 0) blockers.push("At least one distinct control page is required");
  if (input.deploymentStatus !== "completed") blockers.push("Measurement requires a completed controlled deployment");
  if (input.verificationStatus !== "verified") blockers.push("Measurement requires successful post-deployment verification");
  if (input.publicSiteWritesEnabled === true) blockers.push("Measurement phase is read-only and requires public-site writes disabled");
  if (input.definition.siteId.trim() !== siteId) blockers.push("Experiment definition siteId must match the pilot site");

  if (blockers.length > 0) return blocked(input, blockers);

  const definition = normalizeExperimentDefinition({
    ...input.definition,
    minPagesPerCohort: input.definition.minPagesPerCohort ?? 1,
  });

  const assignments: ExperimentAssignment[] = [
    { pageId: treatmentPageId, cohort: "treatment", assignmentKey: `pilot-treatment:${treatmentPageId}`, metadata: { deploymentId } },
    ...controlPageIds.map((pageId) => ({
      pageId,
      cohort: "control" as const,
      assignmentKey: `pilot-control:${pageId}`,
      metadata: { deploymentId },
    })),
  ];

  const evaluation = evaluateExperiment(definition, assignments, input.observations);
  const causalClaimAllowed = evaluation.status !== "insufficient_data";

  return {
    status: causalClaimAllowed ? "measured" : "awaiting_data",
    blockers: [],
    evaluation,
    outcomeInserts: causalClaimAllowed ? toOutcomeInserts(experimentId, evaluation) : [],
    provenance: {
      siteId,
      deploymentId,
      experimentId,
      metricSource: input.metricSource,
      treatmentPageId,
      controlPageIds,
      causalClaimAllowed,
    },
  };
}
