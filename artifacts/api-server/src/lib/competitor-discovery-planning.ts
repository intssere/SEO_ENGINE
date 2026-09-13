import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { CompetitorCollectionTarget } from "./competitor-acquisition.js";

export const COMPETITOR_DISCOVERY_PLANNING_VERSION = "task60-competitor-discovery-planning-v1" as const;

export const DEFAULT_COMPETITOR_PLAN_BUDGET = Object.freeze({
  maxCompetitors: 5,
  maxUrlsPerCompetitor: 3,
  maxTotalTargets: 10,
});

const HARD_MAX_COMPETITORS = 20;
const HARD_MAX_URLS_PER_COMPETITOR = 10;
const HARD_MAX_TOTAL_TARGETS = 50;
const MAX_SIGNAL_VALUES = 30;
const MAX_PROVENANCE_KEYS = 20;
const SPECIAL_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home", ".lan", ".test", ".invalid", ".example"];

type Scalar = string | number | boolean | null;

export type CompetitorCandidateInput = {
  domain?: string | null;
  url?: string | null;
  source: string;
  reason?: string | null;
  confidence?: number | null;
  categories?: string[];
  pageTypes?: string[];
  keywordThemes?: string[];
  taxonomyLabels?: string[];
  entityTypes?: string[];
  discoveredAt?: string | null;
  provenance?: Record<string, unknown>;
};

export type NormalizedCompetitorCandidate = {
  identityKey: string;
  fingerprint: string;
  domain: string;
  url: string;
  source: string;
  sources: string[];
  reason: string | null;
  confidence: number;
  categories: string[];
  pageTypes: string[];
  keywordThemes: string[];
  taxonomyLabels: string[];
  entityTypes: string[];
  discoveredAt: string | null;
  freshnessDays: number | null;
  provenance: Record<string, Scalar>;
  duplicateCount: number;
};

export type CandidateRejectionReason =
  | "invalid_candidate"
  | "invalid_source"
  | "invalid_url"
  | "credential_bearing_url"
  | "unsupported_scheme"
  | "unsupported_port"
  | "invalid_domain"
  | "domain_url_mismatch"
  | "own_domain"
  | "ip_literal_not_supported"
  | "special_use_host"
  | "invalid_confidence"
  | "invalid_discovered_at";

export type RejectedCompetitorCandidate = {
  index: number;
  reason: CandidateRejectionReason;
};

export type CompetitorCandidateScore = {
  total: number;
  components: {
    confidence: number;
    relevance: number;
    freshness: number;
    coverage: number;
    duplicatePenalty: number;
  };
};

export type RankedCompetitorCandidate = NormalizedCompetitorCandidate & {
  score: CompetitorCandidateScore;
};

export type CompetitorPlanBudget = {
  maxCompetitors: number;
  maxUrlsPerCompetitor: number;
  maxTotalTargets: number;
};

