export type ReconciliationStatus = "consistent" | "partial_dimensional" | "inconsistent" | "aggregate_unavailable";
export type OpportunityType = "organic_ctr" | "striking_distance" | "technical_remediation" | "internal_link" | "content_alignment";
export type OpportunityRisk = "low" | "medium" | "high";

export type CrawlPageSignal = {
  pageId: string;
  url: string;
  title: string | null;
  h1: string | null;
  contentText: string;
  links: string[];
  evidenceId: string;
};

export type GscPageQuerySignal = {
  pageId: string;
  queryId: string;
  query: string;
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
};

export type TechnicalFindingSignal = {
  findingId: string;
  pageId: string;
  title: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  evidenceId: string;
};

export type ScoreComponents = {
  demand: number;
  proximity: number;
  confidence: number;
  evidence: number;
};

export type OpportunityCandidate = {
  generationKey: string;
  opportunityType: OpportunityType;
  pageId: string;
  queryId: string | null;
  query: string | null;
  title: string;
  confidence: number;
  risk: OpportunityRisk;
  score: number;
  scoreComponents: ScoreComponents;
  rationale: string;
  recommendation: string;
  sourceEvidenceIds: string[];
  metrics: Record<string, number | string | null>;
};

export type OpportunityEngineInput = {
  pilotReady: boolean;
  aggregateAvailable: boolean;
  reconciliation: ReconciliationStatus;
  crawl: { fetched: number; discovered: number; boundedLimit: number; truncated: boolean };
  gsc: GscPageQuerySignal[];
  crawlPages: CrawlPageSignal[];
  technicalFindings: TechnicalFindingSignal[];
};

const activeStatuses = new Set(["new", "accepted", "planned"]);
const significantQueryTerms = (query: string) => query.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((term) => !["the", "and", "for", "with", "from"].includes(term)) ?? [];
const round = (value: number, digits = 3) => Number(value.toFixed(digits));

export function opportunityConfidence(input: OpportunityEngineInput, evidenceStrength: number) {
  const discovered = Math.max(input.crawl.discovered, input.crawl.fetched, 1);
  const observedCoverage = Math.min(1, input.crawl.fetched / discovered);
  const boundedFactor = 0.65 + observedCoverage * 0.2;
  const reconciliationFactor = input.reconciliation === "consistent" ? 1 : input.reconciliation === "partial_dimensional" ? 0.82 : 0;
  return round(Math.min(0.95, evidenceStrength * boundedFactor * reconciliationFactor));
}

export function scoreOpportunity(input: { impressions: number; position: number | null; confidence: number; evidenceCount: number }): { score: number; components: ScoreComponents } {
  const demand = Math.min(40, Math.log10(Math.max(1, input.impressions) + 1) * 14);
  const proximity = input.position === null ? 8 : Math.max(0, Math.min(25, 25 - Math.abs(10 - input.position) * 1.5));
  const confidence = Math.min(20, input.confidence * 20);
  const evidence = Math.min(15, input.evidenceCount * 5);
  const components = { demand: round(demand, 2), proximity: round(proximity, 2), confidence: round(confidence, 2), evidence: round(evidence, 2) };
  return { score: round(Object.values(components).reduce((sum, value) => sum + value, 0), 2), components };
}

function candidate(input: Omit<OpportunityCandidate, "score" | "scoreComponents"> & { impressions: number; position: number | null }) {
  const scored = scoreOpportunity({ impressions: input.impressions, position: input.position, confidence: input.confidence, evidenceCount: input.sourceEvidenceIds.length });
  const { impressions: _impressions, position: _position, ...rest } = input;
  return { ...rest, score: scored.score, scoreComponents: scored.components };
}

function normalizedUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.replace(/\/$/, "").toLowerCase();
  }
}

function expectedCtr(position: number) {
  if (position <= 6) return 0.04;
  if (position <= 10) return 0.025;
  return 0;
}

