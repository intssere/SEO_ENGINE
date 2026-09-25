import { createHash } from "node:crypto";
import type { UniversalReadOnlySiteAnalysis } from "./universal-read-only-site-analysis.js";

export const UGP_LIGHTHOUSE_EVIDENCE_VERSION = "ugp-3-5-lighthouse-evidence-v1" as const;
export const UGP_LIGHTHOUSE_LIMITS = Object.freeze({
  maxAudits: 2_000,
  maxAuditIdLength: 160,
  maxDisplayValueLength: 2_048,
  maxNumericValue: 1_000_000_000,
  maxVersionLength: 80,
  maxReportBytes: 10_000_000,
} as const);

export type LighthouseCategoryId = "performance" | "accessibility" | "best-practices" | "seo";
export type LighthouseMetricId =
  | "first-contentful-paint"
  | "largest-contentful-paint"
  | "cumulative-layout-shift"
  | "total-blocking-time"
  | "speed-index"
  | "interactive";

export type SuppliedLighthouseAudit = Readonly<{
  id: string;
  score: number | null;
  numericValue?: number | null;
  numericUnit?: string | null;
  displayValue?: string | null;
}>;

export type SuppliedLighthouseResult = Readonly<{
  lighthouseVersion: string;
  requestedUrl: string;
  finalDisplayedUrl: string;
  fetchTime?: string | null;
  categories: Partial<Record<LighthouseCategoryId, Readonly<{ score: number | null }>>>;
  audits: Readonly<Record<string, SuppliedLighthouseAudit>>;
  sourceFingerprint: string;
}>;

export type NormalizedLighthouseMetric = Readonly<{
  id: LighthouseMetricId;
  availability: "observed" | "unavailable";
  value: number | null;
  unit: string | null;
  score: number | null;
  displayValue: string | null;
  semantics: "lighthouse_lab_metric";
}>;

export type NormalizedLighthouseAudit = Readonly<{
  id: string;
  score: number | null;
  numericValue: number | null;
  numericUnit: string | null;
  displayValue: string | null;
}>;

export type LighthouseOpportunityCode =
  | "lighthouse.performance.review"
  | "lighthouse.seo.review"
  | "lighthouse.accessibility.review"
  | "lighthouse.best_practices.review";

export type NormalizedLighthouseEvidence = Readonly<{
  version: typeof UGP_LIGHTHOUSE_EVIDENCE_VERSION;
  target: Readonly<{
    canonicalOrigin: string;
    requestedUrl: string;
    finalDisplayedUrl: string;
    pageId: string;
  }>;
  provenance: Readonly<{
    mode: "caller_supplied_lighthouse_result";
    lighthouseVersion: string;
    collectionTimestamp: string | null;
    sourceFingerprint: string;
    analysisFingerprint: string;
    reportFingerprint: string;
  }>;
  semantics: Readonly<{
    evidenceClass: "lighthouse_lab";
    fieldCoreWebVitalsInferred: false;
    cruxDataPresent: false;
    transportTimingEquivalent: false;
    wholeSiteCertified: false;
  }>;
  categories: Readonly<Record<LighthouseCategoryId, number | null>>;
  metrics: readonly NormalizedLighthouseMetric[];
  audits: readonly NormalizedLighthouseAudit[];
  opportunities: readonly LighthouseOpportunityCode[];
  authorization: Readonly<{
    lighthouseExecutionAuthorized: false;
    browserExecutionAuthorized: false;
    networkReadAuthorized: false;
    persistenceAuthorized: false;
    schedulerEnabled: false;
    autonomousWorkerEnabled: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  evidenceFingerprint: string;
}>;

const CATEGORY_IDS: readonly LighthouseCategoryId[] = ["accessibility", "best-practices", "performance", "seo"];
const METRIC_IDS: readonly LighthouseMetricId[] = [
  "cumulative-layout-shift",
  "first-contentful-paint",
  "interactive",
  "largest-contentful-paint",
  "speed-index",
  "total-blocking-time",
];

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertFingerprint(value: string, label: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${label}_invalid_fingerprint`);
}

function canonicalUrl(value: string, label: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label}_invalid_url`); }
  if (url.protocol !== "https:") throw new Error(`${label}_https_required`);
  url.hash = "";
  return url.toString();
}

