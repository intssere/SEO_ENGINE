export const P11_7_EXECUTIVE_REPORT_VERSION =
  "p11.7-executive-report-v1" as const;

export type ExecutiveReportTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type ExecutiveReportSectionKey =
  | "summary"
  | "kpis"
  | "highlights"
  | "guardrails";

export type ExecutiveReportView = "executive" | "operations";

export type ExecutiveReportMetricInput = {
  key: string;
  label: string;
  value: string;
  delta: string | null;
  source: string;
};

export type ExecutiveReportSummaryInput = {
  key:
    | "readiness"
    | "coverage"
    | "decisions"
    | "verification"
    | "impact"
    | "intelligence";
  label: string;
  value: string;
  detail: string;
  tone: ExecutiveReportTone;
  source: string;
};

export type ExecutiveReportHighlightInput = {
  id: string;
  title: string;
  detail: string;
  state: string;
  source: string;
};

export type ExecutiveReportFixture = {
  version: "p11.7-synthetic-report-fixture-v1";
  fixtureKind: "synthetic_read_only";
  reportId: string;
  siteLabel: string;
  domain: string;
  referenceTime: string;
  headline: string;
  summary: ExecutiveReportSummaryInput[];
  metrics: ExecutiveReportMetricInput[];
  highlights: ExecutiveReportHighlightInput[];
  evidenceLineage: {
    source: string;
    fingerprint: string;
  }[];
  guardrails: string[];
  diagnostics: string[];
};

export type ExecutiveReportModel = {
  version: typeof P11_7_EXECUTIVE_REPORT_VERSION;
  fixtureKind: "synthetic_read_only";
  reportId: string;
  siteLabel: string;
  domain: string;
  referenceTime: string;
  headline: string;
  summary: ExecutiveReportSummaryInput[];
  metrics: ExecutiveReportMetricInput[];
  highlights: ExecutiveReportHighlightInput[];
  evidenceLineage: {
    source: string;
    fingerprint: string;
  }[];
  guardrails: string[];
  diagnostics: string[];
  reportFingerprint: string;
  safety: ReturnType<typeof executiveReportCapability>;
};

export type ExecutiveReportShareState = {
  view: ExecutiveReportView;
  sections: ExecutiveReportSectionKey[];
};

const HEX_64 = /^[0-9a-f]{64}$/;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const ALLOWED_SECTIONS: readonly ExecutiveReportSectionKey[] = [
  "summary",
  "kpis",
  "highlights",
  "guardrails",
];
const ALLOWED_VIEWS: readonly ExecutiveReportView[] = [
  "executive",
  "operations",
];

function exactString(value: string, code: string, maxLength = 2048): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value
  ) {
    throw new Error(code);
  }
  return value;
}

function canonicalTime(value: string, code: string): string {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(code);
  const canonical = new Date(milliseconds).toISOString();
  if (canonical !== value) throw new Error(code);
  return canonical;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => JSON.stringify(key) + ":" + stableJson(record[key]))
      .join(",") +
    "}"
  );
}

function deterministicFingerprint(value: unknown): string {
  const input = stableJson(value);
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= code + index;
    hashB = Math.imul(hashB, 0x85ebca6b);
  }
  return (
    (hashA >>> 0).toString(16).padStart(8, "0") +
    (hashB >>> 0).toString(16).padStart(8, "0")
  );
}

function unique(values: readonly string[], code: string): void {
  if (new Set(values).size !== values.length) throw new Error(code);
}

