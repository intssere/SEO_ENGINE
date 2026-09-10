import { createHash } from "node:crypto";

export type OpportunitySource = "technical" | "ranking";
export type OpportunityPriority = "low" | "medium" | "high" | "critical";

export interface TechnicalFindingInput {
  siteId: string;
  pageId: string | null;
  ruleId: string;
  category: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  dedupeKey: string;
}

export interface RankingOpportunityInput {
  type: "striking_distance" | "ctr_underperformance" | "ranking_decay" | "protect_winner";
  query: string;
  pageUrl: string;
  score: number;
  confidence: number;
  currentPosition: number;
  currentCtr: number;
  impressions: number;
  details: Record<string, number | string | boolean | null>;
  dedupeKey: string;
}

export interface BusinessContext {
  pageUrl?: string | null;
  pageId?: string | null;
  commercialValue?: number;
  conversionRate?: number;
  implementationCost?: number;
}

export interface UnifiedOpportunity {
  siteId: string;
  pageId: string | null;
  source: OpportunitySource;
  type: string;
  priority: OpportunityPriority;
  score: number;
  confidence: number;
  title: string;
  rationale: Record<string, unknown>;
  sourceDedupeKey: string;
  dedupeKey: string;
}

export interface OpportunityEngineInput {
  siteId: string;
  technicalFindings?: TechnicalFindingInput[];
  rankingOpportunities?: RankingOpportunityInput[];
  businessContext?: BusinessContext[];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function businessMap(rows: BusinessContext[] = []): Map<string, BusinessContext> {
  const out = new Map<string, BusinessContext>();
  for (const row of rows) {
    const key = row.pageId?.trim() || row.pageUrl?.trim();
    if (key) out.set(key, row);
  }
  return out;
}

function normalizeFactor(value: number | undefined, fallback: number, max = 2): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(max, value));
}

function priority(score: number, source: OpportunitySource, type: string): OpportunityPriority {
  if (source === "technical" && /http_5xx|noindex_conflict/.test(type)) return "critical";
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function makeKey(siteId: string, source: OpportunitySource, type: string, sourceDedupeKey: string): string {
  return createHash("sha256").update(`${siteId}|${source}|${type}|${sourceDedupeKey}`).digest("hex");
}

const severityBase: Record<TechnicalFindingInput["severity"], number> = {
  info: 10,
  low: 25,
  medium: 45,
  high: 70,
  critical: 90,
};

function scoreTechnical(finding: TechnicalFindingInput, context?: BusinessContext): number {
  const base = severityBase[finding.severity];
  const commercial = normalizeFactor(context?.commercialValue, 1);
  const conversion = normalizeFactor(context?.conversionRate, 1, 1.5);
  const cost = Math.max(0.25, normalizeFactor(context?.implementationCost, 1, 4));
  return clamp((base * commercial * conversion) / cost);
}

function scoreRanking(item: RankingOpportunityInput, context?: BusinessContext): number {
  const commercial = normalizeFactor(context?.commercialValue, 1);
  const conversion = normalizeFactor(context?.conversionRate, 1, 1.5);
  const cost = Math.max(0.25, normalizeFactor(context?.implementationCost, 1, 4));
  const impressionBoost = Math.min(1.25, 1 + Math.log10(Math.max(item.impressions, 1)) / 20);
  return clamp((item.score * item.confidence * commercial * conversion * impressionBoost) / cost);
}

export function buildOpportunityQueue(input: OpportunityEngineInput): UnifiedOpportunity[] {
  if (!input.siteId.trim()) throw new Error("siteId is required");
  const contexts = businessMap(input.businessContext);
  const output: UnifiedOpportunity[] = [];

  for (const finding of input.technicalFindings ?? []) {
    const context = contexts.get(finding.pageId ?? "");
    const score = Math.round(scoreTechnical(finding, context) * 100) / 100;
    const type = `technical.${finding.ruleId}`;
    output.push({
      siteId: input.siteId,
      pageId: finding.pageId,
      source: "technical",
      type,
      priority: priority(score, "technical", finding.ruleId),
      score,
      confidence: finding.severity === "critical" || finding.severity === "high" ? 0.97 : 0.93,
      title: finding.title,
      rationale: {
        category: finding.category,
        severity: finding.severity,
        description: finding.description,
        businessContext: context ?? null,
      },
      sourceDedupeKey: finding.dedupeKey,
      dedupeKey: makeKey(input.siteId, "technical", type, finding.dedupeKey),
    });
  }

  for (const item of input.rankingOpportunities ?? []) {
    const context = contexts.get(item.pageUrl);
    const score = Math.round(scoreRanking(item, context) * 100) / 100;
    output.push({
      siteId: input.siteId,
      pageId: context?.pageId ?? null,
      source: "ranking",
      type: `ranking.${item.type}`,
      priority: priority(score, "ranking", item.type),
      score,
      confidence: Math.max(0, Math.min(1, item.confidence)),
      title: `${item.type.replaceAll("_", " ")}: ${item.query}`,
      rationale: {
        query: item.query,
        pageUrl: item.pageUrl,
        currentPosition: item.currentPosition,
        currentCtr: item.currentCtr,
        impressions: item.impressions,
        details: item.details,
        businessContext: context ?? null,
      },
      sourceDedupeKey: item.dedupeKey,
      dedupeKey: makeKey(input.siteId, "ranking", item.type, item.dedupeKey),
    });
  }

  const seen = new Set<string>();
  return output
    .filter((item) => {
      if (seen.has(item.dedupeKey)) return false;
      seen.add(item.dedupeKey);
      return true;
    })
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.dedupeKey.localeCompare(b.dedupeKey));
}

export function toOpportunityInsert(item: UnifiedOpportunity) {
  return {
    siteId: item.siteId,
    pageId: item.pageId,
    type: item.type,
    status: "open" as const,
    score: item.score,
    confidence: item.confidence,
    title: item.title,
    rationale: {
      ...item.rationale,
      source: item.source,
      priority: item.priority,
      sourceDedupeKey: item.sourceDedupeKey,
      dedupeKey: item.dedupeKey,
    },
  };
}
