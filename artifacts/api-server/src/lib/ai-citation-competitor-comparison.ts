import { createHash } from "node:crypto";
import {
  P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION,
  buildAiAnswerVisibilityCollection,
  type AiAnswerObservationRecord,
  type AiAnswerVisibilityCollectionInput,
  type AiAnswerVisibilityCollectionReport,
  type AiTrackedBrandRecord,
} from "./ai-answer-visibility-collection.js";

export const P7_4_AI_CITATION_COMPETITOR_COMPARISON_VERSION =
  "p7.4-ai-citation-competitor-comparison-v1" as const;

export const P7_4_MAX_COMPARISON_GROUPS = 128 as const;
export const P7_4_MAX_COMPETITORS_PER_GROUP = 64 as const;

export type AiCompetitorComparisonInput = {
  comparisonKey: string;
  subjectBrandKey: string;
  competitorBrandKeys: string[];
};

export type AiCitationCompetitorComparisonInput = {
  collectionInput: AiAnswerVisibilityCollectionInput;
  collection: AiAnswerVisibilityCollectionReport;
  comparisons: AiCompetitorComparisonInput[];
};

export type AiCitationDomainSummary = {
  domainSummaryId: string;
  domainSummaryFingerprint: string;
  domain: string;
  citationCount: number;
  observationCount: number;
  citationFingerprints: string[];
  observationKeys: string[];
  providerKeys: string[];
  promptKeys: string[];
  topicKeys: string[];
};

export type AiBrandComparisonReference = {
  brandKey: string;
  brandFingerprint: string;
  label: string;
};

export type AiCompetitorPairComparison = {
  pairId: string;
  pairFingerprint: string;
  comparisonKey: string;
  subject: AiBrandComparisonReference;
  competitor: AiBrandComparisonReference;
  mentionEvidence: {
    subjectObservationKeys: string[];
    competitorObservationKeys: string[];
    bothObservationKeys: string[];
    subjectEvidenceOnlyObservationKeys: string[];
    competitorEvidenceOnlyObservationKeys: string[];
    counts: {
      subject: number;
      competitor: number;
      both: number;
      subjectEvidenceOnly: number;
      competitorEvidenceOnly: number;
    };
  };
  citationDomainCooccurrence: {
    subjectDomains: string[];
    competitorDomains: string[];
    sharedDomains: string[];
    subjectSideOnlyDomains: string[];
    competitorSideOnlyDomains: string[];
    counts: {
      subject: number;
      competitor: number;
      shared: number;
      subjectSideOnly: number;
      competitorSideOnly: number;
    };
  };
};

export type AiCompetitorComparisonGroup = {
  comparisonId: string;
  comparisonFingerprint: string;
  comparisonKey: string;
  subject: AiBrandComparisonReference;
  competitors: AiBrandComparisonReference[];
  pairFingerprints: string[];
  pairs: AiCompetitorPairComparison[];
};

export type AiCitationCompetitorComparisonReport = {
  version: typeof P7_4_AI_CITATION_COMPETITOR_COMPARISON_VERSION;
  reportId: string;
  reportFingerprint: string;
  siteKey: string;
  promptModelReferenceTime: string;
  collectionReferenceTime: string;
  collectionReportFingerprint: string;
  counts: {
    domains: number;
    comparisonGroups: number;
    comparisonPairs: number;
  };
  domains: AiCitationDomainSummary[];
  comparisons: AiCompetitorComparisonGroup[];
  semantics: ReturnType<typeof aiCitationCompetitorComparisonSemantics>;
  safety: ReturnType<typeof aiCitationCompetitorComparisonCapability>;
};

const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

function canonicalJson(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeKey(value: unknown, errorCode: string): string {
  if (typeof value !== "string") throw new Error(errorCode);
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!KEY.test(normalized)) throw new Error(errorCode);
  return normalized;
}

function canonicalCollection(
  input: AiAnswerVisibilityCollectionInput,
  supplied: AiAnswerVisibilityCollectionReport,
): AiAnswerVisibilityCollectionReport {
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new Error("invalid_p73_collection_report");
  }
  if (supplied.version !== P7_3_AI_ANSWER_VISIBILITY_COLLECTION_VERSION) {
    throw new Error("unsupported_p73_collection_version");
  }
  const rebuilt = buildAiAnswerVisibilityCollection(input);
  if (canonicalJson(rebuilt) !== canonicalJson(supplied)) {
    throw new Error("p73_collection_integrity_mismatch");
  }
  return rebuilt;
}

