import {
  stableEvidenceHash,
} from "./keyword-serp-evidence-contract.js";
import {
  buildSemanticSimilarityEvidence,
  UGP_TOPIC_CLUSTERING_POLICY,
  type SemanticSimilarityEvidence,
  type TopicClusteringCandidate,
} from "./topic-clustering-contract.js";

export const UGP_SEMANTIC_SIMILARITY_ADAPTER_VERSION =
  "ugp-6-2b-bounded-semantic-similarity-adapter-v1" as const;

export const UGP_SEMANTIC_SIMILARITY_POLICY = Object.freeze({
  maxCandidates: UGP_TOPIC_CLUSTERING_POLICY.maxCandidates,
  maxDocumentsPerBatch: UGP_TOPIC_CLUSTERING_POLICY.maxCandidates,
  maxDocumentChars: 2048,
  minVectorDimensions: 8,
  maxVectorDimensions: 8192,
  maxEncoderCalls: 1,
  maxConcurrency: 1,
  automaticRetry: false as const,
});

export type SemanticDocument = Readonly<{
  evidenceFingerprint: string;
  keyword: string;
  text: string;
  documentFingerprint: string;
}>;

export type SemanticEmbeddingBatch = Readonly<{
  modelId: string;
  vectors: readonly (readonly number[])[];
}>;

export type SemanticEmbeddingEncoder = (
  input: Readonly<{
    modelId: string;
    documents: readonly SemanticDocument[];
  }>,
) => Promise<SemanticEmbeddingBatch>;

export type SemanticSimilarityMatrix = Readonly<{
  version: typeof UGP_SEMANTIC_SIMILARITY_ADAPTER_VERSION;
  modelId: string;
  documents: readonly SemanticDocument[];
  similarities: readonly SemanticSimilarityEvidence[];
  assertions: Readonly<{
    readOnly: true;
    deterministicPostProcessing: true;
    grantsAuthorization: false;
    grantsProviderWrite: false;
    grantsPublicSiteWrite: false;
    performsPersistence: false;
    encoderCalls: 1;
    maxConcurrency: 1;
    automaticRetry: false;
  }>;
  matrixFingerprint: string;
}>;

const ASSERTIONS = Object.freeze({
  readOnly: true as const,
  deterministicPostProcessing: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsPersistence: false as const,
  encoderCalls: 1 as const,
  maxConcurrency: 1 as const,
  automaticRetry: false as const,
});

function exactToken(value: unknown, field: string, max = 512): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_semantic_adapter_invalid_" + field);
  }
  return value;
}

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("ugp_semantic_adapter_invalid_" + field);
  }
  return value;
}

function normalizedContext(values: readonly string[], field: string): readonly string[] {
  if (!Array.isArray(values)) {
    throw new Error("ugp_semantic_adapter_invalid_" + field);
  }
  return Object.freeze([
    ...new Set(values.map((value) =>
      exactToken(value, field + "_value").toLocaleLowerCase("en-US"),
    )),
  ].sort());
}

function candidateOrder(
  left: TopicClusteringCandidate,
  right: TopicClusteringCandidate,
): number {
  const keyword = left.evidence.keyword.keyword.localeCompare(
    right.evidence.keyword.keyword,
  );
  if (keyword !== 0) return keyword;
  return left.evidence.evidenceFingerprint.localeCompare(
    right.evidence.evidenceFingerprint,
  );
}

function buildDocument(candidate: TopicClusteringCandidate): SemanticDocument {
  const evidenceFingerprint = exactFingerprint(
    candidate.evidence.evidenceFingerprint,
    "evidence_fingerprint",
  );
  const keyword = exactToken(
    candidate.evidence.keyword.keyword,
    "keyword",
  );
  const categories = normalizedContext(candidate.context.categories, "categories");
  const entities = normalizedContext(candidate.context.entities, "entities");

  const parts = [
    "keyword: " + keyword,
    candidate.evidence.keyword.intent === "unknown"
      ? null
      : "intent: " + candidate.evidence.keyword.intent,
    categories.length > 0 ? "categories: " + categories.join(", ") : null,
    entities.length > 0 ? "entities: " + entities.join(", ") : null,
  ].filter((value): value is string => value != null);

  const text = parts.join("\n");
  if (text.length > UGP_SEMANTIC_SIMILARITY_POLICY.maxDocumentChars) {
    throw new Error("ugp_semantic_adapter_document_too_large");
  }

  const base = { evidenceFingerprint, keyword, text };
  return Object.freeze({
    ...base,
    documentFingerprint: stableEvidenceHash({
      purpose: "ugp_semantic_similarity_document",
      version: UGP_SEMANTIC_SIMILARITY_ADAPTER_VERSION,
      ...base,
    }),
  });
}