export type CompetitorCollectionPlan = {
  version: typeof COMPETITOR_DISCOVERY_PLANNING_VERSION;
  generatedAt: string;
  ownDomain: string;
  budget: CompetitorPlanBudget;
  candidates: RankedCompetitorCandidate[];
  rejected: RejectedCompetitorCandidate[];
  selected: Array<{
    rank: number;
    candidateFingerprint: string;
    domain: string;
    score: CompetitorCandidateScore;
    target: CompetitorCollectionTarget;
  }>;
  diagnostics: {
    inputCount: number;
    normalizedCount: number;
    uniqueCount: number;
    rejectedCount: number;
    duplicateCount: number;
    selectedCompetitors: number;
    selectedTargets: number;
    unselectedCandidates: number;
  };
  safety: {
    advisoryOnly: true;
    networkCollectionAuthorized: false;
    evidencePersistenceAuthorized: false;
    targetConfigurationMutationAuthorized: false;
    schedulerEnabled: false;
    autonomousWorkerEnabled: false;
    publicSiteWrites: false;
    executionAuthorized: false;
  };
};

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function stringList(value: unknown, maxValues = MAX_SIGNAL_VALUES): string[] {
  if (!Array.isArray(value)) return [];
  const values = new Set<string>();
  for (const item of value) {
    const normalized = text(item, 120);
    if (!normalized) continue;
    values.add(normalized);
    if (values.size >= maxValues) break;
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

function scalarProvenance(value: unknown): Record<string, Scalar> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, Scalar> = {};
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => /^[a-zA-Z0-9._-]{1,64}$/.test(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, MAX_PROVENANCE_KEYS);
  for (const [key, raw] of entries) {
    if (raw === null || typeof raw === "number" || typeof raw === "boolean") {
      result[key] = raw as Scalar;
      continue;
    }
    const normalized = text(raw, 240);
    if (normalized) result[key] = normalized;
  }
  return result;
}

function normalizedDomain(value: string): string | null {
  const candidate = value.trim().toLowerCase().replace(/\.$/, "");
  if (!candidate || candidate.includes("/") || candidate.includes("@") || candidate.includes(":")) return null;
  try {
    const parsed = new URL(`https://${candidate}`);
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
    if (!hostname || !hostname.includes(".")) return null;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isOwnedDomain(candidate: string, ownDomain: string): boolean {
  return candidate === ownDomain || candidate.endsWith(`.${ownDomain}`);
}

function isSpecialHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost") return true;
  return SPECIAL_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function canonicalCandidateUrl(value: string): { url: URL; domain: string } | CandidateRejectionReason {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "invalid_url";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "unsupported_scheme";
  if (parsed.username || parsed.password) return "credential_bearing_url";
  if (parsed.port) return "unsupported_port";
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || !hostname.includes(".")) return "invalid_domain";
  if (isIP(hostname)) return "ip_literal_not_supported";
  if (isSpecialHost(hostname)) return "special_use_host";
  parsed.hostname = hostname;
  parsed.search = "";
  parsed.hash = "";
  if (!parsed.pathname) parsed.pathname = "/";
  const domain = hostname.replace(/^www\./, "");
  return { url: parsed, domain };
}

function parseTimestamp(value: string | null | undefined, nowMs: number): { iso: string | null; freshnessDays: number | null } | null {
  if (value == null || value === "") return { iso: null, freshnessDays: null };
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || ms > nowMs + 5 * 60_000) return null;
  return {
    iso: new Date(ms).toISOString(),
    freshnessDays: Math.max(0, Math.floor((nowMs - ms) / 86_400_000)),
  };
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function identityFor(url: URL, domain: string): string {
  const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "") || "/";
  return pathname === "/" ? `domain:${domain}` : `url:${domain}${pathname}`;
}

function canonicalTargetUrl(url: URL): string {
  const clone = new URL(url.toString());
  clone.search = "";
  clone.hash = "";
  return clone.toString();
}

export function normalizeCompetitorCandidate(
  input: CompetitorCandidateInput,
  ownDomainInput: string,
  now = new Date().toISOString(),
): { ok: true; candidate: NormalizedCompetitorCandidate } | { ok: false; reason: CandidateRejectionReason } {
  if (!input || typeof input !== "object") return { ok: false, reason: "invalid_candidate" };
  const ownDomain = normalizedDomain(ownDomainInput);
  if (!ownDomain) return { ok: false, reason: "invalid_domain" };
  const source = text(input.source, 80);
  if (!source) return { ok: false, reason: "invalid_source" };
  const reason = input.reason == null ? null : text(input.reason, 240);
  const confidence = input.confidence == null ? 0.5 : Number(input.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return { ok: false, reason: "invalid_confidence" };

  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) return { ok: false, reason: "invalid_discovered_at" };
  const timestamp = parseTimestamp(input.discoveredAt, nowMs);
  if (!timestamp) return { ok: false, reason: "invalid_discovered_at" };

  let parsedUrl: URL;
  let domain: string;
  if (input.url) {
    const parsed = canonicalCandidateUrl(input.url);
    if (typeof parsed === "string") return { ok: false, reason: parsed };
    parsedUrl = parsed.url;
    domain = parsed.domain;
  } else if (input.domain) {
    const normalized = normalizedDomain(input.domain);
    if (!normalized) return { ok: false, reason: "invalid_domain" };
    if (isIP(normalized)) return { ok: false, reason: "ip_literal_not_supported" };
    if (isSpecialHost(normalized)) return { ok: false, reason: "special_use_host" };
    domain = normalized;
    parsedUrl = new URL(`https://${domain}/`);
  } else {
    return { ok: false, reason: "invalid_domain" };
  }

  if (input.domain) {
    const declaredDomain = normalizedDomain(input.domain);
    if (!declaredDomain) return { ok: false, reason: "invalid_domain" };
    if (declaredDomain !== domain) return { ok: false, reason: "domain_url_mismatch" };
  }
  if (isOwnedDomain(domain, ownDomain)) return { ok: false, reason: "own_domain" };
  if (isSpecialHost(domain)) return { ok: false, reason: "special_use_host" };

  const categories = stringList(input.categories);
  const pageTypes = stringList(input.pageTypes);
  const keywordThemes = stringList(input.keywordThemes);
  const taxonomyLabels = stringList(input.taxonomyLabels);
  const entityTypes = stringList(input.entityTypes);
  const provenance = scalarProvenance(input.provenance);
  const url = canonicalTargetUrl(parsedUrl);
  const identityKey = identityFor(parsedUrl, domain);
  const fingerprint = stableHash({
    version: COMPETITOR_DISCOVERY_PLANNING_VERSION,
    identityKey,
    domain,
    url,
    source: source.toLowerCase(),
    categories: categories.map((item) => item.toLowerCase()),
    pageTypes: pageTypes.map((item) => item.toLowerCase()),
    keywordThemes: keywordThemes.map((item) => item.toLowerCase()),
    taxonomyLabels: taxonomyLabels.map((item) => item.toLowerCase()),
    entityTypes: entityTypes.map((item) => item.toLowerCase()),
  });

  return {
    ok: true,
    candidate: {
      identityKey,
      fingerprint,
      domain,
      url,
      source,
      sources: [source],
      reason,
      confidence,
      categories,
      pageTypes,
      keywordThemes,
      taxonomyLabels,
      entityTypes,
      discoveredAt: timestamp.iso,
      freshnessDays: timestamp.freshnessDays,
      provenance,
      duplicateCount: 1,
    },
  };
}

function mergeUnique(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])].sort((a, b) => a.localeCompare(b)).slice(0, MAX_SIGNAL_VALUES);
}

