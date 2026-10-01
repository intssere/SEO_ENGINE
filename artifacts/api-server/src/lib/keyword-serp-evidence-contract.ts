import { createHash } from "node:crypto";

export const UGP_KEYWORD_SERP_EVIDENCE_VERSION =
  "ugp-6-1a-keyword-serp-evidence-v1" as const;

export type SearchMarket = Readonly<{
  searchEngine: "google";
  locationCode: number;
  languageCode: string;
  device: "desktop" | "mobile";
}>;

export type NormalizedSearchIntent =
  | "informational"
  | "navigational"
  | "commercial"
  | "transactional"
  | "unknown";

export type MonthlySearch = Readonly<{
  year: number;
  month: number;
  searchVolume: number | null;
}>;

export type KeywordEvidence = Readonly<{
  keyword: string;
  market: SearchMarket;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  cpcUsd: number | null;
  paidCompetition: number | null;
  paidCompetitionLevel: "low" | "medium" | "high" | null;
  intent: NormalizedSearchIntent;
  monthlySearches: readonly MonthlySearch[];
}>;

export type RelatedTopicEvidence = Readonly<{
  keyword: string;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  cpcUsd: number | null;
  paidCompetition: number | null;
  intent: NormalizedSearchIntent;
}>;

export type RankingUrlEvidence = Readonly<{
  rankAbsolute: number;
  rankGroup: number | null;
  url: string;
  domain: string;
  title: string | null;
  resultType: string;
  isOrganic: boolean;
}>;

export type SerpEvidence = Readonly<{
  keyword: string;
  market: SearchMarket;
  features: readonly string[];
  rankingUrls: readonly RankingUrlEvidence[];
}>;

export type EvidenceProvenance = Readonly<{
  provider: "dataforseo";
  providerDataset:
    | "keyword_overview"
    | "related_keywords"
    | "serp_advanced";
  providerTaskId: string | null;
  providerStatusCode: number;
  providerStatusMessage: string | null;
  providerPath: string;
  costUsd: number | null;
  responseFingerprint: string;
}>;

export type KeywordSerpEvidenceBundle = Readonly<{
  version: typeof UGP_KEYWORD_SERP_EVIDENCE_VERSION;
  keyword: KeywordEvidence;
  relatedTopics: readonly RelatedTopicEvidence[];
  serp: SerpEvidence;
  provenance: readonly EvidenceProvenance[];
  semantics: Readonly<{
    readOnly: true;
    grantsAuthorization: false;
    grantsProviderWrite: false;
    grantsPublicSiteWrite: false;
    performsNetworkOperation: false;
  }>;
  evidenceFingerprint: string;
}>;

export type KeywordSerpEvidenceRequest = Readonly<{
  keyword: string;
  market: SearchMarket;
  requestFingerprint: string;
}>;

const SEMANTICS = Object.freeze({
  readOnly: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
});

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

export function stableEvidenceHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function exactKeyword(value: unknown): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > 512
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_keyword_serp_invalid_keyword");
  }
  return value;
}

function exactMarket(market: SearchMarket): SearchMarket {
  if (!market || typeof market !== "object" || Array.isArray(market)) {
    throw new Error("ugp_keyword_serp_invalid_market");
  }
  if (market.searchEngine !== "google") {
    throw new Error("ugp_keyword_serp_invalid_search_engine");
  }
  if (!Number.isSafeInteger(market.locationCode) || market.locationCode < 1) {
    throw new Error("ugp_keyword_serp_invalid_location_code");
  }
  if (!/^[a-z]{2,8}(-[A-Z]{2})?$/.test(market.languageCode)) {
    throw new Error("ugp_keyword_serp_invalid_language_code");
  }
  if (market.device !== "desktop" && market.device !== "mobile") {
    throw new Error("ugp_keyword_serp_invalid_device");
  }
  return Object.freeze({ ...market });
}

export function buildKeywordSerpEvidenceRequest(input: {
  keyword: string;
  market: SearchMarket;
}): KeywordSerpEvidenceRequest {
  const keyword = exactKeyword(input.keyword);
  const market = exactMarket(input.market);
  const base = {
    version: UGP_KEYWORD_SERP_EVIDENCE_VERSION,
    keyword,
    market,
  };
  return Object.freeze({
    keyword,
    market,
    requestFingerprint: stableEvidenceHash({
      purpose: "ugp_keyword_serp_evidence_request",
      ...base,
    }),
  });
}

export function finalizeKeywordSerpEvidenceBundle(input: Omit<
  KeywordSerpEvidenceBundle,
  "version" | "semantics" | "evidenceFingerprint"
>): KeywordSerpEvidenceBundle {
  const base = {
    version: UGP_KEYWORD_SERP_EVIDENCE_VERSION,
    keyword: input.keyword,
    relatedTopics: Object.freeze([...input.relatedTopics]),
    serp: input.serp,
    provenance: Object.freeze([...input.provenance]),
    semantics: SEMANTICS,
  };
  return Object.freeze({
    ...base,
    evidenceFingerprint: stableEvidenceHash({
      purpose: "ugp_keyword_serp_evidence_bundle",
      ...base,
    }),
  });
}

export function assertKeywordSerpEvidenceSafety(
  bundle: KeywordSerpEvidenceBundle,
): void {
  if (
    bundle.semantics.readOnly !== true
    || bundle.semantics.grantsAuthorization !== false
    || bundle.semantics.grantsProviderWrite !== false
    || bundle.semantics.grantsPublicSiteWrite !== false
    || bundle.semantics.performsNetworkOperation !== false
  ) {
    throw new Error("ugp_keyword_serp_unsafe_semantics");
  }
}
