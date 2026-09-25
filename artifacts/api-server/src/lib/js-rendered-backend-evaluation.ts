import { createHash } from "node:crypto";
import {
  assertUniversalReadOnlySiteAnalysisIntegrity,
  type UniversalReadOnlySiteAnalysis,
} from "./universal-read-only-site-analysis.js";

export const UGP_JS_RENDERED_BACKEND_EVALUATION_VERSION =
  "ugp-3-4-js-rendered-backend-evaluation-v1" as const;

export const UGP_JS_RENDERED_EVALUATION_LIMITS = Object.freeze({
  maxGapEvidence: 1_000,
  maxUrlLength: 2_048,
} as const);

export type RenderGapDimension =
  | "metadata"
  | "canonical"
  | "structured_data"
  | "internal_links"
  | "content"
  | "images";

export type RenderGapSignal =
  | "framework_hydration_marker"
  | "client_rendered_metadata_marker"
  | "client_rendered_canonical_marker"
  | "client_rendered_structured_data_marker"
  | "client_rendered_links_marker"
  | "client_rendered_content_marker"
  | "client_rendered_images_marker";

export type RenderGapEvidenceStrength = "weak" | "moderate" | "strong";

export type SuppliedRenderGapEvidence = Readonly<{
  pageUrl: string;
  dimension: RenderGapDimension | null;
  signal: RenderGapSignal;
  strength: RenderGapEvidenceStrength;
  sourceFingerprint: string;
}>;

export type NormalizedRenderGapEvidence = SuppliedRenderGapEvidence & Readonly<{
  qualifies: boolean;
  disposition:
    | "qualifying_render_gap"
    | "generic_framework_context_only"
    | "evidence_not_strong_enough"
    | "static_dimension_already_observed"
    | "page_not_successfully_fetched";
  evidenceFingerprint: string;
}>;

export type JsRenderedBackendEvaluationAuthorization = Readonly<{
  browserExecutionAuthorized: false;
  networkReadAuthorized: false;
  crawlExecutionAuthorized: false;
  persistenceAuthorized: false;
  rendererRuntimeBindingAuthorized: false;
  newQueueAuthorized: false;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
}>;

export type JsRenderedBackendEvaluation = Readonly<{
  version: typeof UGP_JS_RENDERED_BACKEND_EVALUATION_VERSION;
  source: Readonly<{
    universalAnalysisVersion: UniversalReadOnlySiteAnalysis["version"];
    universalAnalysisFingerprint: string;
    canonicalOrigin: string;
    observationMode: "supplied_render_gap_evidence";
  }>;
  renderNeed: Readonly<{
    state: "not_indicated" | "insufficient_evidence" | "render_candidate";
    staticFetchRemainsDefault: true;
    frameworkHeuristicAloneAccepted: false;
    qualifyingEvidence: number;
    nonQualifyingEvidence: number;
    candidatePages: readonly string[];
    dimensions: readonly RenderGapDimension[];
  }>;
  evidence: readonly NormalizedRenderGapEvidence[];
  backendEvaluation: Readonly<{
    secureStaticFetch: Readonly<{
      disposition: "default";
      jsExecution: false;
      preservesExistingPinnedDnsSsrfBoundary: true;
    }>;
    directPlaywright: Readonly<{
      disposition: "standby" | "conditional_candidate";
      productionEligible: false;
      repositoryAvailability: "ui_test_tooling_only";
      requestInterceptionCapability: "available_but_not_ssrf_equivalent";
      executionPlaneOwnership: "must_remain_existing_crawl_plane";
      blockers: readonly string[];
    }>;
    crawleePlaywright: Readonly<{
      disposition: "not_selected_as_execution_plane";
      productionEligible: false;
      repositoryAvailability: "not_installed";
      reasons: readonly string[];
    }>;
  }>;
  requiredControls: Readonly<{
    browserContext: Readonly<{
      serviceWorkers: "block";
      requestInterceptionBeforeNavigation: true;
      persistentProfile: false;
      downloads: "deny";
      permissions: "deny";
      harRecording: false;
      videoRecording: false;
    }>;
    network: Readonly<{
      httpsOnly: true;
      credentialBearingUrls: "deny";
      browserEgressPublicAddressValidation: "required_per_request";
      dnsRebindingMitigation: "must_be_equivalent_to_existing_secure_transport";
      connectionAddressPinningOrEquivalentIsolation: "required";
      topLevelNavigationScope: "same_origin_only";
      nonGetHeadRequests: "abort";
      crossOriginSubresources: "deny_until_browser_egress_certified";
      redirectRevalidation: "required_each_hop";
    }>;
    crawlPlane: Readonly<{
      newRequestQueue: false;
      crawleeStoragePlane: false;
      adaptiveAutoscaling: false;
      existingPageFuseAuthoritative: true;
      existingCheckpointAuthoritative: true;
      existingRetryPolicyAuthoritative: true;
      existingRateLimitAuthoritative: true;
    }>;
    data: Readonly<{
      responseBodyPersistence: false;
      screenshotPersistence: false;
      browserStoragePersistence: false;
      renderedObservationOnly: true;
    }>;
  }>;
  activation: Readonly<{
    decision:
      | "not_required"
      | "not_authorized_insufficient_evidence"
      | "blocked_pending_renderer_safety_certification";
    futureCandidate: "direct_playwright" | null;
    blockers: readonly string[];
    authorization: JsRenderedBackendEvaluationAuthorization;
  }>;
  evaluationFingerprint: string;
}>;

