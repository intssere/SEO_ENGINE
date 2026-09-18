import type { DashboardCertification } from "@workspace/api-client-react";
import type { StatusTone } from "./status-grammar";

export type AuditFindingSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "unclassified";

export type AuditFindingRow = {
  rowId: string;
  id: string | null;
  title: string;
  category: string;
  severity: AuditFindingSeverity;
  severityTone: StatusTone;
  status: string;
  description: string;
  url: string | null;
};

export type AuditWorkspaceModel = {
  readiness: {
    state: "live" | "setup_required" | "unavailable";
    label: string;
    message: string;
    tone: StatusTone;
  };
  coverage: {
    state: "whole_site" | "bounded" | "not_evaluated" | "unavailable";
    label: string;
    detail: string;
    tone: StatusTone;
    fetched: number | null;
    discovered: number | null;
    percent: number | null;
    boundedLimit: number | null;
  };
  findings: {
    rows: AuditFindingRow[];
    total: number;
    bySeverity: Record<AuditFindingSeverity, number>;
    completenessNote: string;
  };
  urlExplorer: {
    binding: "unavailable";
    label: "Read model not bound";
    rows: [];
    retainedColumns: [
      "canonicalUrl",
      "pathname",
      "sourceSitemaps",
      "lastmod",
      "recrawlStatus",
      "recrawlPriority",
      "recrawlReasons",
    ];
    unavailableDimensions: [
      "httpStatus",
      "fetchOutcome",
      "redirectTarget",
      "canonicalTarget",
      "indexability",
      "contentFingerprint",
    ];
    reason: string;
  };
  history: {
    binding: "unavailable";
    label: "History read model not bound";
    reason: string;
  };
  recrawl: {
    binding: "unavailable";
    label: "Incremental recrawl read model not bound";
    reason: string;
  };
  authorization: {
    networkExecutionEnabled: false;
    crawlExecutionAuthorized: false;
    sitemapNetworkFetchingEnabled: false;
    productionEvidenceReadsAuthorized: false;
    persistenceAuthorized: false;
    schedulerEnabled: false;
    workerEnabled: false;
    publicSiteWrites: false;
  };
};

type AuditWorkspaceInput = {
  readiness?: unknown;
  findingRows?: readonly Record<string, unknown>[];
  certification?: DashboardCertification | null;
};

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSeverity(value: unknown): AuditFindingSeverity {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    normalized === "critical" ||
    normalized === "high" ||
    normalized === "medium" ||
    normalized === "low" ||
    normalized === "info"
  ) {
    return normalized;
  }
  return "unclassified";
}

function severityTone(severity: AuditFindingSeverity): StatusTone {
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  if (severity === "low" || severity === "info") return "info";
  return "neutral";
}

function normalizeFinding(
  row: Readonly<Record<string, unknown>>,
  sourceIndex: number,
): AuditFindingRow {
  const id = nullableText(row.id);
  const title = textValue(row.title, "Untitled technical finding");
  const url = nullableText(row.url);
  const severity = normalizeSeverity(row.severity);
  return {
    rowId: id ?? `finding:${sourceIndex}:${title}:${url ?? "no-url"}`,
    id,
    title,
    category: textValue(row.category, "Unclassified"),
    severity,
    severityTone: severityTone(severity),
    status: textValue(row.status, "unknown"),
    description: textValue(row.description, "No description exposed."),
    url,
  };
}

function normalizeReadiness(value: unknown): AuditWorkspaceModel["readiness"] {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const state =
    record.state === "live" ||
    record.state === "setup_required" ||
    record.state === "unavailable"
      ? record.state
      : "unavailable";
  const message = textValue(
    record.message,
    state === "live"
      ? "Operational technical findings are available."
      : "Technical findings readiness is unavailable.",
  );
  return {
    state,
    label:
      state === "live"
        ? "Findings data available"
        : state === "setup_required"
          ? "Setup required"
          : "Findings data unavailable",
    message,
    tone:
      state === "live"
        ? "success"
        : state === "setup_required"
          ? "warning"
          : "danger",
  };
}