function validateFixture(fixture: ExecutiveReportFixture): void {
  if (fixture.version !== "p11.7-synthetic-report-fixture-v1") {
    throw new Error("executive_report_fixture_version_mismatch");
  }
  if (fixture.fixtureKind !== "synthetic_read_only") {
    throw new Error("executive_report_fixture_kind_mismatch");
  }

  exactString(fixture.reportId, "invalid_executive_report_id", 256);
  exactString(fixture.siteLabel, "invalid_executive_report_site_label", 256);
  exactString(fixture.domain, "invalid_executive_report_domain", 256);
  if (!DOMAIN.test(fixture.domain)) {
    throw new Error("invalid_executive_report_domain");
  }
  canonicalTime(
    fixture.referenceTime,
    "invalid_executive_report_reference_time",
  );
  exactString(fixture.headline, "invalid_executive_report_headline", 512);

  if (fixture.summary.length !== 6) {
    throw new Error("executive_report_summary_count_mismatch");
  }
  unique(
    fixture.summary.map((item) => item.key),
    "duplicate_executive_report_summary_key",
  );

  for (const item of fixture.summary) {
    exactString(item.label, "invalid_executive_report_summary_label", 128);
    exactString(item.value, "invalid_executive_report_summary_value", 256);
    exactString(item.detail, "invalid_executive_report_summary_detail", 1024);
    exactString(item.source, "invalid_executive_report_summary_source", 128);
  }

  unique(
    fixture.metrics.map((metric) => metric.key),
    "duplicate_executive_report_metric_key",
  );
  for (const metric of fixture.metrics) {
    exactString(metric.key, "invalid_executive_report_metric_key", 128);
    exactString(metric.label, "invalid_executive_report_metric_label", 128);
    exactString(metric.value, "invalid_executive_report_metric_value", 256);
    if (metric.delta !== null) {
      exactString(metric.delta, "invalid_executive_report_metric_delta", 128);
    }
    exactString(metric.source, "invalid_executive_report_metric_source", 128);
  }

  unique(
    fixture.highlights.map((highlight) => highlight.id),
    "duplicate_executive_report_highlight_id",
  );
  for (const highlight of fixture.highlights) {
    exactString(highlight.id, "invalid_executive_report_highlight_id", 128);
    exactString(
      highlight.title,
      "invalid_executive_report_highlight_title",
      256,
    );
    exactString(
      highlight.detail,
      "invalid_executive_report_highlight_detail",
      1024,
    );
    exactString(
      highlight.state,
      "invalid_executive_report_highlight_state",
      128,
    );
    exactString(
      highlight.source,
      "invalid_executive_report_highlight_source",
      128,
    );
  }

  unique(
    fixture.evidenceLineage.map((item) => item.source),
    "duplicate_executive_report_lineage_source",
  );
  for (const item of fixture.evidenceLineage) {
    exactString(item.source, "invalid_executive_report_lineage_source", 128);
    if (!HEX_64.test(item.fingerprint)) {
      throw new Error("invalid_executive_report_lineage_fingerprint");
    }
  }

  for (const guardrail of fixture.guardrails) {
    exactString(guardrail, "invalid_executive_report_guardrail", 1024);
  }
  for (const diagnostic of fixture.diagnostics) {
    exactString(diagnostic, "invalid_executive_report_diagnostic", 1024);
  }
}