const HEX_64 = /^[0-9a-f]{64}$/;

const SPECIFIC_SIGNAL_DIMENSION: Readonly<
  Partial<Record<RenderGapSignal, RenderGapDimension>>
> = Object.freeze({
  client_rendered_metadata_marker: "metadata",
  client_rendered_canonical_marker: "canonical",
  client_rendered_structured_data_marker: "structured_data",
  client_rendered_links_marker: "internal_links",
  client_rendered_content_marker: "content",
  client_rendered_images_marker: "images",
});

const RENDER_DIMENSION_ORDER: readonly RenderGapDimension[] = Object.freeze([
  "metadata",
  "canonical",
  "structured_data",
  "internal_links",
  "content",
  "images",
]);

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function authorizationBoundary(): JsRenderedBackendEvaluationAuthorization {
  return {
    browserExecutionAuthorized: false,
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    rendererRuntimeBindingAuthorized: false,
    newQueueAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

function requireFingerprint(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error(code);
  return value;
}

function normalizeExactPageUrl(
  value: unknown,
  analysis: UniversalReadOnlySiteAnalysis,
): string {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > UGP_JS_RENDERED_EVALUATION_LIMITS.maxUrlLength
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_render_eval_page_url_invalid");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ugp_render_eval_page_url_invalid");
  }

  if (
    url.protocol !== "https:"
    || url.origin !== analysis.site.canonicalOrigin
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error("ugp_render_eval_page_url_invalid");
  }

  const normalized = url.toString();
  if (!analysis.pages.some((page) => page.url === normalized)) {
    throw new Error("ugp_render_eval_page_not_in_analysis");
  }
  return normalized;
}

function staticDimensionMissing(
  page: UniversalReadOnlySiteAnalysis["pages"][number],
  dimension: RenderGapDimension,
): boolean {
  if (page.outcome !== "success") return false;

  if (dimension === "metadata") {
    return (
      page.metadata.title === null
      || page.metadata.metaDescription === null
      || page.metadata.h1 === null
    );
  }
  if (dimension === "canonical") return page.canonical.state === "missing";
  if (dimension === "structured_data") return page.structuredData.types.length === 0;
  if (dimension === "internal_links") return page.internalLinks.length === 0;
  if (dimension === "content") return !page.content.available || page.content.wordCount === 0;
  return page.images.count === 0;
}

