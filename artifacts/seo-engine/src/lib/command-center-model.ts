import type { DashboardSnapshot } from "@workspace/api-client-react";
import type { StatusTone } from "./status-grammar";

export type CommandCenterCardId =
  | "data"
  | "coverage"
  | "decisions"
  | "verification"
  | "measurement"
  | "intelligence";

export type CommandCenterCard = {
  id: CommandCenterCardId;
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
  href: string;
  linkLabel: string;
};

export type CommandCenterModel = {
  dataState: {
    label: string;
    detail: string;
    tone: StatusTone;
  };
  coverageState: {
    label: string;
    detail: string;
    tone: StatusTone;
  };
  cards: CommandCenterCard[];
  verificationPercent: number;
  hasAiVisibility: boolean;
  hasLearningSignals: boolean;
  isBoundedCoverage: boolean;
};

function positiveCount(...values: number[]) {
  return values.some((value) => Number.isFinite(value) && value > 0);
}

function dashboardValueAvailable(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "—" && normalized !== "n/a";
}

export function buildCommandCenterModel(
  snapshot: DashboardSnapshot,
): CommandCenterModel {
  const dataState =
    snapshot.state !== "live"
      ? {
          label: "Data unavailable",
          detail: snapshot.reason || "No production metrics are available.",
          tone: "danger" as const,
        }
      : snapshot.stale
        ? {
            label: "Live data may be stale",
            detail: `Last freshness marker: ${snapshot.dataFreshness}`,
            tone: "warning" as const,
          }
        : {
            label: "Live data connected",
            detail: `Freshness marker: ${snapshot.dataFreshness}`,
            tone: "success" as const,
          };

  const certification = snapshot.pilot.certification;
  const isBoundedCoverage = !certification.wholeSiteCertified;
  const coverageState = certification.wholeSiteCertified
    ? {
        label: "Whole-site certified",
        detail: `${certification.crawlCoverage.percent.toFixed(1)}% certified crawl coverage.`,
        tone: "success" as const,
      }
    : certification.status === "not_evaluated"
      ? {
          label: "Coverage not evaluated",
          detail: "Whole-site certification is unavailable.",
          tone: "neutral" as const,
        }
      : {
          label: "Bounded coverage only",
          detail: `${certification.crawlCoverage.fetched} fetched of ${certification.crawlCoverage.discovered} discovered · cap ${certification.crawlCoverage.boundedLimit}.`,
          tone: "warning" as const,
        };

  const verificationPercent =
    snapshot.verification.total > 0
      ? Math.round(
          (snapshot.verification.verified / snapshot.verification.total) * 100,
        )
      : 0;

  const hasAiVisibility = [
    snapshot.aiVisibility.citationRate,
    snapshot.aiVisibility.brandMentionRate,
    snapshot.aiVisibility.citationShare,
  ].some(dashboardValueAvailable);

  const hasLearningSignals =
    snapshot.learning.signalCount > 0 &&
    dashboardValueAvailable(snapshot.learning.averageConfidence);

  const verificationTone: StatusTone =
    snapshot.verification.regressions > 0
      ? "danger"
      : snapshot.verification.pending > 0
        ? "warning"
        : snapshot.verification.total > 0 &&
            snapshot.verification.verified === snapshot.verification.total
          ? "success"
          : "neutral";

  const measurementAvailable = positiveCount(
    snapshot.impact.verifiedOptimizations,
    snapshot.impact.completedExperiments,
    snapshot.impact.rollbacks,
    snapshot.impact.regressionsDetected,
  );

  const cards: CommandCenterCard[] = [
    {
      id: "data",
      label: "Data health",
      value: dataState.label,
      detail: dataState.detail,
      tone: dataState.tone,
      href: "/connections",
      linkLabel: "Review connections",
    },
    {
      id: "coverage",
      label: "Coverage",
      value: coverageState.label,
      detail: coverageState.detail,
      tone: coverageState.tone,
      href: "/technical-seo",
      linkLabel: "Review technical evidence",
    },
    {
      id: "decisions",
      label: "Decision queue",
      value:
        snapshot.approvalsPending > 0
          ? `${snapshot.approvalsPending} approval${snapshot.approvalsPending === 1 ? "" : "s"} pending`
          : `${snapshot.opportunities.length} active opportunit${snapshot.opportunities.length === 1 ? "y" : "ies"}`,
      detail:
        snapshot.approvalsPending > 0
          ? "Human review is required; Command Center does not approve or execute."
          : snapshot.opportunities.length > 0
            ? "Current candidates are ranked from persisted evidence."
            : "No active persisted opportunities are available.",
      tone:
        snapshot.approvalsPending > 0
          ? "warning"
          : snapshot.opportunities.length > 0
            ? "info"
            : "neutral",
      href: snapshot.approvalsPending > 0 ? "/approvals" : "/opportunities",
      linkLabel:
        snapshot.approvalsPending > 0 ? "Review approvals" : "View opportunities",
    },
    {
      id: "verification",
      label: "Verification",
      value:
        snapshot.verification.total > 0
          ? `${snapshot.verification.verified}/${snapshot.verification.total} verified`
          : "No verification records",
      detail:
        snapshot.verification.regressions > 0
          ? `${snapshot.verification.regressions} regression${snapshot.verification.regressions === 1 ? "" : "s"} detected.`
          : snapshot.verification.pending > 0
            ? `${snapshot.verification.pending} verification${snapshot.verification.pending === 1 ? "" : "s"} pending.`
            : "Verification state is descriptive only.",
      tone: verificationTone,
      href: "/deployments",
      linkLabel: "View deployment proof",
    },
    {
      id: "measurement",
      label: "Measured impact",
      value: measurementAvailable
        ? `${snapshot.impact.verifiedOptimizations} verified optimization${snapshot.impact.verifiedOptimizations === 1 ? "" : "s"}`
        : "No measured outcomes",
      detail: measurementAvailable
        ? `${snapshot.impact.completedExperiments} experiments · ${snapshot.impact.rollbacks} rollbacks · ${snapshot.impact.regressionsDetected} regressions.`
        : "No persisted impact outcomes are available.",
      tone:
        snapshot.impact.regressionsDetected > 0
          ? "danger"
          : measurementAvailable
            ? "info"
            : "neutral",
      href: "/impact",
      linkLabel: "Open impact workspace",
    },
    {
      id: "intelligence",
      label: "AI & learning signals",
      value:
        hasAiVisibility || hasLearningSignals
          ? "Persisted signals available"
          : "No persisted signals",
      detail:
        hasAiVisibility || hasLearningSignals
          ? `${snapshot.learning.signalCount} learning signal${snapshot.learning.signalCount === 1 ? "" : "s"} · AI visibility uses persisted observations only.`
          : "No AI visibility or learning signal data is currently available.",
      tone: hasAiVisibility || hasLearningSignals ? "info" : "neutral",
      href: hasAiVisibility ? "/ai-visibility" : "/learning",
      linkLabel: hasAiVisibility ? "Review AI visibility" : "Review learning status",
    },
  ];

  return {
    dataState,
    coverageState,
    cards,
    verificationPercent,
    hasAiVisibility,
    hasLearningSignals,
    isBoundedCoverage,
  };
}