function coverageModel(
  certification: DashboardCertification | null | undefined,
): AuditWorkspaceModel["coverage"] {
  if (!certification) {
    return {
      state: "unavailable",
      label: "Coverage unavailable",
      detail: "No crawl certification snapshot is exposed to this workspace.",
      tone: "neutral",
      fetched: null,
      discovered: null,
      percent: null,
      boundedLimit: null,
    };
  }
  const coverage = certification.crawlCoverage;
  if (certification.wholeSiteCertified) {
    return {
      state: "whole_site",
      label: "Whole-site certified",
      detail: `${coverage.fetched} fetched of ${coverage.discovered} discovered URLs.`,
      tone: "success",
      fetched: coverage.fetched,
      discovered: coverage.discovered,
      percent: coverage.percent,
      boundedLimit: coverage.boundedLimit,
    };
  }
  if (certification.status === "not_evaluated") {
    return {
      state: "not_evaluated",
      label: "Coverage not evaluated",
      detail: "Whole-site coverage has not been certified.",
      tone: "neutral",
      fetched: coverage.fetched,
      discovered: coverage.discovered,
      percent: coverage.percent,
      boundedLimit: coverage.boundedLimit,
    };
  }
  return {
    state: "bounded",
    label: "Bounded baseline only",
    detail: `${coverage.fetched} fetched of ${coverage.discovered} discovered URLs · bounded limit ${coverage.boundedLimit}. This is not whole-site coverage.`,
    tone: "warning",
    fetched: coverage.fetched,
    discovered: coverage.discovered,
    percent: coverage.percent,
    boundedLimit: coverage.boundedLimit,
  };
}

export function buildAuditWorkspaceModel({
  readiness,
  findingRows = [],
  certification = null,
}: AuditWorkspaceInput): AuditWorkspaceModel {
  const rows = findingRows.map((row, index) => normalizeFinding(row, index));
  const bySeverity: Record<AuditFindingSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    unclassified: 0,
  };
  for (const row of rows) bySeverity[row.severity] += 1;

  return {
    readiness: normalizeReadiness(readiness),
    coverage: coverageModel(certification),
    findings: {
      rows,
      total: rows.length,
      bySeverity,
      completenessNote:
        "These are the currently exposed persisted technical findings. They do not prove complete full-site URL inventory coverage.",
    },
    urlExplorer: {
      binding: "unavailable",
      label: "Read model not bound",
      rows: [],
      retainedColumns: [
        "canonicalUrl",
        "pathname",
        "sourceSitemaps",
        "lastmod",
        "recrawlStatus",
        "recrawlPriority",
        "recrawlReasons",
      ],
      unavailableDimensions: [
        "httpStatus",
        "fetchOutcome",
        "redirectTarget",
        "canonicalTarget",
        "indexability",
        "contentFingerprint",
      ],
      reason:
        "P2.7 defines the URL Explorer query/result contract, but no frontend GET endpoint currently exposes that read model. No URL rows are synthesized.",
    },
    history: {
      binding: "unavailable",
      label: "History read model not bound",
      reason:
        "P2.5 crawl history/comparison exists as an engineering contract only; no frontend history snapshot is exposed.",
    },
    recrawl: {
      binding: "unavailable",
      label: "Incremental recrawl read model not bound",
      reason:
        "P2.6 incremental recrawl planning exists as an engineering contract only; no frontend recrawl plan is exposed.",
    },
    authorization: {
      networkExecutionEnabled: false,
      crawlExecutionAuthorized: false,
      sitemapNetworkFetchingEnabled: false,
      productionEvidenceReadsAuthorized: false,
      persistenceAuthorized: false,
      schedulerEnabled: false,
      workerEnabled: false,
      publicSiteWrites: false,
    },
  };
}