function preferredCandidate(left: NormalizedCompetitorCandidate, right: NormalizedCompetitorCandidate): NormalizedCompetitorCandidate {
  if (right.confidence !== left.confidence) return right.confidence > left.confidence ? right : left;
  const leftSignals = left.categories.length + left.pageTypes.length + left.keywordThemes.length + left.taxonomyLabels.length + left.entityTypes.length;
  const rightSignals = right.categories.length + right.pageTypes.length + right.keywordThemes.length + right.taxonomyLabels.length + right.entityTypes.length;
  if (rightSignals !== leftSignals) return rightSignals > leftSignals ? right : left;
  if ((right.freshnessDays ?? Number.POSITIVE_INFINITY) !== (left.freshnessDays ?? Number.POSITIVE_INFINITY)) {
    return (right.freshnessDays ?? Number.POSITIVE_INFINITY) < (left.freshnessDays ?? Number.POSITIVE_INFINITY) ? right : left;
  }
  return right.fingerprint.localeCompare(left.fingerprint) < 0 ? right : left;
}

export function dedupeCompetitorCandidates(candidates: NormalizedCompetitorCandidate[]): NormalizedCompetitorCandidate[] {
  const groups = new Map<string, NormalizedCompetitorCandidate[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.identityKey) ?? [];
    group.push(candidate);
    groups.set(candidate.identityKey, group);
  }

  const deduped: NormalizedCompetitorCandidate[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
    let preferred = sorted[0]!;
    for (const candidate of sorted.slice(1)) preferred = preferredCandidate(preferred, candidate);
    const merged = sorted.reduce((acc, candidate) => ({
      ...acc,
      sources: mergeUnique(acc.sources, candidate.sources),
      categories: mergeUnique(acc.categories, candidate.categories),
      pageTypes: mergeUnique(acc.pageTypes, candidate.pageTypes),
      keywordThemes: mergeUnique(acc.keywordThemes, candidate.keywordThemes),
      taxonomyLabels: mergeUnique(acc.taxonomyLabels, candidate.taxonomyLabels),
      entityTypes: mergeUnique(acc.entityTypes, candidate.entityTypes),
      confidence: Math.max(acc.confidence, candidate.confidence),
      duplicateCount: acc.duplicateCount + (candidate === sorted[0] ? 0 : 1),
    }), { ...preferred, duplicateCount: 1 });
    deduped.push(merged);
  }
  return deduped.sort((a, b) => a.identityKey.localeCompare(b.identityKey));
}

