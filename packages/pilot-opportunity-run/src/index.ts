import {
  buildOpportunityQueue,
  type BusinessContext,
  type RankingOpportunityInput,
  type TechnicalFindingInput,
  type UnifiedOpportunity,
} from "@seo-engine/opportunity-engine";

export interface SupplementalOpportunitySignal {
  source: "internal_link" | "ai_visibility";
  title: string;
  pageId?: string | null;
  score: number;
  confidence: number;
  evidenceRef: string;
  rationale: Record<string, unknown>;
}

export interface PilotOpportunityRunInput {
  siteId: string;
  baselineCertified: boolean;
  technicalFindings?: TechnicalFindingInput[];
  rankingOpportunities?: RankingOpportunityInput[];
  businessContext?: BusinessContext[];
  supplementalSignals?: SupplementalOpportunitySignal[];
  publicSiteWritesEnabled?: boolean;
}

export interface PilotOpportunityCandidate {
  source: "technical" | "ranking" | "internal_link" | "ai_visibility";
  title: string;
  pageId: string | null;
  score: number;
  confidence: number;
  evidenceRef: string;
  rationale: Record<string, unknown>;
}

export interface PilotOpportunityRunResult {
  status: "blocked" | "ready";
  blockers: string[];
  candidates: PilotOpportunityCandidate[];
  summary: {
    total: number;
    highConfidence: number;
    bySource: Record<PilotOpportunityCandidate["source"], number>;
  };
}

function fromUnified(item: UnifiedOpportunity): PilotOpportunityCandidate {
  return {
    source: item.source,
    title: item.title,
    pageId: item.pageId,
    score: item.score,
    confidence: item.confidence,
    evidenceRef: item.sourceDedupeKey,
    rationale: item.rationale,
  };
}

function normalizeSupplemental(signal: SupplementalOpportunitySignal): PilotOpportunityCandidate {
  return {
    source: signal.source,
    title: signal.title.trim(),
    pageId: signal.pageId ?? null,
    score: Math.max(0, Math.min(100, signal.score)),
    confidence: Math.max(0, Math.min(1, signal.confidence)),
    evidenceRef: signal.evidenceRef.trim(),
    rationale: signal.rationale,
  };
}

export function runPilotOpportunityQueue(input: PilotOpportunityRunInput): PilotOpportunityRunResult {
  const blockers: string[] = [];
  if (!input.siteId.trim()) blockers.push("siteId is required");
  if (!input.baselineCertified) blockers.push("Diamond Shelf baseline must be certified before the opportunity run");
  if (input.publicSiteWritesEnabled) blockers.push("First real opportunity run is read-only and requires public-site writes disabled");

  const supplemental = (input.supplementalSignals ?? []).filter((signal) => {
    if (!signal.title.trim() || !signal.evidenceRef.trim()) return false;
    return Number.isFinite(signal.score) && Number.isFinite(signal.confidence);
  });

  if (blockers.length > 0) {
    return {
      status: "blocked",
      blockers,
      candidates: [],
      summary: { total: 0, highConfidence: 0, bySource: { technical: 0, ranking: 0, internal_link: 0, ai_visibility: 0 } },
    };
  }

  const unified = buildOpportunityQueue({
    siteId: input.siteId,
    ...(input.technicalFindings ? { technicalFindings: input.technicalFindings } : {}),
    ...(input.rankingOpportunities ? { rankingOpportunities: input.rankingOpportunities } : {}),
    ...(input.businessContext ? { businessContext: input.businessContext } : {}),
  }).map(fromUnified);

  const candidates = [...unified, ...supplemental.map(normalizeSupplemental)]
    .filter((item) => item.evidenceRef.length > 0)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.evidenceRef.localeCompare(b.evidenceRef));

  const bySource = { technical: 0, ranking: 0, internal_link: 0, ai_visibility: 0 } as Record<PilotOpportunityCandidate["source"], number>;
  for (const item of candidates) bySource[item.source] += 1;

  return {
    status: "ready",
    blockers: [],
    candidates,
    summary: {
      total: candidates.length,
      highConfidence: candidates.filter((item) => item.confidence >= 0.8).length,
      bySource,
    },
  };
}