export function generateOpportunityCandidates(input: OpportunityEngineInput): OpportunityCandidate[] {
  if (!input.pilotReady || !input.aggregateAvailable || ["inconsistent", "aggregate_unavailable"].includes(input.reconciliation)) return [];
  const crawlByPage = new Map(input.crawlPages.map((page) => [page.pageId, page]));
  const candidates: OpportunityCandidate[] = [];

  for (const row of input.gsc) {
    const page = crawlByPage.get(row.pageId);
    if (!page || row.position === null || row.impressions <= 0) continue;
    const baseEvidence = [page.evidenceId];
    const confidence = opportunityConfidence(input, 0.96);
    const keyBase = `${row.pageId}:${row.queryId}`;

    if (row.position >= 4 && row.position <= 10 && row.impressions >= 30 && row.ctr < expectedCtr(row.position) * 0.6) {
      candidates.push(candidate({
        generationKey: `opportunity_engine_v1:organic_ctr:${keyBase}`,
        opportunityType: "organic_ctr",
        pageId: row.pageId,
        queryId: row.queryId,
        query: row.query,
        title: `Improve search snippet CTR for “${row.query}”`,
        confidence,
        risk: "low",
        impressions: row.impressions,
        position: row.position,
        rationale: `Detailed GSC evidence shows ${row.impressions} impressions, ${(row.ctr * 100).toFixed(2)}% CTR and average position ${row.position.toFixed(1)}. The query is already ranking in positions 4–10, so this is a snippet problem rather than a ranking problem.`,
        recommendation: "Dry run: review title and meta-description alignment for this query; prepare a proposed snippet revision for approval.",
        sourceEvidenceIds: baseEvidence,
        metrics: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
      }));
    } else if (row.position > 10 && row.position <= 20 && row.impressions >= 20) {
      candidates.push(candidate({
        generationKey: `opportunity_engine_v1:striking_distance:${keyBase}`,
        opportunityType: "striking_distance",
        pageId: row.pageId,
        queryId: row.queryId,
        query: row.query,
        title: `Move “${row.query}” from striking distance`,
        confidence,
        risk: "low",
        impressions: row.impressions,
        position: row.position,
        rationale: `Detailed GSC evidence shows ${row.impressions} impressions at average position ${row.position.toFixed(1)}. Positions 11–20 are treated as a ranking opportunity, not a CTR opportunity.`,
        recommendation: "Dry run: review page-query alignment, competing sections, and on-page coverage; prepare ranking recommendations only.",
        sourceEvidenceIds: baseEvidence,
        metrics: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
      }));
    } else if (row.position > 20 && row.position <= 30 && row.impressions >= 50) {
      const terms = significantQueryTerms(row.query);
      const headings = `${page.title ?? ""} ${page.h1 ?? ""}`.toLowerCase();
      const matched = terms.some((term) => headings.includes(term));
      if (terms.length > 0 && !matched) {
        candidates.push(candidate({
          generationKey: `opportunity_engine_v1:content_alignment:${keyBase}`,
          opportunityType: "content_alignment",
          pageId: row.pageId,
          queryId: row.queryId,
          query: row.query,
          title: `Strengthen content alignment for “${row.query}”`,
          confidence: opportunityConfidence(input, 0.88),
          risk: "medium",
          impressions: row.impressions,
          position: row.position,
          rationale: `Detailed GSC evidence shows ${row.impressions} impressions at average position ${row.position.toFixed(1)}, while significant query terms are absent from the observed title and H1.`,
          recommendation: "Dry run: inspect intent and prepare a content-alignment brief; do not rewrite or publish content automatically.",
          sourceEvidenceIds: baseEvidence,
          metrics: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
        }));
      }
    }

    if (row.position >= 8 && row.position <= 20 && row.impressions >= 30) {
      const target = normalizedUrl(row.url);
      const terms = significantQueryTerms(row.query);
      const sources = input.crawlPages.filter((source) =>
        source.pageId !== row.pageId
        && terms.some((term) => source.contentText.toLowerCase().includes(term))
        && !source.links.some((link) => normalizedUrl(link) === target),
      ).slice(0, 3);
      if (sources.length > 0) {
        const evidence = [page.evidenceId, ...sources.map((source) => source.evidenceId)];
        candidates.push(candidate({
          generationKey: `opportunity_engine_v1:internal_link:${keyBase}`,
          opportunityType: "internal_link",
          pageId: row.pageId,
          queryId: row.queryId,
          query: row.query,
          title: `Add contextual internal links for “${row.query}”`,
          confidence: opportunityConfidence(input, 0.9),
          risk: "medium",
          impressions: row.impressions,
          position: row.position,
          rationale: `${sources.length} crawled source page${sources.length === 1 ? "" : "s"} contain relevant query terms, do not currently link to the ranking target, and have page-level crawl evidence.`,
          recommendation: `Dry run: review contextual link placements from ${sources.map((source) => source.url).join(", ")}; prepare anchor and destination recommendations only.`,
          sourceEvidenceIds: evidence,
          metrics: { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position, sourcePages: sources.length },
        }));
      }
    }
  }

  for (const finding of input.technicalFindings) {
    if (!crawlByPage.has(finding.pageId) || ["info", "low"].includes(finding.severity)) continue;
    const severityWeight = finding.severity === "critical" ? 100 : finding.severity === "high" ? 70 : 40;
    candidates.push(candidate({
      generationKey: `opportunity_engine_v1:technical_remediation:${finding.findingId}`,
      opportunityType: "technical_remediation",
      pageId: finding.pageId,
      queryId: null,
      query: null,
      title: finding.title,
      confidence: opportunityConfidence(input, 0.98),
      risk: ["critical", "high"].includes(finding.severity) ? "high" : "medium",
      impressions: severityWeight,
      position: null,
      rationale: `An open ${finding.severity}-severity technical finding has matching page-level crawler evidence from the current bounded run.`,
      recommendation: "Dry run: prepare a technical remediation specification and validation checklist; do not change the public site.",
      sourceEvidenceIds: [finding.evidenceId],
      metrics: { severity: finding.severity, findingId: finding.findingId },
    }));
  }

  return candidates.sort((a, b) => b.score - a.score || a.generationKey.localeCompare(b.generationKey));
}

export function reconcileManagedOpportunities(
  existing: Array<{ id: string; status: string; generationKey: string | null }>,
  candidates: OpportunityCandidate[],
) {
  const candidateKeys = new Set(candidates.map((item) => item.generationKey));
  return {
    retainedIds: existing.filter((item) => activeStatuses.has(item.status) && item.generationKey && candidateKeys.has(item.generationKey)).map((item) => item.id),
    staleIds: existing.filter((item) => activeStatuses.has(item.status) && item.generationKey?.startsWith("opportunity_engine_v1:") && !candidateKeys.has(item.generationKey)).map((item) => item.id),
  };
}

export function dryRunActionPlan(candidate: OpportunityCandidate) {
  return {
    status: "pending" as const,
    riskLevel: "blocked" as const,
    rationale: candidate.recommendation,
    expectedOutcome: {
      dryRun: true,
      executionAuthorized: false,
      publicSiteWrites: false,
      opportunityType: candidate.opportunityType,
      riskClassification: candidate.risk,
      confidence: candidate.confidence,
      recommendation: candidate.recommendation,
    },
  };
}