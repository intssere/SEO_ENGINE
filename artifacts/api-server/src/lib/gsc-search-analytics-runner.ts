import { createHash } from "node:crypto";
import type { SignalCollectionJobPacket } from "./signal-collection-job-planning.js";
import type { SignalCollectionRunnerCapability, SignalCollectionSourceRunner } from "./signal-collection-execution.js";
import type { SourceAdapterRequest } from "./signal-observation-normalization.js";
import type { SignalSourceDescriptor } from "./signal-source-registry.js";

export const GSC_SEARCH_ANALYTICS_RUNNER_VERSION = "task71-gsc-search-analytics-runner-v1" as const;
export const GSC_SEARCH_ANALYTICS_SOURCE_KEY = "google-search-console-search-analytics" as const;
export const GSC_SEARCH_ANALYTICS_READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly" as const;

export const GSC_SEARCH_ANALYTICS_LIMITS = Object.freeze({
  maxDateSpanDays: 31,
  maxFilters: 5,
  maxRowsPerPage: 5000,
  maxPagesPerJob: 2,
  maxTimeoutMs: 10_000,
  maxModeledRowsPerJob: 10_000,
});

type GscDimension = "query" | "page";
type GscFilterOperator = "equals" | "contains";

export type GscSearchAnalyticsFilter = {
  dimension: GscDimension;
  operator: GscFilterOperator;
  expression: string;
};

export type GscSearchAnalyticsBinding = {
  sourceFingerprint: string;
  requestFingerprint: string;
  property: string;
  startDate: string;
  endDate: string;
  dimensions?: GscDimension[];
  filters?: GscSearchAnalyticsFilter[];
  rowLimit?: number;
  maxPages?: number;
  timeoutMs?: number;
};

export type GscSearchAnalyticsTransportRequest = {
  version: typeof GSC_SEARCH_ANALYTICS_RUNNER_VERSION;
  pageFingerprint: string;
  property: string;
  startDate: string;
  endDate: string;
  dimensions: GscDimension[];
  filters: GscSearchAnalyticsFilter[];
  rowLimit: number;
  startRow: number;
  timeoutMs: number;
};

export type GscSearchAnalyticsModeledRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscSearchAnalyticsModeledResponse = {
  rows?: GscSearchAnalyticsModeledRow[];
};

export interface GscSearchAnalyticsTransport {
  query(request: GscSearchAnalyticsTransportRequest): Promise<unknown>;
}

export type GscSearchAnalyticsRunnerOptions = {
  binding?: GscSearchAnalyticsBinding | null;
  transport?: GscSearchAnalyticsTransport | null;
  credentialReady?: boolean;
  networkReady?: boolean;
  liveExecutionAuthorized?: boolean;
};

export type GscSearchAnalyticsReadiness = {
  version: typeof GSC_SEARCH_ANALYTICS_RUNNER_VERSION;
  runnerSupported: true;
  configured: boolean;
  credentialReady: boolean;
  networkReady: boolean;
  readOnlyScope: typeof GSC_SEARCH_ANALYTICS_READONLY_SCOPE;
  liveExecutionAuthorized: boolean;
  sourceReadOnly: true;
  providerWrites: false;
  publicSiteWrites: false;
  observationPersistenceAuthorized: false;
  evidencePersistenceAuthorized: false;
  schedulerEnabled: false;
  batchExecutorEnabled: false;
  autonomousWorkerEnabled: false;
  retryLoopEnabled: false;
};

export type GscSearchAnalyticsErrorCode =
  | "quota_exceeded"
  | "rate_limited"
  | "timeout"
  | "access_denied"
  | "property_not_found"
  | "provider_error";

export class GscSearchAnalyticsTransportError extends Error {
  readonly code: GscSearchAnalyticsErrorCode;

  constructor(code: GscSearchAnalyticsErrorCode) {
    super(code);
    this.name = "GscSearchAnalyticsTransportError";
    this.code = code;
  }
}