function brandReference(brand: AiTrackedBrandRecord): AiBrandComparisonReference {
  return {
    brandKey: brand.brandKey,
    brandFingerprint: brand.brandFingerprint,
    label: brand.label,
  };
}

function intersect(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function difference(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function mentionedObservations(
  observations: AiAnswerObservationRecord[],
  brandKey: string,
): AiAnswerObservationRecord[] {
  return observations.filter((observation) => observation.mentionedBrandKeys.includes(brandKey));
}

function observationKeys(observations: AiAnswerObservationRecord[]): string[] {
  return uniqueSorted(observations.map((observation) => observation.observationKey));
}

function domainsFromObservations(observations: AiAnswerObservationRecord[]): string[] {
  return uniqueSorted(observations.flatMap((observation) => observation.citationDomains));
}

function buildDomainSummaries(
  observations: AiAnswerObservationRecord[],
): AiCitationDomainSummary[] {
  const accumulators = new Map<
    string,
    {
      citationCount: number;
      citationFingerprints: Set<string>;
      observationKeys: Set<string>;
      providerKeys: Set<string>;
      promptKeys: Set<string>;
      topicKeys: Set<string>;
    }
  >();

  for (const observation of observations) {
    for (const citation of observation.citations) {
      const current = accumulators.get(citation.domain) ?? {
        citationCount: 0,
        citationFingerprints: new Set<string>(),
        observationKeys: new Set<string>(),
        providerKeys: new Set<string>(),
        promptKeys: new Set<string>(),
        topicKeys: new Set<string>(),
      };
      current.citationCount += 1;
      current.citationFingerprints.add(citation.citationFingerprint);
      current.observationKeys.add(observation.observationKey);
      current.providerKeys.add(observation.providerKey);
      current.promptKeys.add(observation.promptKey);
      for (const topicKey of observation.topicKeys) current.topicKeys.add(topicKey);
      accumulators.set(citation.domain, current);
    }
  }

  return [...accumulators.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, current]) => {
      const citationFingerprints = uniqueSorted(current.citationFingerprints);
      const observationKeys = uniqueSorted(current.observationKeys);
      const providerKeys = uniqueSorted(current.providerKeys);
      const promptKeys = uniqueSorted(current.promptKeys);
      const topicKeys = uniqueSorted(current.topicKeys);
      const identity = {
        version: P7_4_AI_CITATION_COMPETITOR_COMPARISON_VERSION,
        domain,
        citationCount: current.citationCount,
        observationCount: observationKeys.length,
        citationFingerprints,
        observationKeys,
        providerKeys,
        promptKeys,
        topicKeys,
      };
      const domainSummaryFingerprint = hash(identity);
      return {
        domainSummaryId: `p74-domain-${domainSummaryFingerprint.slice(0, 20)}`,
        domainSummaryFingerprint,
        domain,
        citationCount: current.citationCount,
        observationCount: observationKeys.length,
        citationFingerprints,
        observationKeys,
        providerKeys,
        promptKeys,
        topicKeys,
      };
    });
}

function buildPair(
  comparisonKey: string,
  subjectBrand: AiTrackedBrandRecord,
  competitorBrand: AiTrackedBrandRecord,
  observations: AiAnswerObservationRecord[],
): AiCompetitorPairComparison {
  const subjectObservations = mentionedObservations(observations, subjectBrand.brandKey);
  const competitorObservations = mentionedObservations(observations, competitorBrand.brandKey);
  const subjectObservationKeys = observationKeys(subjectObservations);
  const competitorObservationKeys = observationKeys(competitorObservations);
  const bothObservationKeys = intersect(subjectObservationKeys, competitorObservationKeys);
  const subjectEvidenceOnlyObservationKeys = difference(
    subjectObservationKeys,
    competitorObservationKeys,
  );
  const competitorEvidenceOnlyObservationKeys = difference(
    competitorObservationKeys,
    subjectObservationKeys,
  );

  const subjectDomains = domainsFromObservations(subjectObservations);
  const competitorDomains = domainsFromObservations(competitorObservations);
  const sharedDomains = intersect(subjectDomains, competitorDomains);
  const subjectSideOnlyDomains = difference(subjectDomains, competitorDomains);
  const competitorSideOnlyDomains = difference(competitorDomains, subjectDomains);

  const mentionEvidence = {
    subjectObservationKeys,
    competitorObservationKeys,
    bothObservationKeys,
    subjectEvidenceOnlyObservationKeys,
    competitorEvidenceOnlyObservationKeys,
    counts: {
      subject: subjectObservationKeys.length,
      competitor: competitorObservationKeys.length,
      both: bothObservationKeys.length,
      subjectEvidenceOnly: subjectEvidenceOnlyObservationKeys.length,
      competitorEvidenceOnly: competitorEvidenceOnlyObservationKeys.length,
    },
  };
  const citationDomainCooccurrence = {
    subjectDomains,
    competitorDomains,
    sharedDomains,
    subjectSideOnlyDomains,
    competitorSideOnlyDomains,
    counts: {
      subject: subjectDomains.length,
      competitor: competitorDomains.length,
      shared: sharedDomains.length,
      subjectSideOnly: subjectSideOnlyDomains.length,
      competitorSideOnly: competitorSideOnlyDomains.length,
    },
  };
  const subject = brandReference(subjectBrand);
  const competitor = brandReference(competitorBrand);
  const identity = {
    version: P7_4_AI_CITATION_COMPETITOR_COMPARISON_VERSION,
    comparisonKey,
    subject,
    competitor,
    mentionEvidence,
    citationDomainCooccurrence,
  };
  const pairFingerprint = hash(identity);

  return {
    pairId: `p74-pair-${pairFingerprint.slice(0, 20)}`,
    pairFingerprint,
    comparisonKey,
    subject,
    competitor,
    mentionEvidence,
    citationDomainCooccurrence,
  };
}

