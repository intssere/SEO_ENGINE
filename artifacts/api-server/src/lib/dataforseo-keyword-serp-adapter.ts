import {
  assertKeywordSerpEvidenceSafety,
  finalizeKeywordSerpEvidenceBundle,
  stableEvidenceHash,
  type EvidenceProvenance,
  type KeywordSerpEvidenceBundle,
  type KeywordSerpEvidenceRequest,
  type NormalizedSearchIntent,
  type RankingUrlEvidence,
  type RelatedTopicEvidence,
} from "./keyword-serp-evidence-contract.js";

type ProviderTaskEnvelope = {
  id?: unknown;
  status_code?: unknown;
  status_message?: unknown;
  path?: unknown;
  cost?: unknown;
  result?: unknown;
};

type ProviderEnvelope = {
  tasks?: unknown;
};

function exactTask(envelope: ProviderEnvelope, dataset: string): ProviderTaskEnvelope {
  if (!envelope || !Array.isArray(envelope.tasks) || envelope.tasks.length !== 1) {
    throw new Error("ugp_dataforseo_invalid_" + dataset + "_envelope");
  }
  const task = envelope.tasks[0] as ProviderTaskEnvelope;
  if (
    typeof task.status_code !== "number"
    || task.status_code < 20000
    || task.status_code >= 30000
  ) {
    throw new Error("ugp_dataforseo_task_failed_" + dataset);
  }
  return task;
}

function firstResult(task: ProviderTaskEnvelope, dataset: string): Record<string, unknown> {
  if (!Array.isArray(task.result) || task.result.length < 1) {
    throw new Error("ugp_dataforseo_missing_" + dataset + "_result");
  }
  const result = task.result[0];
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("ugp_dataforseo_invalid_" + dataset + "_result");
  }
  return result as Record<string, unknown>;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nullableInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function normalizeIntent(value: unknown): NormalizedSearchIntent {
  return value === "informational"
    || value === "navigational"
    || value === "commercial"
    || value === "transactional"
    ? value
    : "unknown";
}

function normalizeCompetitionLevel(
  value: unknown,
): "low" | "medium" | "high" | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  return lower === "low" || lower === "medium" || lower === "high" ? lower : null;
}

function provenance(
  task: ProviderTaskEnvelope,
  dataset: EvidenceProvenance["providerDataset"],
  raw: ProviderEnvelope,
): EvidenceProvenance {
  return Object.freeze({
    provider: "dataforseo",
    providerDataset: dataset,
    providerTaskId: typeof task.id === "string" ? task.id : null,
    providerStatusCode: task.status_code as number,
    providerStatusMessage: typeof task.status_message === "string"
      ? task.status_message
      : null,
    providerPath: typeof task.path === "string"
    ? task.path.replace(/^\/+/, "")
    : Array.isArray(task.path) && task.path.every((part) => typeof part === "string")
      ? (task.path as string[]).join("/")
      : "",
    costUsd: nullableNumber(task.cost),
    responseFingerprint: stableEvidenceHash(raw),
  });
}

function keywordData(result: Record<string, unknown>): Record<string, unknown> {
  const keywordInfo = result.keyword_info;
  return keywordInfo && typeof keywordInfo === "object" && !Array.isArray(keywordInfo)
    ? keywordInfo as Record<string, unknown>
    : {};
}

function keywordOverviewRow(
  result: Record<string, unknown>,
  keyword: string,
): Record<string, unknown> {
  if (!Array.isArray(result.items)) return result;
  const rows = result.items.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
  );
  return rows.find((row) => row.keyword === keyword) ?? rows[0] ?? {};
}

function monthlySearches(info: Record<string, unknown>) {
  if (!Array.isArray(info.monthly_searches)) return [];
  return info.monthly_searches.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    const year = nullableInt(row.year);
    const month = nullableInt(row.month);
    if (year == null || month == null || month < 1 || month > 12) return [];
    return [Object.freeze({
      year,
      month,
      searchVolume: nullableNumber(row.search_volume),
    })];
  });
}

