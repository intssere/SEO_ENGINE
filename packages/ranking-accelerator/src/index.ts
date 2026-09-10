import { createHash } from "node:crypto";

export interface SearchMetric {
  query: string;
  pageUrl: string;
  metricDate: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  country?: string | null;
  device?: string | null;
}

export type RankingOpportunityType = "striking_distance" | "ctr_underperformance" | "ranking_decay" | "protect_winner";

export interface RankingOpportunity {
  type: RankingOpportunityType;
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

export interface RankingAcceleratorOptions {
  strikingDistanceMin?: number;
  strikingDistanceMax?: number;
  protectMaxPosition?: number;
  minImpressions?: number;
  ctrDeficitThreshold?: number;
  decayPositionDelta?: number;
}

const defaults: Required<RankingAcceleratorOptions> = {
  strikingDistanceMin: 4,
  strikingDistanceMax: 20,
  protectMaxPosition: 5,
  minImpressions: 50,
  ctrDeficitThreshold: 0.25,
  decayPositionDelta: 2,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function key(type: RankingOpportunityType, query: string, pageUrl: string): string {
  return createHash("sha256").update(`${type}|${query}|${pageUrl}`).digest("hex");
}

function expectedCtr(position: number): number {
  if (position <= 1) return 0.28;
  if (position <= 2) return 0.16;
  if (position <= 3) return 0.11;
  if (position <= 5) return 0.07;
  if (position <= 10) return 0.035;
  if (position <= 20) return 0.015;
  return 0.008;
}

function aggregate(rows: SearchMetric[]) {
  const groups = new Map<string, SearchMetric[]>();
  for (const row of rows) {
    if (!row.query || !row.pageUrl || row.impressions < 0 || row.clicks < 0) continue;
    const k = `${row.query}\u0000${row.pageUrl}`;
    const list = groups.get(k) ?? [];
    list.push(row);
    groups.set(k, list);
  }
  return groups;
}

function weightedAverage(rows: SearchMetric[], field: "averagePosition" | "ctr"): number {
  const weight = rows.reduce((s, r) => s + Math.max(r.impressions, 1), 0);
  if (!weight) return 0;
  return rows.reduce((s, r) => s + r[field] * Math.max(r.impressions, 1), 0) / weight;
}

export function evaluateRankingOpportunities(
  rows: SearchMetric[],
  options: RankingAcceleratorOptions = {},
): RankingOpportunity[] {
  const cfg = { ...defaults, ...options };
  const output: RankingOpportunity[] = [];

  for (const group of aggregate(rows).values()) {
    const sorted = [...group].sort((a, b) => a.metricDate.localeCompare(b.metricDate));
    const impressions = sorted.reduce((s, r) => s + r.impressions, 0);
    if (impressions < cfg.minImpressions) continue;

    const current = sorted[sorted.length - 1]!;
    const currentPosition = current.averagePosition;
    const currentCtr = current.ctr;
    const query = current.query;
    const pageUrl = current.pageUrl;

    if (currentPosition >= cfg.strikingDistanceMin && currentPosition <= cfg.strikingDistanceMax) {
      const proximity = 1 - (currentPosition - cfg.strikingDistanceMin) / Math.max(1, cfg.strikingDistanceMax - cfg.strikingDistanceMin);
      const score = clamp((Math.log10(impressions + 1) * 20) + proximity * 40);
      output.push({
        type: "striking_distance",
        query,
        pageUrl,
        score: Math.round(score * 100) / 100,
        confidence: 0.9,
        currentPosition,
        currentCtr,
        impressions,
        details: { proximity: Math.round(proximity * 1000) / 1000 },
        dedupeKey: key("striking_distance", query, pageUrl),
      });
    }

    const expected = expectedCtr(currentPosition);
    const deficit = expected > 0 ? (expected - currentCtr) / expected : 0;
    if (deficit >= cfg.ctrDeficitThreshold) {
      const score = clamp((Math.log10(impressions + 1) * 18) + deficit * 45);
      output.push({
        type: "ctr_underperformance",
        query,
        pageUrl,
        score: Math.round(score * 100) / 100,
        confidence: 0.85,
        currentPosition,
        currentCtr,
        impressions,
        details: { expectedCtr: expected, ctrDeficitRatio: Math.round(deficit * 1000) / 1000 },
        dedupeKey: key("ctr_underperformance", query, pageUrl),
      });
    }

    if (sorted.length >= 4) {
      const split = Math.floor(sorted.length / 2);
      const previous = sorted.slice(0, split);
      const recent = sorted.slice(split);
      const previousPosition = weightedAverage(previous, "averagePosition");
      const recentPosition = weightedAverage(recent, "averagePosition");
      const delta = recentPosition - previousPosition;
      if (delta >= cfg.decayPositionDelta) {
        const score = clamp((Math.log10(impressions + 1) * 18) + delta * 8);
        output.push({
          type: "ranking_decay",
          query,
          pageUrl,
          score: Math.round(score * 100) / 100,
          confidence: 0.88,
          currentPosition,
          currentCtr,
          impressions,
          details: {
            previousPosition: Math.round(previousPosition * 100) / 100,
            recentPosition: Math.round(recentPosition * 100) / 100,
            positionDelta: Math.round(delta * 100) / 100,
          },
          dedupeKey: key("ranking_decay", query, pageUrl),
        });
      }
    }

    if (currentPosition > 0 && currentPosition <= cfg.protectMaxPosition) {
      const score = clamp((Math.log10(impressions + 1) * 22) + (cfg.protectMaxPosition - currentPosition + 1) * 7);
      output.push({
        type: "protect_winner",
        query,
        pageUrl,
        score: Math.round(score * 100) / 100,
        confidence: 0.95,
        currentPosition,
        currentCtr,
        impressions,
        details: { protected: true },
        dedupeKey: key("protect_winner", query, pageUrl),
      });
    }
  }

  return output.sort((a, b) => b.score - a.score || a.dedupeKey.localeCompare(b.dedupeKey));
}

export function toOpportunityInsert(item: RankingOpportunity, siteId: string, pageId: string | null = null) {
  return {
    siteId,
    pageId,
    type: item.type,
    status: "open" as const,
    score: item.score,
    confidence: item.confidence,
    title: `${item.type.replaceAll("_", " ")}: ${item.query}`,
    rationale: {
      query: item.query,
      pageUrl: item.pageUrl,
      currentPosition: item.currentPosition,
      currentCtr: item.currentCtr,
      impressions: item.impressions,
      ...item.details,
      dedupeKey: item.dedupeKey,
    },
  };
}