type NormalizedBinding = {
  sourceFingerprint: string;
  requestFingerprint: string;
  property: string;
  startDate: string;
  endDate: string;
  dimensions: GscDimension[];
  filters: GscSearchAnalyticsFilter[];
  rowLimit: number;
  maxPages: number;
  timeoutMs: number;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const RESPONSE_KEYS = new Set(["rows"]);
const ROW_KEYS = new Set(["keys", "clicks", "impressions", "ctr", "position"]);
const FILTER_KEYS = new Set(["dimension", "operator", "expression"]);
const DIMENSION_ORDER: GscDimension[] = ["query", "page"];

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function plainObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`invalid_${name}`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new Error(`invalid_${name}`);
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, allowed: Set<string>, name: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`unexpected_${name}_field:${key}`);
  }
}

function boundedInteger(value: unknown, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new Error(`invalid_${name}`);
  return value as number;
}

function boundedNumber(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`invalid_${name}`);
  return value;
}

function fingerprint(value: unknown, name: string): string {
  if (typeof value !== "string") throw new Error(`invalid_${name}`);
  const normalized = value.trim().toLowerCase();
  if (!HEX_64.test(normalized)) throw new Error(`invalid_${name}`);
  return normalized;
}

function isoDate(value: unknown, name: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`invalid_${name}`);
  const milliseconds = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 10) !== value) throw new Error(`invalid_${name}`);
  return value;
}

function normalizeProperty(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid_gsc_property");
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith("sc-domain:")) throw new Error("unsupported_gsc_property_type");
  const domain = normalized.slice("sc-domain:".length);
  if (!DOMAIN.test(domain)) throw new Error("invalid_gsc_property");
  return `sc-domain:${domain}`;
}

function normalizeDimensions(value: GscDimension[] | undefined): GscDimension[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > DIMENSION_ORDER.length) throw new Error("invalid_gsc_dimensions");
  const seen = new Set<GscDimension>();
  for (const dimension of value) {
    if (!DIMENSION_ORDER.includes(dimension)) throw new Error("unsupported_gsc_dimension");
    if (seen.has(dimension)) throw new Error("duplicate_gsc_dimension");
    seen.add(dimension);
  }
  return DIMENSION_ORDER.filter((dimension) => seen.has(dimension));
}

function normalizeFilters(value: GscSearchAnalyticsFilter[] | undefined): GscSearchAnalyticsFilter[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > GSC_SEARCH_ANALYTICS_LIMITS.maxFilters) throw new Error("invalid_gsc_filters");
  const normalized = value.map((item) => {
    const record = plainObject(item, "gsc_filter");
    onlyKeys(record, FILTER_KEYS, "gsc_filter");
    if (record.dimension !== "query" && record.dimension !== "page") throw new Error("unsupported_gsc_filter_dimension");
    if (record.operator !== "equals" && record.operator !== "contains") throw new Error("unsupported_gsc_filter_operator");
    if (typeof record.expression !== "string") throw new Error("invalid_gsc_filter_expression");
    const expression = record.expression.normalize("NFKC").trim();
    if (!expression || expression.length > 256 || /[\u0000-\u001f\u007f]/.test(expression)) throw new Error("invalid_gsc_filter_expression");
    return {
      dimension: record.dimension,
      operator: record.operator,
      expression,
    } as GscSearchAnalyticsFilter;
  });
  return normalized.sort((a, b) =>
    a.dimension.localeCompare(b.dimension)
    || a.operator.localeCompare(b.operator)
    || a.expression.localeCompare(b.expression));
}

