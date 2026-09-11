import { createHash } from "node:crypto";

export interface AiCitationInput {
  url: string;
  title?: string | null;
}

export interface AiVisibilityObservationInput {
  siteId: string;
  provider: string;
  modelFamily: string;
  modelVersion?: string | null;
  query: string;
  location?: string | null;
  language?: string | null;
  observedAt: string;
  answer: string;
  citations?: AiCitationInput[];
  mentionedBrands?: string[];
  competitors?: string[];
  samplingMethod?: string | null;
}

export interface AiCitation {
  url: string;
  domain: string;
  title: string | null;
}

export interface AiVisibilityObservation {
  siteId: string;
  provider: string;
  modelFamily: string;
  modelVersion: string | null;
  query: string;
  location: string | null;
  language: string | null;
  observedAt: string;
  answer: string;
  citations: AiCitation[];
  mentionedBrands: string[];
  competitors: string[];
  samplingMethod: string | null;
  dedupeKey: string;
}

export interface VisibilitySummary {
  siteId: string;
  provider: string;
  modelFamily: string;
  modelVersion: string | null;
  observations: number;
  brandMentionRate: number;
  targetCitationRate: number;
  targetCitationShare: number;
  competitorMentionShare: number;
}

export type GeoSignalType = "citation_gap" | "mention_without_citation" | "competitor_visibility_gap";

export interface GeoVisibilitySignal {
  type: GeoSignalType;
  siteId: string;
  provider: string;
  modelFamily: string;
  modelVersion: string | null;
  query: string;
  score: number;
  confidence: number;
  rationale: Record<string, unknown>;
  sourceDedupeKey: string;
  dedupeKey: string;
}

export interface VisibilityEvaluationOptions {
  targetDomain: string;
  brandNames: string[];
  competitors?: string[];
}

function normalizeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("observedAt must be a valid date-time");
  return date.toISOString();
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeDomain(value: string): string {
  const candidate = value.includes("://") ? value : `https://${value}`;
  const host = new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
  if (!host) throw new Error("targetDomain must be valid");
  return host;
}

function citationFrom(input: AiCitationInput): AiCitation | null {
  try {
    const url = new URL(input.url);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    return {
      url: url.toString(),
      domain: normalizeDomain(url.hostname),
      title: input.title ? clean(input.title) : null,
    };
  } catch {
    return null;
  }
}