export function buildSemanticDocuments(
  candidates: readonly TopicClusteringCandidate[],
): readonly SemanticDocument[] {
  if (
    !Array.isArray(candidates)
    || candidates.length < 2
    || candidates.length > UGP_SEMANTIC_SIMILARITY_POLICY.maxCandidates
  ) {
    throw new Error("ugp_semantic_adapter_invalid_candidate_count");
  }

  const ordered = [...candidates].sort(candidateOrder);
  const fingerprints = new Set<string>();
  const keywords = new Set<string>();

  const documents = ordered.map((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error("ugp_semantic_adapter_invalid_candidate");
    }
    const document = buildDocument(candidate);
    if (fingerprints.has(document.evidenceFingerprint)) {
      throw new Error("ugp_semantic_adapter_duplicate_evidence");
    }
    fingerprints.add(document.evidenceFingerprint);

    const keywordKey = document.keyword.toLocaleLowerCase("en-US");
    if (keywords.has(keywordKey)) {
      throw new Error("ugp_semantic_adapter_duplicate_keyword");
    }
    keywords.add(keywordKey);
    return document;
  });

  return Object.freeze(documents);
}

function exactVector(
  value: readonly number[],
  expectedDimensions: number | null,
): readonly number[] {
  if (!Array.isArray(value)) {
    throw new Error("ugp_semantic_adapter_invalid_vector");
  }
  if (
    value.length < UGP_SEMANTIC_SIMILARITY_POLICY.minVectorDimensions
    || value.length > UGP_SEMANTIC_SIMILARITY_POLICY.maxVectorDimensions
  ) {
    throw new Error("ugp_semantic_adapter_invalid_vector_dimensions");
  }
  if (expectedDimensions != null && value.length !== expectedDimensions) {
    throw new Error("ugp_semantic_adapter_vector_dimension_drift");
  }
  let normSquared = 0;
  for (const component of value) {
    if (typeof component !== "number" || !Number.isFinite(component)) {
      throw new Error("ugp_semantic_adapter_non_finite_vector");
    }
    normSquared += component * component;
  }
  if (!Number.isFinite(normSquared) || normSquared <= 0) {
    throw new Error("ugp_semantic_adapter_zero_vector");
  }
  return Object.freeze([...value]);
}

function cosine(left: readonly number[], right: readonly number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  const value = dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
  if (!Number.isFinite(value)) {
    throw new Error("ugp_semantic_adapter_invalid_cosine");
  }
  const bounded = Math.min(1, Math.max(-1, value));
  return Math.round(((bounded + 1) / 2) * 1_000_000) / 1_000_000;
}

export async function buildBoundedSemanticSimilarityMatrix(input: {
  candidates: readonly TopicClusteringCandidate[];
  modelId: string;
  encoder: SemanticEmbeddingEncoder;
}): Promise<SemanticSimilarityMatrix> {
  const modelId = exactToken(input.modelId, "model_id");
  if (typeof input.encoder !== "function") {
    throw new Error("ugp_semantic_adapter_invalid_encoder");
  }

  const documents = buildSemanticDocuments(input.candidates);
  if (documents.length > UGP_SEMANTIC_SIMILARITY_POLICY.maxDocumentsPerBatch) {
    throw new Error("ugp_semantic_adapter_batch_too_large");
  }

  let encoded: SemanticEmbeddingBatch;
  try {
    encoded = await input.encoder({ modelId, documents });
  } catch {
    throw new Error("ugp_semantic_adapter_encoder_failed");
  }

  if (!encoded || typeof encoded !== "object" || Array.isArray(encoded)) {
    throw new Error("ugp_semantic_adapter_invalid_encoder_response");
  }
  if (encoded.modelId !== modelId) {
    throw new Error("ugp_semantic_adapter_model_drift");
  }
  if (!Array.isArray(encoded.vectors) || encoded.vectors.length !== documents.length) {
    throw new Error("ugp_semantic_adapter_vector_count_mismatch");
  }

  const vectors: readonly (readonly number[])[] = [];
  let dimensions: number | null = null;
  const mutableVectors: (readonly number[])[] = [];
  for (const vector of encoded.vectors) {
    const checked = exactVector(vector, dimensions);
    dimensions ??= checked.length;
    mutableVectors.push(checked);
  }
  const frozenVectors = Object.freeze(mutableVectors);

  const similarities: SemanticSimilarityEvidence[] = [];
  for (let left = 0; left < documents.length; left += 1) {
    for (let right = left + 1; right < documents.length; right += 1) {
      similarities.push(buildSemanticSimilarityEvidence({
        leftEvidenceFingerprint: documents[left].evidenceFingerprint,
        rightEvidenceFingerprint: documents[right].evidenceFingerprint,
        similarity: cosine(frozenVectors[left], frozenVectors[right]),
        modelId,
      }));
    }
  }

  const base = {
    version: UGP_SEMANTIC_SIMILARITY_ADAPTER_VERSION,
    modelId,
    documents,
    similarities: Object.freeze(similarities),
    assertions: ASSERTIONS,
  };

  return Object.freeze({
    ...base,
    matrixFingerprint: stableEvidenceHash({
      purpose: "ugp_semantic_similarity_matrix",
      ...base,
    }),
  });
}