export function normalizeGscSearchAnalyticsBinding(input: GscSearchAnalyticsBinding): NormalizedBinding {
  const sourceFingerprint = fingerprint(input.sourceFingerprint, "source_fingerprint");
  const requestFingerprint = fingerprint(input.requestFingerprint, "request_fingerprint");
  const property = normalizeProperty(input.property);
  const startDate = isoDate(input.startDate, "start_date");
  const endDate = isoDate(input.endDate, "end_date");
  const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${endDate}T00:00:00.000Z`);
  if (endMs < startMs) throw new Error("invalid_gsc_date_range");
  const spanDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
  if (spanDays > GSC_SEARCH_ANALYTICS_LIMITS.maxDateSpanDays) throw new Error("gsc_date_range_exceeds_bound");
  const dimensions = normalizeDimensions(input.dimensions);
  const filters = normalizeFilters(input.filters);
  const rowLimit = boundedInteger(input.rowLimit ?? 1000, 1, GSC_SEARCH_ANALYTICS_LIMITS.maxRowsPerPage, "gsc_row_limit");
  const maxPages = boundedInteger(input.maxPages ?? 1, 1, GSC_SEARCH_ANALYTICS_LIMITS.maxPagesPerJob, "gsc_max_pages");
  if (dimensions.length === 0 && maxPages !== 1) throw new Error("gsc_aggregate_query_forbids_pagination");
  const timeoutMs = boundedInteger(input.timeoutMs ?? 5000, 100, GSC_SEARCH_ANALYTICS_LIMITS.maxTimeoutMs, "gsc_timeout_ms");
  return {
    sourceFingerprint,
    requestFingerprint,
    property,
    startDate,
    endDate,
    dimensions,
    filters,
    rowLimit,
    maxPages,
    timeoutMs,
  };
}

export function buildGscSearchAnalyticsTransportRequest(
  bindingInput: GscSearchAnalyticsBinding,
  startRow = 0,
): GscSearchAnalyticsTransportRequest {
  const binding = normalizeGscSearchAnalyticsBinding(bindingInput);
  const normalizedStartRow = boundedInteger(
    startRow,
    0,
    GSC_SEARCH_ANALYTICS_LIMITS.maxModeledRowsPerJob - 1,
    "gsc_start_row",
  );
  const identity = {
    property: binding.property,
    startDate: binding.startDate,
    endDate: binding.endDate,
    dimensions: binding.dimensions,
    filters: binding.filters,
    rowLimit: binding.rowLimit,
    startRow: normalizedStartRow,
    timeoutMs: binding.timeoutMs,
    sourceFingerprint: binding.sourceFingerprint,
    requestFingerprint: binding.requestFingerprint,
  };
  return {
    version: GSC_SEARCH_ANALYTICS_RUNNER_VERSION,
    pageFingerprint: hash({ version: GSC_SEARCH_ANALYTICS_RUNNER_VERSION, ...identity }),
    property: binding.property,
    startDate: binding.startDate,
    endDate: binding.endDate,
    dimensions: binding.dimensions,
    filters: binding.filters,
    rowLimit: binding.rowLimit,
    startRow: normalizedStartRow,
    timeoutMs: binding.timeoutMs,
  };
}

function validateSourceAndLineage(input: {
  packet: SignalCollectionJobPacket;
  source: SignalSourceDescriptor;
  request: SourceAdapterRequest;
  binding: NormalizedBinding;
}): void {
  const { packet, source, request, binding } = input;
  if (source.key !== GSC_SEARCH_ANALYTICS_SOURCE_KEY) throw new Error("gsc_source_key_mismatch");
  if (source.sourceClass !== "first_party") throw new Error("gsc_source_must_be_first_party");
  if (source.trustClass !== "first_party_authoritative") throw new Error("gsc_source_trust_mismatch");
  if (source.collectionMode !== "provider_api") throw new Error("gsc_collection_mode_mismatch");
  if (!source.provenanceComplete || !source.manuallyReviewed) throw new Error("gsc_source_review_required");
  if (request.signalType !== "keyword" || !source.signalTypes.includes("keyword")) throw new Error("gsc_signal_type_not_supported");
  if (binding.sourceFingerprint !== source.fingerprint) throw new Error("gsc_binding_source_mismatch");
  if (binding.requestFingerprint !== request.requestFingerprint) throw new Error("gsc_binding_request_mismatch");
  if (packet.sourceId !== source.sourceId || request.sourceId !== source.sourceId) throw new Error("gsc_source_id_lineage_mismatch");
  if (packet.sourceFingerprint !== source.fingerprint || request.sourceFingerprint !== source.fingerprint) throw new Error("gsc_source_fingerprint_lineage_mismatch");
  if (packet.requestId !== request.requestId || packet.requestFingerprint !== request.requestFingerprint) throw new Error("gsc_request_lineage_mismatch");
  if (packet.marketFingerprint !== request.marketFingerprint) throw new Error("gsc_market_lineage_mismatch");
  if (packet.categoryFingerprint !== request.categoryFingerprint) throw new Error("gsc_category_lineage_mismatch");
  if (packet.signalType !== request.signalType) throw new Error("gsc_signal_lineage_mismatch");
}

function normalizeModeledRows(value: unknown, dimensions: GscDimension[], rowLimit: number): GscSearchAnalyticsModeledRow[] {
  const response = plainObject(value, "gsc_response");
  onlyKeys(response, RESPONSE_KEYS, "gsc_response");
  if (response.rows === undefined) return [];
  if (!Array.isArray(response.rows) || response.rows.length > rowLimit) throw new Error("invalid_gsc_rows");
  if (dimensions.length === 0 && response.rows.length > 1) throw new Error("invalid_gsc_aggregate_row_count");
  return response.rows.map((item) => {
    const row = plainObject(item, "gsc_row");
    onlyKeys(row, ROW_KEYS, "gsc_row");
    let keys: string[] | undefined;
    if (dimensions.length > 0) {
      if (!Array.isArray(row.keys) || row.keys.length !== dimensions.length) throw new Error("invalid_gsc_row_keys");
      keys = row.keys.map((key) => {
        if (typeof key !== "string") throw new Error("invalid_gsc_row_key");
        const normalized = key.normalize("NFKC").trim();
        if (!normalized || normalized.length > 512 || /[\u0000-\u001f\u007f]/.test(normalized)) throw new Error("invalid_gsc_row_key");
        return normalized;
      });
    } else if (row.keys !== undefined && (!Array.isArray(row.keys) || row.keys.length !== 0)) {
      throw new Error("gsc_aggregate_row_forbids_keys");
    }
    const clicks = boundedNumber(row.clicks, 0, 1_000_000_000_000_000, "gsc_clicks");
    const impressions = boundedNumber(row.impressions, 0, 1_000_000_000_000_000, "gsc_impressions");
    if (clicks > impressions) throw new Error("gsc_clicks_exceed_impressions");
    const ctr = boundedNumber(row.ctr, 0, 1, "gsc_ctr");
    const position = boundedNumber(row.position, 0, 10_000, "gsc_position");
    return { keys, clicks, impressions, ctr, position };
  });
}

function aggregateRows(rows: GscSearchAnalyticsModeledRow[]) {
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const ctr = impressions === 0 ? 0 : clicks / impressions;
  const weightedPositionNumerator = rows.reduce((sum, row) => sum + row.position * row.impressions, 0);
  const position = impressions === 0
    ? rows.reduce((sum, row) => sum + row.position, 0) / Math.max(1, rows.length)
    : weightedPositionNumerator / impressions;
  return {
    clicks: Number(clicks.toFixed(6)),
    impressions: Number(impressions.toFixed(6)),
    ctr: Number(ctr.toFixed(8)),
    position: Number(position.toFixed(6)),
  };
}

function adapterResultBase(input: {
  request: SourceAdapterRequest;
  source: SignalSourceDescriptor;
  observedAt: string;
}) {
  return {
    requestFingerprint: input.request.requestFingerprint,
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    sourceClass: input.source.sourceClass,
    marketFingerprint: input.request.marketFingerprint,
    categoryFingerprint: input.request.categoryFingerprint,
    signalType: input.request.signalType,
    observedAt: input.observedAt,
  };
}

function errorCode(error: unknown): string {
  if (error instanceof GscSearchAnalyticsTransportError) return `gsc_${error.code}`;
  return "gsc_invalid_modeled_response";
}

export function gscSearchAnalyticsRunnerReadiness(
  options: GscSearchAnalyticsRunnerOptions = {},
): GscSearchAnalyticsReadiness {
  let bindingReady = false;
  if (options.binding) {
    try {
      normalizeGscSearchAnalyticsBinding(options.binding);
      bindingReady = true;
    } catch {
      bindingReady = false;
    }
  }
  const configured = bindingReady && Boolean(options.transport?.query);
  return Object.freeze({
    version: GSC_SEARCH_ANALYTICS_RUNNER_VERSION,
    runnerSupported: true,
    configured,
    credentialReady: configured && options.credentialReady === true,
    networkReady: configured && options.networkReady === true,
    readOnlyScope: GSC_SEARCH_ANALYTICS_READONLY_SCOPE,
    liveExecutionAuthorized: configured && options.liveExecutionAuthorized === true,
    sourceReadOnly: true,
    providerWrites: false,
    publicSiteWrites: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    schedulerEnabled: false,
    batchExecutorEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
  });
}

function task70Capability(readiness: GscSearchAnalyticsReadiness): SignalCollectionRunnerCapability {
  const executable = readiness.configured
    && readiness.credentialReady
    && readiness.networkReady
    && readiness.liveExecutionAuthorized;
  return {
    configured: executable,
    credentialReady: executable,
    networkReady: executable,
    sourceReadOnly: true,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

export function createGscSearchAnalyticsRunner(
  options: GscSearchAnalyticsRunnerOptions = {},
): SignalCollectionSourceRunner {
  const readiness = gscSearchAnalyticsRunnerReadiness(options);
  return {
    capability({ source, request }) {
      if (!options.binding) return task70Capability(readiness);
      try {
        const binding = normalizeGscSearchAnalyticsBinding(options.binding);
        if (source.key !== GSC_SEARCH_ANALYTICS_SOURCE_KEY
          || source.sourceClass !== "first_party"
          || source.trustClass !== "first_party_authoritative"
          || source.collectionMode !== "provider_api"
          || !source.provenanceComplete
          || !source.manuallyReviewed
          || request.signalType !== "keyword"
          || !source.signalTypes.includes("keyword")
          || binding.sourceFingerprint !== source.fingerprint
          || binding.requestFingerprint !== request.requestFingerprint) {
          return task70Capability({ ...readiness, liveExecutionAuthorized: false });
        }
      } catch {
        return task70Capability({ ...readiness, liveExecutionAuthorized: false });
      }
      return task70Capability(readiness);
    },
    async run({ packet, source, request, observedAt }) {
      if (!options.binding || !options.transport) throw new Error("gsc_runner_unconfigured");
      const binding = normalizeGscSearchAnalyticsBinding(options.binding);
      validateSourceAndLineage({ packet, source, request, binding });
      const runReadiness = gscSearchAnalyticsRunnerReadiness(options);
      if (!runReadiness.configured
        || !runReadiness.credentialReady
        || !runReadiness.networkReady
        || !runReadiness.liveExecutionAuthorized) {
        throw new Error("gsc_runner_not_authorized");
      }
      const observedDate = observedAt.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(observedDate) || binding.endDate > observedDate) throw new Error("gsc_end_date_after_observed_at");

      const rows: GscSearchAnalyticsModeledRow[] = [];
      let pageCapReached = false;
      for (let pageIndex = 0; pageIndex < binding.maxPages; pageIndex += 1) {
        const startRow = pageIndex * binding.rowLimit;
        const transportRequest = buildGscSearchAnalyticsTransportRequest(binding, startRow);
        let pageRows: GscSearchAnalyticsModeledRow[];
        try {
          const response = await options.transport.query(transportRequest);
          pageRows = normalizeModeledRows(response, binding.dimensions, binding.rowLimit);
        } catch (error) {
          return {
            ...adapterResultBase({ request, source, observedAt }),
            status: "error",
            metrics: [],
            diagnostics: [],
            errorCode: errorCode(error),
            completeness: 0,
          };
        }
        rows.push(...pageRows);
        if (rows.length > GSC_SEARCH_ANALYTICS_LIMITS.maxModeledRowsPerJob) throw new Error("gsc_modeled_row_budget_exceeded");
        if (pageRows.length < binding.rowLimit) break;
        if (pageIndex === binding.maxPages - 1) pageCapReached = true;
      }

      const base = adapterResultBase({ request, source, observedAt });
      if (rows.length === 0) {
        return {
          ...base,
          status: "empty",
          metrics: [],
          diagnostics: [],
          errorCode: null,
          completeness: 1,
        };
      }

      const aggregate = aggregateRows(rows);
      const metrics = [
        { key: "clicks", value: aggregate.clicks, unit: "count" },
        { key: "impressions", value: aggregate.impressions, unit: "count" },
        { key: "ctr", value: aggregate.ctr, unit: "ratio" },
        { key: "position", value: aggregate.position, unit: "position" },
      ];
      const diagnostics = new Set<string>();
      if (binding.dimensions.length > 0) diagnostics.add("gsc_top_rows_non_exhaustive");
      if (pageCapReached) diagnostics.add("gsc_page_cap_reached");
      if (diagnostics.size > 0) {
        return {
          ...base,
          status: "partial",
          metrics,
          diagnostics: [...diagnostics].sort(),
          errorCode: null,
          completeness: pageCapReached ? 0.75 : 0.9,
        };
      }
      return {
        ...base,
        status: "success",
        metrics,
        diagnostics: [],
        errorCode: null,
        completeness: 1,
      };
    },
  };
}
