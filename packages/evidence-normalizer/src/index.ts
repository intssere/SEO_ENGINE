import { createHash } from "node:crypto";

export type EvidenceSource = "crawler" | "gsc" | "ga4" | "seo_provider" | "manual" | "policy" | "ai_visibility";
export type EvidenceKind =
  | "page_snapshot"
  | "search_performance"
  | "analytics"
  | "serp"
  | "keyword"
  | "domain"
  | "backlink"
  | "policy"
  | "ai_citation";

export interface CanonicalEvidence {
  siteId: string;
  pageId: string | null;
  source: EvidenceSource;
  kind: EvidenceKind;
  observedAt: string;
  confidence: number;
  payload: Record<string, unknown>;
  provenance: {
    provider: string;
    providerVersion?: string;
    externalRef?: string;
    fetchedAt?: string;
    rawType?: string;
  };
  dedupeKey: string;
}

export interface NormalizeInput {
  siteId: string;
  pageId?: string | null;
  source: EvidenceSource;
  kind: EvidenceKind;
  observedAt: string;
  payload: Record<string, unknown>;
  provenance: CanonicalEvidence["provenance"];
  confidence?: number;
}

const DEFAULT_CONFIDENCE: Record<EvidenceSource, number> = {
  crawler: 0.95,
  gsc: 0.98,
  ga4: 0.95,
  seo_provider: 0.8,
  manual: 0.7,
  policy: 1,
  ai_visibility: 0.75,
};

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) throw new Error("confidence must be finite");
  if (value < 0 || value > 1) throw new Error("confidence must be between 0 and 1");
  return Math.round(value * 10000) / 10000;
}

function normalizeObservedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("observedAt must be a valid date-time");
  return date.toISOString();
}

function sanitizePayload(value: Record<string, unknown>): Record<string, unknown> {
  const forbidden = new Set(["accessToken", "access_token", "authorization", "password", "secret", "apiKey", "api_key"]);
  const walk = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(walk);
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .filter(([key]) => !forbidden.has(key))
          .map(([key, child]) => [key, walk(child)]),
      );
    }
    return input;
  };
  return walk(value) as Record<string, unknown>;
}

export function makeDedupeKey(input: Omit<CanonicalEvidence, "dedupeKey">): string {
  const material = {
    siteId: input.siteId,
    pageId: input.pageId,
    source: input.source,
    kind: input.kind,
    observedAt: input.observedAt,
    provider: input.provenance.provider,
    externalRef: input.provenance.externalRef ?? null,
    payload: input.payload,
  };
  return createHash("sha256").update(stable(material)).digest("hex");
}

export function normalizeEvidence(input: NormalizeInput): CanonicalEvidence {
  if (!input.siteId.trim()) throw new Error("siteId is required");
  if (!input.provenance.provider.trim()) throw new Error("provenance.provider is required");

  const base: Omit<CanonicalEvidence, "dedupeKey"> = {
    siteId: input.siteId.trim(),
    pageId: input.pageId ?? null,
    source: input.source,
    kind: input.kind,
    observedAt: normalizeObservedAt(input.observedAt),
    confidence: normalizeConfidence(input.confidence ?? DEFAULT_CONFIDENCE[input.source]),
    payload: sanitizePayload(input.payload),
    provenance: {
      provider: input.provenance.provider.trim(),
      ...(input.provenance.providerVersion ? { providerVersion: input.provenance.providerVersion } : {}),
      ...(input.provenance.externalRef ? { externalRef: input.provenance.externalRef } : {}),
      ...(input.provenance.fetchedAt ? { fetchedAt: normalizeObservedAt(input.provenance.fetchedAt) } : {}),
      ...(input.provenance.rawType ? { rawType: input.provenance.rawType } : {}),
    },
  };

  return { ...base, dedupeKey: makeDedupeKey(base) };
}

export function normalizeBatch(inputs: NormalizeInput[]): CanonicalEvidence[] {
  const seen = new Set<string>();
  const output: CanonicalEvidence[] = [];
  for (const input of inputs) {
    const evidence = normalizeEvidence(input);
    if (seen.has(evidence.dedupeKey)) continue;
    seen.add(evidence.dedupeKey);
    output.push(evidence);
  }
  return output;
}

export function toEvidenceInsert(evidence: CanonicalEvidence) {
  return {
    siteId: evidence.siteId,
    pageId: evidence.pageId,
    source: evidence.source,
    kind: evidence.kind,
    observedAt: evidence.observedAt,
    confidence: evidence.confidence,
    payload: evidence.payload,
    provenance: { ...evidence.provenance, dedupeKey: evidence.dedupeKey },
  };
}