function normalizeComparisons(
  input: AiCompetitorComparisonInput[],
  collection: AiAnswerVisibilityCollectionReport,
): Array<{
  comparisonKey: string;
  subjectBrand: AiTrackedBrandRecord;
  competitorBrands: AiTrackedBrandRecord[];
}> {
  if (!Array.isArray(input) || input.length < 1) {
    throw new Error("invalid_ai_competitor_comparisons");
  }
  if (input.length > P7_4_MAX_COMPARISON_GROUPS) {
    throw new Error("ai_competitor_comparison_limit_exceeded");
  }

  const brands = new Map(collection.brands.map((brand) => [brand.brandKey, brand]));
  const seenComparisonKeys = new Set<string>();
  const normalized = input.map((comparison) => {
    if (!comparison || typeof comparison !== "object" || Array.isArray(comparison)) {
      throw new Error("invalid_ai_competitor_comparison");
    }
    const comparisonKey = normalizeKey(
      comparison.comparisonKey,
      "invalid_ai_competitor_comparison_key",
    );
    if (seenComparisonKeys.has(comparisonKey)) {
      throw new Error("duplicate_ai_competitor_comparison_key");
    }
    seenComparisonKeys.add(comparisonKey);

    const subjectBrandKey = normalizeKey(
      comparison.subjectBrandKey,
      "invalid_ai_competitor_subject_brand_key",
    );
    const subjectBrand = brands.get(subjectBrandKey);
    if (!subjectBrand) throw new Error("unknown_ai_competitor_subject_brand");

    if (!Array.isArray(comparison.competitorBrandKeys) || comparison.competitorBrandKeys.length < 1) {
      throw new Error("invalid_ai_competitor_brand_keys");
    }
    if (comparison.competitorBrandKeys.length > P7_4_MAX_COMPETITORS_PER_GROUP) {
      throw new Error("ai_competitor_brand_limit_exceeded");
    }
    const competitorBrandKeys = uniqueSorted(
      comparison.competitorBrandKeys.map((value) =>
        normalizeKey(value, "invalid_ai_competitor_brand_key")),
    );
    if (competitorBrandKeys.includes(subjectBrandKey)) {
      throw new Error("ai_competitor_self_comparison");
    }
    const competitorBrands = competitorBrandKeys.map((brandKey) => {
      const brand = brands.get(brandKey);
      if (!brand) throw new Error("unknown_ai_competitor_brand");
      return brand;
    });

    return {
      comparisonKey,
      subjectBrand,
      competitorBrands,
    };
  });

  return normalized.sort((a, b) => a.comparisonKey.localeCompare(b.comparisonKey));
}