function relatedRows(result: Record<string, unknown>): RelatedTopicEvidence[] {
  if (!Array.isArray(result.items)) return [];
  return result.items.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    const nested = row.keyword_data;
    const data = nested && typeof nested === "object" && !Array.isArray(nested)
      ? nested as Record<string, unknown>
      : row;
    const keyword = typeof data.keyword === "string" ? data.keyword : null;
    if (!keyword) return [];
    const info = keywordData(data);
    return [Object.freeze({
      keyword,
      searchVolume: nullableNumber(info.search_volume),
      keywordDifficulty: nullableNumber(
        data.keyword_properties && typeof data.keyword_properties === "object"
          ? (data.keyword_properties as Record<string, unknown>).keyword_difficulty
          : null,
      ),
      cpcUsd: nullableNumber(info.cpc),
      paidCompetition: nullableNumber(info.competition),
      intent: normalizeIntent(
        data.search_intent_info && typeof data.search_intent_info === "object"
          ? (data.search_intent_info as Record<string, unknown>).main_intent
          : null,
      ),
    })];
  });
}

function rankingRows(result: Record<string, unknown>): RankingUrlEvidence[] {
  if (!Array.isArray(result.items)) return [];
  return result.items.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    const rankAbsolute = nullableInt(row.rank_absolute);
    const url = typeof row.url === "string" ? row.url : null;
    const domain = typeof row.domain === "string" ? row.domain : null;
    const type = typeof row.type === "string" ? row.type : "unknown";
    if (rankAbsolute == null || !url || !domain) return [];
    return [Object.freeze({
      rankAbsolute,
      rankGroup: nullableInt(row.rank_group),
      url,
      domain,
      title: typeof row.title === "string" ? row.title : null,
      resultType: type,
      isOrganic: type === "organic",
    })];
  });
}

function serpFeatures(result: Record<string, unknown>): string[] {
  if (!Array.isArray(result.items)) return [];
  return [...new Set(result.items.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const type = (entry as Record<string, unknown>).type;
    return typeof type === "string" && type !== "organic" ? [type] : [];
  }))].sort();
}

export function normalizeDataForSeoKeywordSerpFixtures(input: {
  request: KeywordSerpEvidenceRequest;
  keywordOverview: ProviderEnvelope;
  relatedKeywords: ProviderEnvelope;
  serpAdvanced: ProviderEnvelope;
}): KeywordSerpEvidenceBundle {
  const overviewTask = exactTask(input.keywordOverview, "keyword_overview");
  const relatedTask = exactTask(input.relatedKeywords, "related_keywords");
  const serpTask = exactTask(input.serpAdvanced, "serp_advanced");

  const overviewResult = firstResult(overviewTask, "keyword_overview");
  const related = firstResult(relatedTask, "related_keywords");
  const serp = firstResult(serpTask, "serp_advanced");
  const overview = keywordOverviewRow(overviewResult, input.request.keyword);

  const info = keywordData(overview);
  const keywordDifficulty = nullableNumber(
    overview.keyword_properties && typeof overview.keyword_properties === "object"
      ? (overview.keyword_properties as Record<string, unknown>).keyword_difficulty
      : null,
  );
  const intent = normalizeIntent(
    overview.search_intent_info && typeof overview.search_intent_info === "object"
      ? (overview.search_intent_info as Record<string, unknown>).main_intent
      : null,
  );

  const bundle = finalizeKeywordSerpEvidenceBundle({
    keyword: Object.freeze({
      keyword: input.request.keyword,
      market: input.request.market,
      searchVolume: nullableNumber(info.search_volume),
      keywordDifficulty,
      cpcUsd: nullableNumber(info.cpc),
      paidCompetition: nullableNumber(info.competition),
      paidCompetitionLevel: normalizeCompetitionLevel(info.competition_level),
      intent,
      monthlySearches: Object.freeze(monthlySearches(info)),
    }),
    relatedTopics: Object.freeze(relatedRows(related)),
    serp: Object.freeze({
      keyword: input.request.keyword,
      market: input.request.market,
      features: Object.freeze(serpFeatures(serp)),
      rankingUrls: Object.freeze(rankingRows(serp)),
    }),
    provenance: Object.freeze([
      provenance(overviewTask, "keyword_overview", input.keywordOverview),
      provenance(relatedTask, "related_keywords", input.relatedKeywords),
      provenance(serpTask, "serp_advanced", input.serpAdvanced),
    ]),
  });

  assertKeywordSerpEvidenceSafety(bundle);
  return bundle;
}