function score(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label}_score_out_of_bounds`);
  }
  return value;
}

function boundedNumeric(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > UGP_LIGHTHOUSE_LIMITS.maxNumericValue) {
    throw new Error(`${label}_numeric_value_out_of_bounds`);
  }
  return value;
}

function boundedText(value: unknown, max: number, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > max) throw new Error(`${label}_invalid_text`);
  return value;
}

function analysisFingerprint(analysis: UniversalReadOnlySiteAnalysis) {
  return hash({
    version: analysis.version,
    site: analysis.site,
    planFingerprint: analysis.provenance.planFingerprint,
    resolutionFingerprint: analysis.provenance.resolutionFingerprint,
    observationSetFingerprint: analysis.provenance.observationSetFingerprint,
    pageFingerprints: analysis.pages.map((page) => page.pageFingerprint).sort(),
  });
}

function opportunityProjection(categories: Readonly<Record<LighthouseCategoryId, number | null>>) {
  const output: LighthouseOpportunityCode[] = [];
  if (categories.performance !== null && categories.performance < 0.9) output.push("lighthouse.performance.review");
  if (categories.seo !== null && categories.seo < 0.9) output.push("lighthouse.seo.review");
  if (categories.accessibility !== null && categories.accessibility < 0.9) output.push("lighthouse.accessibility.review");
  if (categories["best-practices"] !== null && categories["best-practices"] < 0.9) output.push("lighthouse.best_practices.review");
  return output.sort();
}

export function normalizeSuppliedLighthouseEvidence(input: Readonly<{
  analysis: UniversalReadOnlySiteAnalysis;
  report: SuppliedLighthouseResult;
}>): NormalizedLighthouseEvidence {
  const { analysis, report } = input;
  if (!report || typeof report !== "object") throw new Error("lighthouse_report_required");
  assertFingerprint(report.sourceFingerprint, "lighthouse_source");
  if (typeof report.lighthouseVersion !== "string" || report.lighthouseVersion.length === 0 || report.lighthouseVersion.length > UGP_LIGHTHOUSE_LIMITS.maxVersionLength) {
    throw new Error("lighthouse_version_invalid");
  }
  const requestedUrl = canonicalUrl(report.requestedUrl, "lighthouse_requested");
  const finalDisplayedUrl = canonicalUrl(report.finalDisplayedUrl, "lighthouse_final");
  const requested = new URL(requestedUrl);
  const finalUrl = new URL(finalDisplayedUrl);
  if (requested.origin !== analysis.site.canonicalOrigin || finalUrl.origin !== analysis.site.canonicalOrigin) {
    throw new Error("lighthouse_target_outside_analysis_origin");
  }
  const page = analysis.pages.find((candidate) => canonicalUrl(candidate.url, "analysis_page") === finalDisplayedUrl);
  if (!page) throw new Error("lighthouse_target_page_not_in_analysis");

  let collectionTimestamp: string | null = null;
  if (report.fetchTime !== null && report.fetchTime !== undefined) {
    if (typeof report.fetchTime !== "string" || !Number.isFinite(Date.parse(report.fetchTime))) throw new Error("lighthouse_fetch_time_invalid");
    collectionTimestamp = new Date(report.fetchTime).toISOString();
  }

  const categories = Object.fromEntries(CATEGORY_IDS.map((id) => [id, score(report.categories?.[id]?.score, `lighthouse_category_${id}`)])) as Record<LighthouseCategoryId, number | null>;

  const auditEntries = Object.entries(report.audits ?? {});
  if (auditEntries.length > UGP_LIGHTHOUSE_LIMITS.maxAudits) throw new Error("lighthouse_audits_oversized");
  const seen = new Set<string>();
  const audits: NormalizedLighthouseAudit[] = auditEntries.map(([key, audit]) => {
    if (!audit || typeof audit !== "object" || audit.id !== key) throw new Error("lighthouse_audit_identity_mismatch");
    if (audit.id.length === 0 || audit.id.length > UGP_LIGHTHOUSE_LIMITS.maxAuditIdLength) throw new Error("lighthouse_audit_id_invalid");
    if (seen.has(audit.id)) throw new Error("lighthouse_duplicate_audit");
    seen.add(audit.id);
    return {
      id: audit.id,
      score: score(audit.score, `lighthouse_audit_${audit.id}`),
      numericValue: boundedNumeric(audit.numericValue, `lighthouse_audit_${audit.id}`),
      numericUnit: boundedText(audit.numericUnit, 80, `lighthouse_audit_${audit.id}_unit`),
      displayValue: boundedText(audit.displayValue, UGP_LIGHTHOUSE_LIMITS.maxDisplayValueLength, `lighthouse_audit_${audit.id}_display`),
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const auditById = new Map(audits.map((audit) => [audit.id, audit]));
  const metrics: NormalizedLighthouseMetric[] = METRIC_IDS.map((id) => {
    const audit = auditById.get(id);
    return {
      id,
      availability: audit?.numericValue === null || audit?.numericValue === undefined ? "unavailable" : "observed",
      value: audit?.numericValue ?? null,
      unit: audit?.numericUnit ?? null,
      score: audit?.score ?? null,
      displayValue: audit?.displayValue ?? null,
      semantics: "lighthouse_lab_metric" as const,
    };
  });

  const reportFingerprint = hash({
    lighthouseVersion: report.lighthouseVersion,
    requestedUrl,
    finalDisplayedUrl,
    collectionTimestamp,
    categories,
    audits,
    sourceFingerprint: report.sourceFingerprint.toLowerCase(),
  });
  const base = {
    version: UGP_LIGHTHOUSE_EVIDENCE_VERSION,
    target: { canonicalOrigin: analysis.site.canonicalOrigin, requestedUrl, finalDisplayedUrl, pageId: page.pageId },
    provenance: {
      mode: "caller_supplied_lighthouse_result" as const,
      lighthouseVersion: report.lighthouseVersion,
      collectionTimestamp,
      sourceFingerprint: report.sourceFingerprint.toLowerCase(),
      analysisFingerprint: analysisFingerprint(analysis),
      reportFingerprint,
    },
    semantics: {
      evidenceClass: "lighthouse_lab" as const,
      fieldCoreWebVitalsInferred: false as const,
      cruxDataPresent: false as const,
      transportTimingEquivalent: false as const,
      wholeSiteCertified: false as const,
    },
    categories,
    metrics,
    audits,
    opportunities: opportunityProjection(categories),
    authorization: {
      lighthouseExecutionAuthorized: false as const,
      browserExecutionAuthorized: false as const,
      networkReadAuthorized: false as const,
      persistenceAuthorized: false as const,
      schedulerEnabled: false as const,
      autonomousWorkerEnabled: false as const,
      providerWrites: false as const,
      publicSiteWrites: false as const,
    },
  };
  return { ...base, evidenceFingerprint: hash(base) };
}

export function assertLighthouseEvidenceIntegrity(value: NormalizedLighthouseEvidence) {
  const expected = value.evidenceFingerprint;
  const { evidenceFingerprint: _ignored, ...base } = value;
  if (hash(base) !== expected) throw new Error("lighthouse_evidence_integrity_mismatch");
  if (value.semantics.evidenceClass !== "lighthouse_lab" || value.semantics.fieldCoreWebVitalsInferred !== false || value.semantics.cruxDataPresent !== false || value.semantics.transportTimingEquivalent !== false || value.semantics.wholeSiteCertified !== false) {
    throw new Error("lighthouse_semantics_invalid");
  }
  if (Object.values(value.authorization).some(Boolean)) throw new Error("lighthouse_authorization_must_remain_closed");
}