function buildComparisonGroups(
  normalized: ReturnType<typeof normalizeComparisons>,
  observations: AiAnswerObservationRecord[],
): AiCompetitorComparisonGroup[] {
  return normalized.map((comparison) => {
    const pairs = comparison.competitorBrands.map((competitorBrand) =>
      buildPair(
        comparison.comparisonKey,
        comparison.subjectBrand,
        competitorBrand,
        observations,
      ),
    );
    const competitors = comparison.competitorBrands.map((brand) => brandReference(brand));
    const subject = brandReference(comparison.subjectBrand);
    const pairFingerprints = pairs.map((pair) => pair.pairFingerprint);
    const identity = {
      version: P7_4_AI_CITATION_COMPETITOR_COMPARISON_VERSION,
      comparisonKey: comparison.comparisonKey,
      subject,
      competitors,
      pairFingerprints,
    };
    const comparisonFingerprint = hash(identity);

    return {
      comparisonId: `p74-comparison-${comparisonFingerprint.slice(0, 20)}`,
      comparisonFingerprint,
      comparisonKey: comparison.comparisonKey,
      subject,
      competitors,
      pairFingerprints,
      pairs,
    };
  });
}

export function aiCitationCompetitorComparisonSemantics() {
  return Object.freeze({
    exactP73LineageRequired: true,
    suppliedObservationEvidenceOnly: true,
    competitorGroupsCallerSuppliedOnly: true,
    competitorIdentityInferred: false,
    answerTextMiningPerformed: false,
    citationFetchPerformed: false,
    citationDomainCooccurrenceDescriptiveOnly: true,
    citationDomainCooccurrenceImpliesBrandSupport: false,
    citationDomainCooccurrenceImpliesEndorsement: false,
    citationDomainCooccurrenceImpliesAssociation: false,
    missingMentionEvidenceImpliesBrandAbsent: false,
    evidenceOnlySetMeansSemanticAbsence: false,
    mentionCountImpliesVisibility: false,
    citationCountImpliesVisibility: false,
    domainCountImpliesVisibility: false,
    comparisonImpliesPreference: false,
    comparisonImpliesQuality: false,
    comparisonImpliesAuthority: false,
    comparisonImpliesMarketShare: false,
    crossProviderNormalizedComparisonPerformed: false,
    winnerSelected: false,
    rankingGenerated: false,
    visibilityScored: false,
    visibilityHistoryGenerated: false,
    opportunityGenerated: false,
  });
}

export function aiCitationCompetitorComparisonCapability() {
  return Object.freeze({
    deterministicComparisonOnly: true,
    liveProviderRequestsAuthorized: false,
    providerCredentialUseAuthorized: false,
    aiModelCallsAuthorized: false,
    citationFetchAuthorized: false,
    answerTextMiningAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    comparisonPersistenceAuthorized: false,
    domainPersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    workerEnabled: false,
    retryLoopEnabled: false,
    scoringAuthorized: false,
    approvalGrantAuthorized: false,
    applyAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransitionEnabled: false,
    publicationAuthorized: false,
  });
}

export function buildAiCitationCompetitorComparison(
  input: AiCitationCompetitorComparisonInput,
): AiCitationCompetitorComparisonReport {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_ai_citation_competitor_comparison_input");
  }
  if (
    !input.collectionInput ||
    typeof input.collectionInput !== "object" ||
    Array.isArray(input.collectionInput)
  ) {
    throw new Error("invalid_ai_citation_competitor_collection_input");
  }

  const collection = canonicalCollection(input.collectionInput, input.collection);
  const normalizedComparisons = normalizeComparisons(input.comparisons, collection);
  const domains = buildDomainSummaries(collection.observations);
  const comparisons = buildComparisonGroups(
    normalizedComparisons,
    collection.observations,
  );
  const counts = {
    domains: domains.length,
    comparisonGroups: comparisons.length,
    comparisonPairs: comparisons.reduce((sum, comparison) => sum + comparison.pairs.length, 0),
  };
  const semantics = aiCitationCompetitorComparisonSemantics();
  const identity = {
    version: P7_4_AI_CITATION_COMPETITOR_COMPARISON_VERSION,
    siteKey: collection.siteKey,
    promptModelReferenceTime: collection.promptModelReferenceTime,
    collectionReferenceTime: collection.collectionReferenceTime,
    collectionReportFingerprint: collection.reportFingerprint,
    counts,
    domains,
    comparisons,
    semantics,
  };
  const reportFingerprint = hash(identity);

  return {
    version: P7_4_AI_CITATION_COMPETITOR_COMPARISON_VERSION,
    reportId: `p74-report-${reportFingerprint.slice(0, 20)}`,
    reportFingerprint,
    siteKey: collection.siteKey,
    promptModelReferenceTime: collection.promptModelReferenceTime,
    collectionReferenceTime: collection.collectionReferenceTime,
    collectionReportFingerprint: collection.reportFingerprint,
    counts,
    domains,
    comparisons,
    semantics,
    safety: aiCitationCompetitorComparisonCapability(),
  };
}