function evidenceDisposition(input: {
  evidence: SuppliedRenderGapEvidence;
  page: UniversalReadOnlySiteAnalysis["pages"][number];
}): Pick<NormalizedRenderGapEvidence, "qualifies" | "disposition"> {
  if (input.page.outcome !== "success") {
    return { qualifies: false, disposition: "page_not_successfully_fetched" };
  }

  if (input.evidence.signal === "framework_hydration_marker") {
    return { qualifies: false, disposition: "generic_framework_context_only" };
  }

  if (input.evidence.strength !== "strong") {
    return { qualifies: false, disposition: "evidence_not_strong_enough" };
  }

  if (!input.evidence.dimension
    || !staticDimensionMissing(input.page, input.evidence.dimension)) {
    return { qualifies: false, disposition: "static_dimension_already_observed" };
  }

  return { qualifies: true, disposition: "qualifying_render_gap" };
}

function normalizeEvidence(
  analysis: UniversalReadOnlySiteAnalysis,
  evidence: readonly SuppliedRenderGapEvidence[],
): readonly NormalizedRenderGapEvidence[] {
  if (
    !Array.isArray(evidence)
    || evidence.length > UGP_JS_RENDERED_EVALUATION_LIMITS.maxGapEvidence
  ) {
    throw new Error("ugp_render_eval_evidence_invalid");
  }

  const normalized: NormalizedRenderGapEvidence[] = [];
  const dedupe = new Set<string>();

  for (const item of evidence) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("ugp_render_eval_evidence_item_invalid");
    }

    const pageUrl = normalizeExactPageUrl(item.pageUrl, analysis);
    if (![
      "framework_hydration_marker",
      "client_rendered_metadata_marker",
      "client_rendered_canonical_marker",
      "client_rendered_structured_data_marker",
      "client_rendered_links_marker",
      "client_rendered_content_marker",
      "client_rendered_images_marker",
    ].includes(item.signal)) {
      throw new Error("ugp_render_eval_signal_invalid");
    }
    if (!["weak", "moderate", "strong"].includes(item.strength)) {
      throw new Error("ugp_render_eval_strength_invalid");
    }

    if (item.signal === "framework_hydration_marker") {
      if (item.dimension !== null) {
        throw new Error("ugp_render_eval_generic_signal_dimension_invalid");
      }
    } else {
      const requiredDimension = SPECIFIC_SIGNAL_DIMENSION[item.signal];
      if (item.dimension !== requiredDimension) {
        throw new Error("ugp_render_eval_signal_dimension_mismatch");
      }
    }

    const sourceFingerprint = requireFingerprint(
      item.sourceFingerprint,
      "ugp_render_eval_source_fingerprint_invalid",
    );
    const base: SuppliedRenderGapEvidence = {
      pageUrl,
      dimension: item.dimension,
      signal: item.signal,
      strength: item.strength,
      sourceFingerprint,
    };
    const key = stableJson(base);
    if (dedupe.has(key)) continue;
    dedupe.add(key);

    const page = analysis.pages.find((candidate) => candidate.url === pageUrl)!;
    const disposition = evidenceDisposition({ evidence: base, page });
    normalized.push({
      ...base,
      ...disposition,
      evidenceFingerprint: stableHash({
        purpose: "ugp_js_rendered_gap_evidence",
        ...base,
        ...disposition,
      }),
    });
  }

  return normalized.sort((left, right) =>
    left.pageUrl.localeCompare(right.pageUrl)
    || left.signal.localeCompare(right.signal)
    || left.strength.localeCompare(right.strength)
    || left.sourceFingerprint.localeCompare(right.sourceFingerprint)
  );
}

function renderNeed(
  evidence: readonly NormalizedRenderGapEvidence[],
): JsRenderedBackendEvaluation["renderNeed"] {
  const qualifying = evidence.filter((item) => item.qualifies);
  const candidatePages = [...new Set(qualifying.map((item) => item.pageUrl))]
    .sort((left, right) => left.localeCompare(right));
  const dimensions = RENDER_DIMENSION_ORDER.filter((dimension) =>
    qualifying.some((item) => item.dimension === dimension)
  );

  const state = qualifying.length > 0
    ? "render_candidate" as const
    : evidence.length > 0
      ? "insufficient_evidence" as const
      : "not_indicated" as const;

  return {
    state,
    staticFetchRemainsDefault: true,
    frameworkHeuristicAloneAccepted: false,
    qualifyingEvidence: qualifying.length,
    nonQualifyingEvidence: evidence.length - qualifying.length,
    candidatePages,
    dimensions,
  };
}