function uniqueStrings(values: string[] = []): string[] {
  return [...new Set(values.map(clean).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function makeObservationKey(input: Omit<AiVisibilityObservation, "dedupeKey">): string {
  const material = JSON.stringify({
    siteId: input.siteId,
    provider: input.provider,
    modelFamily: input.modelFamily,
    modelVersion: input.modelVersion,
    query: input.query,
    location: input.location,
    language: input.language,
    observedAt: input.observedAt,
    citations: input.citations.map((citation) => citation.url).sort(),
    answer: input.answer,
    samplingMethod: input.samplingMethod,
  });
  return createHash("sha256").update(material).digest("hex");
}

export function normalizeAiVisibilityObservation(input: AiVisibilityObservationInput): AiVisibilityObservation {
  if (!clean(input.siteId)) throw new Error("siteId is required");
  if (!clean(input.provider)) throw new Error("provider is required");
  if (!clean(input.modelFamily)) throw new Error("modelFamily is required");
  if (!clean(input.query)) throw new Error("query is required");

  const citationMap = new Map<string, AiCitation>();
  for (const raw of input.citations ?? []) {
    const citation = citationFrom(raw);
    if (citation) citationMap.set(citation.url, citation);
  }

  const base: Omit<AiVisibilityObservation, "dedupeKey"> = {
    siteId: clean(input.siteId),
    provider: clean(input.provider),
    modelFamily: clean(input.modelFamily),
    modelVersion: input.modelVersion ? clean(input.modelVersion) : null,
    query: clean(input.query),
    location: input.location ? clean(input.location) : null,
    language: input.language ? clean(input.language) : null,
    observedAt: normalizeDate(input.observedAt),
    answer: input.answer.trim(),
    citations: [...citationMap.values()].sort((a, b) => a.url.localeCompare(b.url)),
    mentionedBrands: uniqueStrings(input.mentionedBrands),
    competitors: uniqueStrings(input.competitors),
    samplingMethod: input.samplingMethod ? clean(input.samplingMethod) : null,
  };

  return { ...base, dedupeKey: makeObservationKey(base) };
}

export function normalizeAiVisibilityBatch(inputs: AiVisibilityObservationInput[]): AiVisibilityObservation[] {
  const seen = new Set<string>();
  const output: AiVisibilityObservation[] = [];
  for (const input of inputs) {
    const observation = normalizeAiVisibilityObservation(input);
    if (seen.has(observation.dedupeKey)) continue;
    seen.add(observation.dedupeKey);
    output.push(observation);
  }
  return output.sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.dedupeKey.localeCompare(b.dedupeKey));
}

function includesBrand(observation: AiVisibilityObservation, brands: string[]): boolean {
  const haystack = `${observation.answer} ${observation.mentionedBrands.join(" ")}`.toLocaleLowerCase();
  return brands.some((brand) => haystack.includes(brand.toLocaleLowerCase()));
}

function competitorMentionCount(observation: AiVisibilityObservation, competitors: string[]): number {
  const haystack = `${observation.answer} ${observation.competitors.join(" ")}`.toLocaleLowerCase();
  return competitors.filter((name) => haystack.includes(name.toLocaleLowerCase())).length;
}

function targetCitations(observation: AiVisibilityObservation, targetDomain: string): number {
  return observation.citations.filter((citation) => citation.domain === targetDomain || citation.domain.endsWith(`.${targetDomain}`)).length;
}

export function summarizeAiVisibility(
  observations: AiVisibilityObservation[],
  options: VisibilityEvaluationOptions,
): VisibilitySummary[] {
  const targetDomain = normalizeDomain(options.targetDomain);
  const brands = uniqueStrings(options.brandNames);
  if (brands.length === 0) throw new Error("at least one brand name is required");
  const competitors = uniqueStrings(options.competitors);
  const groups = new Map<string, AiVisibilityObservation[]>();

  for (const observation of observations) {
    const key = [observation.siteId, observation.provider, observation.modelFamily, observation.modelVersion ?? ""].join("\u0000");
    const list = groups.get(key) ?? [];
    list.push(observation);
    groups.set(key, list);
  }

  const summaries: VisibilitySummary[] = [];
  for (const group of groups.values()) {
    const first = group[0]!;
    const mentions = group.filter((item) => includesBrand(item, brands)).length;
    const cited = group.filter((item) => targetCitations(item, targetDomain) > 0).length;
    const allCitations = group.reduce((sum, item) => sum + item.citations.length, 0);
    const ownCitations = group.reduce((sum, item) => sum + targetCitations(item, targetDomain), 0);
    const ownMentions = group.reduce((sum, item) => sum + (includesBrand(item, brands) ? 1 : 0), 0);
    const competitorMentions = group.reduce((sum, item) => sum + competitorMentionCount(item, competitors), 0);
    const totalMentionUnits = ownMentions + competitorMentions;

    summaries.push({
      siteId: first.siteId,
      provider: first.provider,
      modelFamily: first.modelFamily,
      modelVersion: first.modelVersion,
      observations: group.length,
      brandMentionRate: Math.round((mentions / group.length) * 10000) / 10000,
      targetCitationRate: Math.round((cited / group.length) * 10000) / 10000,
      targetCitationShare: allCitations ? Math.round((ownCitations / allCitations) * 10000) / 10000 : 0,
      competitorMentionShare: totalMentionUnits ? Math.round((competitorMentions / totalMentionUnits) * 10000) / 10000 : 0,
    });
  }

  return summaries.sort((a, b) => a.provider.localeCompare(b.provider) || a.modelFamily.localeCompare(b.modelFamily) || (a.modelVersion ?? "").localeCompare(b.modelVersion ?? ""));
}

function signalKey(type: GeoSignalType, observation: AiVisibilityObservation): string {
  return createHash("sha256").update(`${type}|${observation.dedupeKey}`).digest("hex");
}

export function evaluateGeoVisibilitySignals(
  observations: AiVisibilityObservation[],
  options: VisibilityEvaluationOptions,
): GeoVisibilitySignal[] {
  const targetDomain = normalizeDomain(options.targetDomain);
  const brands = uniqueStrings(options.brandNames);
  const competitors = uniqueStrings(options.competitors);
  const signals: GeoVisibilitySignal[] = [];

  for (const observation of observations) {
    const brandMentioned = includesBrand(observation, brands);
    const ownCitationCount = targetCitations(observation, targetDomain);
    const competitorMentions = competitorMentionCount(observation, competitors);
    const competitorCitationCount = observation.citations.filter((citation) => competitors.some((name) => citation.domain.includes(name.toLocaleLowerCase().replace(/[^a-z0-9.-]/g, "")))).length;

    if (!brandMentioned && observation.citations.length > 0) {
      signals.push({
        type: "citation_gap",
        siteId: observation.siteId,
        provider: observation.provider,
        modelFamily: observation.modelFamily,
        modelVersion: observation.modelVersion,
        query: observation.query,
        score: Math.min(100, 40 + observation.citations.length * 8),
        confidence: 0.8,
        rationale: { targetDomain, citationCount: observation.citations.length, targetCitationCount: ownCitationCount },
        sourceDedupeKey: observation.dedupeKey,
        dedupeKey: signalKey("citation_gap", observation),
      });
    }

    if (brandMentioned && ownCitationCount === 0) {
      signals.push({
        type: "mention_without_citation",
        siteId: observation.siteId,
        provider: observation.provider,
        modelFamily: observation.modelFamily,
        modelVersion: observation.modelVersion,
        query: observation.query,
        score: 60,
        confidence: 0.9,
        rationale: { targetDomain, brandMentioned: true, targetCitationCount: 0 },
        sourceDedupeKey: observation.dedupeKey,
        dedupeKey: signalKey("mention_without_citation", observation),
      });
    }

    if ((competitorMentions > 0 || competitorCitationCount > 0) && !brandMentioned && ownCitationCount === 0) {
      signals.push({
        type: "competitor_visibility_gap",
        siteId: observation.siteId,
        provider: observation.provider,
        modelFamily: observation.modelFamily,
        modelVersion: observation.modelVersion,
        query: observation.query,
        score: Math.min(100, 65 + competitorMentions * 7 + competitorCitationCount * 5),
        confidence: 0.85,
        rationale: { competitorMentions, competitorCitationCount, targetCitationCount: 0 },
        sourceDedupeKey: observation.dedupeKey,
        dedupeKey: signalKey("competitor_visibility_gap", observation),
      });
    }
  }

  return signals.sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.dedupeKey.localeCompare(b.dedupeKey));
}

export function toAiCitationEvidence(signal: GeoVisibilitySignal) {
  return {
    siteId: signal.siteId,
    pageId: null,
    source: "ai_visibility" as const,
    kind: "ai_citation" as const,
    observedAt: new Date().toISOString(),
    confidence: signal.confidence,
    payload: {
      signalType: signal.type,
      query: signal.query,
      score: signal.score,
      ...signal.rationale,
    },
    provenance: {
      provider: signal.provider,
      providerVersion: signal.modelVersion ?? signal.modelFamily,
      externalRef: signal.sourceDedupeKey,
      rawType: "geo_visibility_signal",
    },
  };
}