export function executiveReportCapability() {
  return Object.freeze({
    version: P11_7_EXECUTIVE_REPORT_VERSION,
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
}

export function buildExecutiveReport(
  fixture: ExecutiveReportFixture,
): ExecutiveReportModel {
  validateFixture(fixture);

  const normalized = {
    version: P11_7_EXECUTIVE_REPORT_VERSION,
    fixtureKind: fixture.fixtureKind,
    reportId: fixture.reportId,
    siteLabel: fixture.siteLabel,
    domain: fixture.domain,
    referenceTime: fixture.referenceTime,
    headline: fixture.headline,
    summary: structuredClone(fixture.summary).sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
    metrics: structuredClone(fixture.metrics).sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
    highlights: structuredClone(fixture.highlights).sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    evidenceLineage: structuredClone(fixture.evidenceLineage).sort(
      (left, right) => left.source.localeCompare(right.source),
    ),
    guardrails: [...fixture.guardrails].sort((left, right) =>
      left.localeCompare(right),
    ),
    diagnostics: [...fixture.diagnostics].sort((left, right) =>
      left.localeCompare(right),
    ),
  };

  return {
    ...normalized,
    reportFingerprint: deterministicFingerprint(normalized),
    safety: executiveReportCapability(),
  };
}

function protectSpreadsheetFormula(value: string): string {
  const trimmedStart = value.replace(/^\s+/, "");
  return /^[=+\-@]/.test(trimmedStart) ? "'" + value : value;
}

function csvCell(value: string): string {
  const protectedValue = protectSpreadsheetFormula(value);
  return '"' + protectedValue.replaceAll('"', '""') + '"';
}

export function serializeExecutiveReportCsv(
  model: ExecutiveReportModel,
): string {
  const rows: string[][] = [
    ["section", "key", "label", "value", "detail", "source"],
    ...model.summary.map((item) => [
      "summary",
      item.key,
      item.label,
      item.value,
      item.detail,
      item.source,
    ]),
    ...model.metrics.map((metric) => [
      "kpi",
      metric.key,
      metric.label,
      metric.value,
      metric.delta ?? "",
      metric.source,
    ]),
    ...model.highlights.map((highlight) => [
      "highlight",
      highlight.id,
      highlight.title,
      highlight.state,
      highlight.detail,
      highlight.source,
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function serializeExecutiveReportJson(
  model: ExecutiveReportModel,
): string {
  return JSON.stringify(
    {
      version: model.version,
      reportId: model.reportId,
      reportFingerprint: model.reportFingerprint,
      siteLabel: model.siteLabel,
      domain: model.domain,
      referenceTime: model.referenceTime,
      headline: model.headline,
      summary: model.summary,
      metrics: model.metrics,
      highlights: model.highlights,
      evidenceLineage: model.evidenceLineage,
      guardrails: model.guardrails,
      diagnostics: model.diagnostics,
      safety: model.safety,
    },
    null,
    2,
  ) + "\n";
}

export function buildExecutivePrintText(
  model: ExecutiveReportModel,
  state: ExecutiveReportShareState,
): string {
  const lines = [
    model.siteLabel,
    model.headline,
    `Reference time: ${model.referenceTime}`,
    `Report fingerprint: ${model.reportFingerprint}`,
    "",
  ];

  if (state.sections.includes("summary")) {
    lines.push("Executive summary");
    for (const item of model.summary) {
      lines.push(`- ${item.label}: ${item.value} — ${item.detail}`);
    }
    lines.push("");
  }

  if (state.sections.includes("kpis")) {
    lines.push("KPIs");
    for (const metric of model.metrics) {
      const delta = metric.delta ? ` (${metric.delta})` : "";
      lines.push(`- ${metric.label}: ${metric.value}${delta}`);
    }
    lines.push("");
  }

  if (state.sections.includes("highlights")) {
    lines.push("Highlights");
    for (const highlight of model.highlights) {
      lines.push(
        `- ${highlight.title} [${highlight.state}]: ${highlight.detail}`,
      );
    }
    lines.push("");
  }

  if (state.sections.includes("guardrails")) {
    lines.push("Guardrails");
    for (const guardrail of model.guardrails) {
      lines.push(`- ${guardrail}`);
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function normalizeExecutiveReportShareState(
  input: Partial<ExecutiveReportShareState>,
): ExecutiveReportShareState {
  const view = ALLOWED_VIEWS.includes(input.view as ExecutiveReportView)
    ? (input.view as ExecutiveReportView)
    : "executive";
  const sections = (input.sections ?? ALLOWED_SECTIONS)
    .filter((section): section is ExecutiveReportSectionKey =>
      ALLOWED_SECTIONS.includes(section as ExecutiveReportSectionKey),
    )
    .filter((section, index, values) => values.indexOf(section) === index)
    .sort(
      (left, right) =>
        ALLOWED_SECTIONS.indexOf(left) - ALLOWED_SECTIONS.indexOf(right),
    );

  return {
    view,
    sections: sections.length > 0 ? sections : ["summary"],
  };
}

export function serializeExecutiveReportShareState(
  state: ExecutiveReportShareState,
): string {
  const normalized = normalizeExecutiveReportShareState(state);
  const params = new URLSearchParams();
  params.set("view", normalized.view);
  params.set("sections", normalized.sections.join(","));
  return params.toString();
}

export function parseExecutiveReportShareState(
  search: string,
): ExecutiveReportShareState {
  if (search.length > 512) {
    throw new Error("executive_report_share_state_too_long");
  }
  const normalizedSearch = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);
  const unknown = [...params.keys()].filter(
    (key) => key !== "view" && key !== "sections",
  );
  if (unknown.length > 0) {
    throw new Error("executive_report_share_state_unknown_parameter");
  }

  const rawView = params.get("view");
  const rawSections = params.get("sections");

  if (rawView && !ALLOWED_VIEWS.includes(rawView as ExecutiveReportView)) {
    throw new Error("executive_report_share_state_invalid_view");
  }

  let sections: ExecutiveReportSectionKey[] | undefined;
  if (rawSections !== null) {
    const parts = rawSections.split(",").filter(Boolean);
    if (
      parts.length === 0 ||
      parts.some(
        (part) =>
          !ALLOWED_SECTIONS.includes(part as ExecutiveReportSectionKey),
      )
    ) {
      throw new Error("executive_report_share_state_invalid_sections");
    }
    sections = parts as ExecutiveReportSectionKey[];
  }

  return normalizeExecutiveReportShareState({
    view: (rawView ?? "executive") as ExecutiveReportView,
    sections,
  });
}

function syntheticFingerprint(value: number): string {
  return value.toString(16).padStart(64, "0");
}

export const P11_7_SYNTHETIC_EXECUTIVE_REPORT_FIXTURE: ExecutiveReportFixture = {
  version: "p11.7-synthetic-report-fixture-v1",
  fixtureKind: "synthetic_read_only",
  reportId: "p117-executive-report-synthetic",
  siteLabel: "Diamond Shelf · synthetic executive report",
  domain: "diamondshelf.us",
  referenceTime: "2026-09-21T12:00:00.000Z",
  headline:
    "Bounded evidence shows active SEO work, partial crawl coverage, verified changes, and descriptive impact signals.",
  summary: [
    {
      key: "readiness",
      label: "Data readiness",
      value: "Synthetic evidence available",
      detail:
        "This engineering report uses supplied fixtures only and does not load production data.",
      tone: "info",
      source: "P4 Command Center",
    },
    {
      key: "coverage",
      label: "Coverage",
      value: "71.4% bounded crawl",
      detail: "30 fetched of 42 discovered URLs; whole-site certification is false.",
      tone: "warning",
      source: "P2/P4 coverage projection",
    },
    {
      key: "decisions",
      label: "Decision queue",
      value: "2 approvals pending",
      detail: "Human governance remains required; this report cannot approve or execute.",
      tone: "warning",
      source: "P8 governance projection",
    },
    {
      key: "verification",
      label: "Verification",
      value: "5 of 6 verified",
      detail: "One verification remains pending and no regression is asserted.",
      tone: "info",
      source: "P8 verification projection",
    },
    {
      key: "impact",
      label: "Impact evidence",
      value: "4 supplied outcomes",
      detail:
        "Three expected-vs-actual comparisons are available; arithmetic is not causal impact.",
      tone: "info",
      source: "P10.5/P10.7 impact projection",
    },
    {
      key: "intelligence",
      label: "AI & learning",
      value: "7 learning signals",
      detail:
        "AI visibility and calibration signals remain descriptive and do not change ranking or policy.",
      tone: "neutral",
      source: "P7/P10.6 projection",
    },
  ],
  metrics: [
    {
      key: "ai_citation_rate",
      label: "AI citation rate",
      value: "18.0%",
      delta: "+2.0%",
      source: "P7 synthetic observation",
    },
    {
      key: "average_position",
      label: "Average position",
      value: "14.2",
      delta: "-1.3",
      source: "Synthetic dashboard metric",
    },
    {
      key: "organic_clicks",
      label: "Organic clicks",
      value: "1,240",
      delta: "+8.2%",
      source: "Synthetic dashboard metric",
    },
    {
      key: "organic_ctr",
      label: "Organic CTR",
      value: "2.6%",
      delta: "+0.2%",
      source: "Synthetic dashboard metric",
    },
    {
      key: "search_impressions",
      label: "Search impressions",
      value: "48,300",
      delta: "+5.1%",
      source: "Synthetic dashboard metric",
    },
  ],
  highlights: [
    {
      id: "approval-queue",
      title: "Approval queue requires review",
      detail:
        "Two synthetic proposals remain in the human-governance queue; no report action can execute them.",
      state: "review_required",
      source: "P8 governance",
    },
    {
      id: "coverage-gap",
      title: "Whole-site coverage remains incomplete",
      detail:
        "The bounded crawl fetched 30 of 42 discovered URLs and cannot support a whole-site production claim.",
      state: "bounded_only",
      source: "P2 coverage",
    },
    {
      id: "impact-context",
      title: "Impact signals remain descriptive",
      detail:
        "Expected-vs-actual arithmetic and calibration direction are retained without a causal or recommendation-quality verdict.",
      state: "descriptive_only",
      source: "P10 measurement",
    },
    {
      id: "verification-progress",
      title: "Verification is mostly complete",
      detail:
        "Five of six synthetic verification records are verified, with one still pending.",
      state: "pending_follow_up",
      source: "P8 verification",
    },
  ],
  evidenceLineage: [
    { source: "p2-coverage", fingerprint: syntheticFingerprint(701) },
    { source: "p7-ai-visibility", fingerprint: syntheticFingerprint(702) },
    { source: "p8-governance", fingerprint: syntheticFingerprint(703) },
    { source: "p10-impact", fingerprint: syntheticFingerprint(704) },
    { source: "p11-hardening", fingerprint: syntheticFingerprint(705) },
  ],
  guardrails: [
    "This report does not authorize approvals, execution, provider writes, public-site writes, model updates, policy changes, deployment, or publication.",
    "CSV and JSON are generated locally from the synthetic fixture only; production data export is not authorized.",
    "Share state contains only view configuration and never embeds report evidence.",
    "Expected-vs-actual arithmetic, chronology, association, and directional calibration do not establish causal impact.",
    "Whole-site readiness cannot be inferred from bounded crawl coverage.",
  ],
  diagnostics: [
    "No server report endpoint or persistence layer is attached.",
    "No email, Slack, webhook, file-provider, or public-link delivery is attached.",
    "No Production database read/write or provider request is attached.",
    "This exact fixture is engineering presentation evidence only.",
  ],
};