function backendEvaluation(
  need: JsRenderedBackendEvaluation["renderNeed"],
): JsRenderedBackendEvaluation["backendEvaluation"] {
  const directPlaywrightBlockers = Object.freeze([
    "browser_egress_ssrf_equivalence_uncertified",
    "browser_dns_rebinding_equivalence_uncertified",
    "browser_request_policy_not_runtime_certified",
    "renderer_runtime_not_implemented",
    "explicit_renderer_execution_authorization_absent",
  ]);

  return {
    secureStaticFetch: {
      disposition: "default",
      jsExecution: false,
      preservesExistingPinnedDnsSsrfBoundary: true,
    },
    directPlaywright: {
      disposition: need.state === "render_candidate"
        ? "conditional_candidate"
        : "standby",
      productionEligible: false,
      repositoryAvailability: "ui_test_tooling_only",
      requestInterceptionCapability: "available_but_not_ssrf_equivalent",
      executionPlaneOwnership: "must_remain_existing_crawl_plane",
      blockers: directPlaywrightBlockers,
    },
    crawleePlaywright: {
      disposition: "not_selected_as_execution_plane",
      productionEligible: false,
      repositoryAvailability: "not_installed",
      reasons: Object.freeze([
        "would_duplicate_existing_request_queue_ownership",
        "would_duplicate_existing_checkpoint_and_retry_state",
        "would_introduce_crawlee_storage_plane",
        "autoscaled_concurrency_conflicts_with_existing_crawl_policy_ownership",
        "direct_playwright_is_lower_level_if_a_renderer_is_later_certified",
      ]),
    },
  };
}

function requiredControls(): JsRenderedBackendEvaluation["requiredControls"] {
  return {
    browserContext: {
      serviceWorkers: "block",
      requestInterceptionBeforeNavigation: true,
      persistentProfile: false,
      downloads: "deny",
      permissions: "deny",
      harRecording: false,
      videoRecording: false,
    },
    network: {
      httpsOnly: true,
      credentialBearingUrls: "deny",
      browserEgressPublicAddressValidation: "required_per_request",
      dnsRebindingMitigation: "must_be_equivalent_to_existing_secure_transport",
      connectionAddressPinningOrEquivalentIsolation: "required",
      topLevelNavigationScope: "same_origin_only",
      nonGetHeadRequests: "abort",
      crossOriginSubresources: "deny_until_browser_egress_certified",
      redirectRevalidation: "required_each_hop",
    },
    crawlPlane: {
      newRequestQueue: false,
      crawleeStoragePlane: false,
      adaptiveAutoscaling: false,
      existingPageFuseAuthoritative: true,
      existingCheckpointAuthoritative: true,
      existingRetryPolicyAuthoritative: true,
      existingRateLimitAuthoritative: true,
    },
    data: {
      responseBodyPersistence: false,
      screenshotPersistence: false,
      browserStoragePersistence: false,
      renderedObservationOnly: true,
    },
  };
}

function activation(
  need: JsRenderedBackendEvaluation["renderNeed"],
): JsRenderedBackendEvaluation["activation"] {
  if (need.state === "not_indicated") {
    return {
      decision: "not_required",
      futureCandidate: null,
      blockers: Object.freeze([]),
      authorization: authorizationBoundary(),
    };
  }
  if (need.state === "insufficient_evidence") {
    return {
      decision: "not_authorized_insufficient_evidence",
      futureCandidate: null,
      blockers: Object.freeze(["render_need_not_established"]),
      authorization: authorizationBoundary(),
    };
  }
  return {
    decision: "blocked_pending_renderer_safety_certification",
    futureCandidate: "direct_playwright",
    blockers: Object.freeze([
      "browser_egress_ssrf_equivalence_uncertified",
      "browser_dns_rebinding_equivalence_uncertified",
      "browser_request_policy_not_runtime_certified",
      "renderer_runtime_not_implemented",
      "explicit_renderer_execution_authorization_absent",
    ]),
    authorization: authorizationBoundary(),
  };
}

