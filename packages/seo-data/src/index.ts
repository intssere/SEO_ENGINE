export type SeoLocation = {
  countryCode?: string;
  languageCode?: string;
  locationName?: string;
};

export type KeywordResearchRequest = {
  keywords: string[];
  location?: SeoLocation;
  limit?: number;
};

export type KeywordMetric = {
  keyword: string;
  searchVolume: number | null;
  competition: number | null;
  cpc: number | null;
  source: string;
  raw?: Record<string, unknown>;
};

export type SerpRequest = {
  keyword: string;
  location?: SeoLocation;
  depth?: number;
};

export type SerpResult = {
  rank: number;
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  source: string;
  raw?: Record<string, unknown>;
};

export type DomainOverview = {
  domain: string;
  organicTraffic: number | null;
  organicKeywords: number | null;
  backlinks: number | null;
  referringDomains: number | null;
  source: string;
  raw?: Record<string, unknown>;
};

export type RankedKeyword = {
  keyword: string;
  rank: number | null;
  url: string | null;
  searchVolume: number | null;
  source: string;
  raw?: Record<string, unknown>;
};

export type BacklinkSummary = {
  domain: string;
  backlinks: number | null;
  referringDomains: number | null;
  dofollowBacklinks: number | null;
  source: string;
  raw?: Record<string, unknown>;
};

export interface SeoDataProvider {
  readonly id: string;
  keywordResearch(request: KeywordResearchRequest): Promise<KeywordMetric[]>;
  serp(request: SerpRequest): Promise<SerpResult[]>;
  domainOverview(domain: string): Promise<DomainOverview>;
  rankedKeywords(domain: string, limit?: number): Promise<RankedKeyword[]>;
  backlinks(domain: string): Promise<BacklinkSummary>;
}

export type ToolCallTransport = {
  callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T>;
};

export class OpenSeoAdapter implements SeoDataProvider {
  readonly id = "openseo";

  constructor(private readonly transport: ToolCallTransport) {}

  async keywordResearch(request: KeywordResearchRequest): Promise<KeywordMetric[]> {
    const raw = await this.transport.callTool<unknown>("keyword_research", {
      keywords: request.keywords,
      ...locationArgs(request.location),
      ...(request.limit ? { limit: request.limit } : {}),
    });
    return normalizeKeywordMetrics(raw);
  }

  async serp(request: SerpRequest): Promise<SerpResult[]> {
    const raw = await this.transport.callTool<unknown>("get_serp_results", {
      keyword: request.keyword,
      ...locationArgs(request.location),
      ...(request.depth ? { depth: request.depth } : {}),
    });
    return normalizeSerpResults(raw);
  }

  async domainOverview(domain: string): Promise<DomainOverview> {
    const raw = await this.transport.callTool<unknown>("get_domain_overview", { domain });
    const row = firstRecord(raw);
    return {
      domain,
      organicTraffic: numberOrNull(row.organicTraffic ?? row.organic_traffic),
      organicKeywords: numberOrNull(row.organicKeywords ?? row.organic_keywords),
      backlinks: numberOrNull(row.backlinks),
      referringDomains: numberOrNull(row.referringDomains ?? row.referring_domains),
      source: this.id,
      raw: row,
    };
  }

  async rankedKeywords(domain: string, limit = 100): Promise<RankedKeyword[]> {
    const raw = await this.transport.callTool<unknown>("get_ranked_keywords", { domain, limit });
    return records(raw).map((row) => ({
      keyword: stringValue(row.keyword),
      rank: numberOrNull(row.rank ?? row.position),
      url: nullableString(row.url),
      searchVolume: numberOrNull(row.searchVolume ?? row.search_volume),
      source: this.id,
      raw: row,
    })).filter((row) => row.keyword.length > 0);
  }

  async backlinks(domain: string): Promise<BacklinkSummary> {
    const raw = await this.transport.callTool<unknown>("get_backlinks_overview", { domain });
    const row = firstRecord(raw);
    return {
      domain,
      backlinks: numberOrNull(row.backlinks ?? row.totalBacklinks ?? row.total_backlinks),
      referringDomains: numberOrNull(row.referringDomains ?? row.referring_domains),
      dofollowBacklinks: numberOrNull(row.dofollowBacklinks ?? row.dofollow_backlinks),
      source: this.id,
      raw: row,
    };
  }
}

function locationArgs(location?: SeoLocation): Record<string, unknown> {
  if (!location) return {};
  return {
    ...(location.countryCode ? { countryCode: location.countryCode } : {}),
    ...(location.languageCode ? { languageCode: location.languageCode } : {}),
    ...(location.locationName ? { locationName: location.locationName } : {}),
  };
}

function normalizeKeywordMetrics(raw: unknown): KeywordMetric[] {
  return records(raw).map((row) => ({
    keyword: stringValue(row.keyword),
    searchVolume: numberOrNull(row.searchVolume ?? row.search_volume),
    competition: numberOrNull(row.competition),
    cpc: numberOrNull(row.cpc),
    source: "openseo",
    raw: row,
  })).filter((row) => row.keyword.length > 0);
}

function normalizeSerpResults(raw: unknown): SerpResult[] {
  return records(raw).map((row) => {
    const url = stringValue(row.url);
    return {
      rank: numberOrNull(row.rank ?? row.position) ?? 0,
      url,
      domain: nullableString(row.domain) ?? safeDomain(url),
      title: nullableString(row.title),
      description: nullableString(row.description ?? row.snippet),
      source: "openseo",
      raw: row,
    };
  }).filter((row) => row.url.length > 0);
}

function records(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];
  for (const key of ["results", "items", "data", "keywords", "organic"]) {
    const value = raw[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  return [raw];
}

function firstRecord(raw: unknown): Record<string, unknown> {
  return records(raw)[0] ?? {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