export function scoreCompetitorCandidate(candidate: NormalizedCompetitorCandidate): CompetitorCandidateScore {
  const confidence = Math.round(candidate.confidence * 40_000) / 1000;
  const relevanceSignals = candidate.categories.length * 8 + candidate.pageTypes.length * 6 + candidate.keywordThemes.length * 2;
  const relevance = Math.min(30, relevanceSignals);
  const freshness = candidate.freshnessDays == null
    ? 10
    : candidate.freshnessDays <= 7
      ? 20
      : candidate.freshnessDays <= 30
        ? 15
        : candidate.freshnessDays <= 90
          ? 10
          : candidate.freshnessDays <= 365
            ? 5
            : 0;
  const coverage = Math.min(10, candidate.taxonomyLabels.length * 2 + candidate.entityTypes.length * 2 + Math.min(4, candidate.sources.length));
  const duplicatePenalty = Math.min(10, Math.max(0, candidate.duplicateCount - 1) * 2);
  const total = Math.max(0, Math.min(100, confidence + relevance + freshness + coverage - duplicatePenalty));
  return {
    total: Math.round(total * 1000) / 1000,
    components: { confidence, relevance, freshness, coverage, duplicatePenalty },
  };
}

export function rankCompetitorCandidates(candidates: NormalizedCompetitorCandidate[]): RankedCompetitorCandidate[] {
  return candidates
    .map((candidate) => ({ ...candidate, score: scoreCompetitorCandidate(candidate) }))
    .sort((a, b) => b.score.total - a.score.total || a.domain.localeCompare(b.domain) || a.identityKey.localeCompare(b.identityKey) || a.fingerprint.localeCompare(b.fingerprint));
}

function clampBudget(value: number | undefined, fallback: number, maximum: number): number {
  return Number.isInteger(value) && (value as number) > 0 ? Math.min(value as number, maximum) : fallback;
}

export function normalizeCompetitorPlanBudget(input: Partial<CompetitorPlanBudget> = {}): CompetitorPlanBudget {
  const maxCompetitors = clampBudget(input.maxCompetitors, DEFAULT_COMPETITOR_PLAN_BUDGET.maxCompetitors, HARD_MAX_COMPETITORS);
  const maxUrlsPerCompetitor = clampBudget(input.maxUrlsPerCompetitor, DEFAULT_COMPETITOR_PLAN_BUDGET.maxUrlsPerCompetitor, HARD_MAX_URLS_PER_COMPETITOR);
  const maxTotalTargets = clampBudget(input.maxTotalTargets, DEFAULT_COMPETITOR_PLAN_BUDGET.maxTotalTargets, HARD_MAX_TOTAL_TARGETS);
  return { maxCompetitors, maxUrlsPerCompetitor, maxTotalTargets };
}

function targetId(candidate: RankedCompetitorCandidate): string {
  return `plan-${candidate.fingerprint.slice(0, 16)}`;
}