export function evaluateJsRenderedExecutionBackend(input: {
  analysis: UniversalReadOnlySiteAnalysis;
  gapEvidence: readonly SuppliedRenderGapEvidence[];
}): JsRenderedBackendEvaluation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_render_eval_input_invalid");
  }

  assertUniversalReadOnlySiteAnalysisIntegrity(input.analysis);
  const evidence = normalizeEvidence(input.analysis, input.gapEvidence);
  const need = renderNeed(evidence);

  const base = {
    version: UGP_JS_RENDERED_BACKEND_EVALUATION_VERSION,
    source: {
      universalAnalysisVersion: input.analysis.version,
      universalAnalysisFingerprint: input.analysis.analysisFingerprint,
      canonicalOrigin: input.analysis.site.canonicalOrigin,
      observationMode: "supplied_render_gap_evidence" as const,
    },
    renderNeed: need,
    evidence,
    backendEvaluation: backendEvaluation(need),
    requiredControls: requiredControls(),
    activation: activation(need),
  };

  return deepFreeze({
    ...base,
    evaluationFingerprint: stableHash({
      purpose: "ugp_js_rendered_backend_evaluation",
      ...base,
    }),
  });
}

export function assertJsRenderedBackendEvaluationIntegrity(
  evaluation: JsRenderedBackendEvaluation,
): void {
  if (!evaluation || typeof evaluation !== "object" || Array.isArray(evaluation)) {
    throw new Error("ugp_render_eval_result_invalid");
  }
  if (evaluation.version !== UGP_JS_RENDERED_BACKEND_EVALUATION_VERSION) {
    throw new Error("ugp_render_eval_version_mismatch");
  }
  if (!HEX_64.test(evaluation.evaluationFingerprint)) {
    throw new Error("ugp_render_eval_fingerprint_invalid");
  }
  if (stableJson(evaluation.activation.authorization) !== stableJson(authorizationBoundary())) {
    throw new Error("ugp_render_eval_authority_open");
  }
  if (evaluation.backendEvaluation.secureStaticFetch.disposition !== "default") {
    throw new Error("ugp_render_eval_static_fetch_not_default");
  }
  if (evaluation.backendEvaluation.directPlaywright.productionEligible !== false) {
    throw new Error("ugp_render_eval_playwright_overclaim");
  }
  if (evaluation.backendEvaluation.crawleePlaywright.productionEligible !== false) {
    throw new Error("ugp_render_eval_crawlee_overclaim");
  }
  if (evaluation.backendEvaluation.crawleePlaywright.disposition
    !== "not_selected_as_execution_plane") {
    throw new Error("ugp_render_eval_crawlee_execution_plane_selected");
  }
  if (evaluation.renderNeed.frameworkHeuristicAloneAccepted !== false) {
    throw new Error("ugp_render_eval_framework_heuristic_overclaim");
  }

  for (const evidence of evaluation.evidence) {
    if (!HEX_64.test(evidence.evidenceFingerprint)) {
      throw new Error("ugp_render_eval_evidence_fingerprint_invalid");
    }
    const { evidenceFingerprint, ...base } = evidence;
    const expected = stableHash({
      purpose: "ugp_js_rendered_gap_evidence",
      ...base,
    });
    if (expected !== evidenceFingerprint) {
      throw new Error("ugp_render_eval_evidence_integrity_failed");
    }
  }

  const { evaluationFingerprint, ...base } = evaluation;
  const expected = stableHash({
    purpose: "ugp_js_rendered_backend_evaluation",
    ...base,
  });
  if (expected !== evaluationFingerprint) {
    throw new Error("ugp_render_eval_integrity_failed");
  }
}
