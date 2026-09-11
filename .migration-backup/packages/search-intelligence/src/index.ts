import { createHash } from "node:crypto";

export type SearchEngine = "google" | "bing" | "schema_org" | "ai_engine";
export type IntelligenceTier = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type PolicyDisposition = "production_rule" | "strong_rule" | "strong_hypothesis" | "hypothesis" | "experimental" | "research_only" | "ignore_for_automation";
export type PolicyCategory =
  | "core_update"
  | "ranking_update"
  | "spam_policy"
  | "structured_data"
  | "crawling_indexing"
  | "search_feature"
  | "regional_policy"
  | "ai_visibility"
  | "other";

export type PolicySourceKind =
  | "official_documentation"
  | "official_policy"
  | "official_status"
  | "official_blog"
  | "official_plus_observed"
  | "controlled_experiment"
  | "multi_site_observation"
  | "academic_research"
  | "industry_correlation"
  | "community_rumor";

export interface RawPolicyChange {
  engine: SearchEngine;
  sourceKind: PolicySourceKind;
  sourceUrl: string;
  title: string;
  summary: string;
  publishedAt: string;
  category: PolicyCategory;
  confirmed?: boolean;
  affectedAreas?: string[];
  externalRef?: string | null;
}

export interface PolicyChange {
  engine: SearchEngine;
  sourceKind: PolicySourceKind;
  sourceUrl: string;
  title: string;
  summary: string;
  publishedAt: string;
  category: PolicyCategory;
  confirmed: boolean;
  affectedAreas: string[];
  externalRef: string | null;
  tier: IntelligenceTier;
  disposition: PolicyDisposition;
  confidence: number;
  fingerprint: string;
}

export interface PolicyPack {
  engine: SearchEngine;
  version: string;
  createdAt: string;
  changes: PolicyChange[];
  fingerprint: string;
}

export interface SitePolicyProfile {
  siteId: string;
  engine?: SearchEngine;
  features?: string[];
}

export interface PolicyImpactSignal {
  siteId: string;
  policyFingerprint: string;
  engine: SearchEngine;
  category: PolicyCategory;
  relevance: number;
  confidence: number;
  disposition: PolicyDisposition;
  matchedAreas: string[];
  requiresReview: boolean;
  dedupeKey: string;
}

export interface AlgorithmUpdateMode {
  active: boolean;
  freezeHighRiskChanges: boolean;
  preserveBaselines: boolean;
  increaseMeasurement: boolean;
  activeChangeFingerprints: string[];
  reason: string | null;
}

const tierBySource: Record<PolicySourceKind, IntelligenceTier> = {
  official_documentation: "A",
  official_policy: "A",
  official_status: "A",
  official_blog: "A",
  official_plus_observed: "B",
  controlled_experiment: "C",
  multi_site_observation: "D",
  academic_research: "E",
  industry_correlation: "F",
  community_rumor: "G",
};

const dispositionByTier: Record<IntelligenceTier, PolicyDisposition> = {
  A: "production_rule",
  B: "strong_rule",
  C: "strong_hypothesis",
  D: "hypothesis",
  E: "experimental",
  F: "research_only",
  G: "ignore_for_automation",
};

const confidenceByTier: Record<IntelligenceTier, number> = {
  A: 1,
  B: 0.9,
  C: 0.82,
  D: 0.7,
  E: 0.62,
  F: 0.45,
  G: 0.15,
};

function stableStringArray(values: string[] = []): string[] {
  return [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))].sort();
}

function normalizeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid publishedAt: ${value}`);
  return date.toISOString();
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function classifySource(sourceKind: PolicySourceKind) {
  const tier = tierBySource[sourceKind];
  return {
    tier,
    disposition: dispositionByTier[tier],
    confidence: confidenceByTier[tier],
  };
}

export function normalizePolicyChange(input: RawPolicyChange): PolicyChange {
  if (!input.title.trim()) throw new Error("Policy change title is required");
  if (!input.summary.trim()) throw new Error("Policy change summary is required");
  const sourceUrl = normalizeUrl(input.sourceUrl);
  const publishedAt = normalizeDate(input.publishedAt);
  const affectedAreas = stableStringArray(input.affectedAreas);
  const classification = classifySource(input.sourceKind);
  const externalRef = input.externalRef?.trim() || null;
  const material = JSON.stringify({
    engine: input.engine,
    sourceKind: input.sourceKind,
    sourceUrl,
    title: input.title.trim(),
    publishedAt,
    category: input.category,
    externalRef,
  });
  return {
    engine: input.engine,
    sourceKind: input.sourceKind,
    sourceUrl,
    title: input.title.trim(),
    summary: input.summary.trim(),
    publishedAt,
    category: input.category,
    confirmed: input.confirmed ?? classification.tier === "A",
    affectedAreas,
    externalRef,
    ...classification,
    fingerprint: sha(material),
  };
}

export function normalizePolicyChanges(inputs: RawPolicyChange[]): PolicyChange[] {
  const seen = new Set<string>();
  return inputs
    .map(normalizePolicyChange)
    .filter((change) => {
      if (seen.has(change.fingerprint)) return false;
      seen.add(change.fingerprint);
      return true;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.fingerprint.localeCompare(b.fingerprint));
}

export function buildPolicyPack(engine: SearchEngine, version: string, changes: PolicyChange[], createdAt = new Date().toISOString()): PolicyPack {
  if (!version.trim()) throw new Error("Policy pack version is required");
  const normalizedCreatedAt = normalizeDate(createdAt);
  const filtered = changes.filter((c) => c.engine === engine);
  const deduped = [...new Map(filtered.map((c) => [c.fingerprint, c])).values()]
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.fingerprint.localeCompare(b.fingerprint));
  const fingerprint = sha(JSON.stringify({ engine, version: version.trim(), changes: deduped.map((c) => c.fingerprint) }));
  return { engine, version: version.trim(), createdAt: normalizedCreatedAt, changes: deduped, fingerprint };
}

export function evaluatePolicyImpact(pack: PolicyPack, site: SitePolicyProfile): PolicyImpactSignal[] {
  const features = new Set(stableStringArray(site.features));
  const output: PolicyImpactSignal[] = [];
  for (const change of pack.changes) {
    if (site.engine && site.engine !== change.engine) continue;
    const matchedAreas = change.affectedAreas.filter((area) => features.has(area));
    const relevance = change.affectedAreas.length === 0
      ? 0.6
      : matchedAreas.length === 0
        ? 0.2
        : Math.min(1, 0.5 + (matchedAreas.length / change.affectedAreas.length) * 0.5);
    if (relevance < 0.25) continue;
    const requiresReview = change.tier !== "A" || change.category === "core_update" || change.category === "ranking_update";
    const dedupeKey = sha(`${site.siteId}|${pack.fingerprint}|${change.fingerprint}`);
    output.push({
      siteId: site.siteId,
      policyFingerprint: change.fingerprint,
      engine: change.engine,
      category: change.category,
      relevance: Math.round(relevance * 1000) / 1000,
      confidence: change.confidence,
      disposition: change.disposition,
      matchedAreas,
      requiresReview,
      dedupeKey,
    });
  }
  return output.sort((a, b) => b.relevance - a.relevance || b.confidence - a.confidence || a.dedupeKey.localeCompare(b.dedupeKey));
}

export function deriveAlgorithmUpdateMode(changes: PolicyChange[]): AlgorithmUpdateMode {
  const active = changes
    .filter((c) => c.confirmed && c.tier === "A" && (c.category === "core_update" || c.category === "ranking_update"))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (active.length === 0) {
    return {
      active: false,
      freezeHighRiskChanges: false,
      preserveBaselines: false,
      increaseMeasurement: false,
      activeChangeFingerprints: [],
      reason: null,
    };
  }
  return {
    active: true,
    freezeHighRiskChanges: true,
    preserveBaselines: true,
    increaseMeasurement: true,
    activeChangeFingerprints: active.map((c) => c.fingerprint),
    reason: `Confirmed official ${active[0]!.engine} ${active[0]!.category.replaceAll("_", " ")} signal is active.`,
  };
}

export function toPolicyChangeInsert(change: PolicyChange, policySourceId: string, policyVersionId: string | null = null) {
  return {
    policySourceId,
    policyVersionId,
    externalRef: change.externalRef,
    category: change.category,
    title: change.title,
    summary: change.summary,
    effectiveAt: change.publishedAt,
    payload: {
      engine: change.engine,
      sourceKind: change.sourceKind,
      sourceUrl: change.sourceUrl,
      confirmed: change.confirmed,
      affectedAreas: change.affectedAreas,
      tier: change.tier,
      disposition: change.disposition,
      confidence: change.confidence,
      fingerprint: change.fingerprint,
    },
  };
}