function candidateToTarget(candidate: RankedCompetitorCandidate): CompetitorCollectionTarget {
  const url = new URL(candidate.url);
  return {
    id: targetId(candidate),
    url: candidate.url,
    source: candidate.source,
    allowedPathPrefix: url.pathname || "/",
    confidence: candidate.confidence,
    pageType: candidate.pageTypes[0] ?? null,
    keywordThemes: candidate.keywordThemes,
    taxonomyLabels: candidate.taxonomyLabels,
    entityTypes: candidate.entityTypes,
    internalLinkPatterns: [],
  };
}

function selectDiverseCandidates(ranked: RankedCompetitorCandidate[], budget: CompetitorPlanBudget): RankedCompetitorCandidate[] {
  const grouped = new Map<string, RankedCompetitorCandidate[]>();
  for (const candidate of ranked) {
    const group = grouped.get(candidate.domain) ?? [];
    group.push(candidate);
    grouped.set(candidate.domain, group);
  }
  const domains = [...grouped.entries()]
    .sort((a, b) => (b[1][0]?.score.total ?? 0) - (a[1][0]?.score.total ?? 0) || a[0].localeCompare(b[0]))
    .slice(0, budget.maxCompetitors);

  const selected: RankedCompetitorCandidate[] = [];
  for (let depth = 0; depth < budget.maxUrlsPerCompetitor && selected.length < budget.maxTotalTargets; depth += 1) {
    for (const [, candidates] of domains) {
      const candidate = candidates[depth];
      if (!candidate) continue;
      selected.push(candidate);
      if (selected.length >= budget.maxTotalTargets) break;
    }
  }
  return selected;
}

export function competitorDiscoveryPlanningCapability() {
  return {
    version: COMPETITOR_DISCOVERY_PLANNING_VERSION,
    advisoryOnly: true,
    networkCollectionAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    publicSiteWrites: false,
    executionAuthorized: false,
    schemaMutationRequired: false,
  } as const;
}

export function planCompetitorCollection(input: {
  ownDomain: string;
  candidates: CompetitorCandidateInput[];
  now?: string;
  budget?: Partial<CompetitorPlanBudget>;
}): CompetitorCollectionPlan {
  const now = input.now ?? new Date().toISOString();
  const ownDomain = normalizedDomain(input.ownDomain);
  if (!ownDomain) throw new Error("invalid_owned_domain");
  const budget = normalizeCompetitorPlanBudget(input.budget);
  const normalized: NormalizedCompetitorCandidate[] = [];
  const rejected: RejectedCompetitorCandidate[] = [];

  input.candidates.forEach((candidate, index) => {
    const result = normalizeCompetitorCandidate(candidate, ownDomain, now);
    if (result.ok) normalized.push(result.candidate);
    else rejected.push({ index, reason: result.reason });
  });

  const unique = dedupeCompetitorCandidates(normalized);
  const ranked = rankCompetitorCandidates(unique);
  const selectedCandidates = selectDiverseCandidates(ranked, budget);
  const selected = selectedCandidates.map((candidate, index) => ({
    rank: index + 1,
    candidateFingerprint: candidate.fingerprint,
    domain: candidate.domain,
    score: candidate.score,
    target: candidateToTarget(candidate),
  }));

  return {
    version: COMPETITOR_DISCOVERY_PLANNING_VERSION,
    generatedAt: new Date(Date.parse(now)).toISOString(),
    ownDomain,
    budget,
    candidates: ranked,
    rejected,
    selected,
    diagnostics: {
      inputCount: input.candidates.length,
      normalizedCount: normalized.length,
      uniqueCount: unique.length,
      rejectedCount: rejected.length,
      duplicateCount: normalized.length - unique.length,
      selectedCompetitors: new Set(selected.map((item) => item.domain)).size,
      selectedTargets: selected.length,
      unselectedCandidates: Math.max(0, ranked.length - selected.length),
    },
    safety: {
      advisoryOnly: true,
      networkCollectionAuthorized: false,
      evidencePersistenceAuthorized: false,
      targetConfigurationMutationAuthorized: false,
      schedulerEnabled: false,
      autonomousWorkerEnabled: false,
      publicSiteWrites: false,
      executionAuthorized: false,
    },
  };
}
