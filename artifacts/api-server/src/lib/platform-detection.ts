import { createHash } from "node:crypto";
import {
  assertPublicWebOnboardingPlanIntegrity,
  type PublicWebOnboardingPlan,
  type PublicWebOnboardingResolution,
} from "./public-web-onboarding.js";

export const UGP_PLATFORM_DETECTION_VERSION =
  "ugp-3-2-platform-detection-v1" as const;

export const UGP_PLATFORM_DETECTION_LIMITS = Object.freeze({
  maxObservations: 128,
  maxHeaderNameLength: 128,
  maxValueLength: 2_048,
  maxMarkerLength: 128,
  maxPathLength: 1_024,
} as const);

export type PlatformFamily =
  | "shopify"
  | "wordpress"
  | "woocommerce"
  | "webflow"
  | "wix"
  | "headless_custom"
  | "unknown";

export type PlatformEvidenceStrength = "weak" | "moderate" | "strong";
export type PlatformEvidenceGrade = "none" | "weak" | "moderate" | "strong";
export type PlatformConfidence = "none" | "low" | "medium" | "high";
export type PlatformDetectionState = "identified" | "ambiguous" | "unknown";

export type SuppliedPlatformObservation =
  | Readonly<{ kind: "header"; name: string; value: string }>
  | Readonly<{ kind: "meta"; name: string; value: string }>
  | Readonly<{ kind: "asset_url"; value: string }>
  | Readonly<{ kind: "html_marker"; value: string }>
  | Readonly<{ kind: "structured_data_type"; value: string }>
  | Readonly<{ kind: "path"; value: string; statusCode: number }>;

export type PlatformDetectionAuthorization = Readonly<{
  networkReadAuthorized: false;
  crawlExecutionAuthorized: false;
  persistenceAuthorized: false;
  connectorCapabilityGranted: false;
  schedulerEnabled: false;
  autonomousWorkerEnabled: false;
  providerWrites: false;
  publicSiteWrites: false;
}>;

export type PlatformEvidenceSignal = Readonly<{
  id: string;
  family: Exclude<PlatformFamily, "unknown">;
  strength: PlatformEvidenceStrength;
  sourceKind: SuppliedPlatformObservation["kind"] | "hostname";
  label: string;
}>;

export type PlatformCandidateScore = Readonly<{
  family: Exclude<PlatformFamily, "unknown">;
  score: number;
  signalCount: number;
  strongestEvidence: PlatformEvidenceStrength;
}>;

export type PlatformDetectionResult = Readonly<{
  version: typeof UGP_PLATFORM_DETECTION_VERSION;
  state: PlatformDetectionState;
  candidatePlatform: PlatformFamily;
  evidenceGrade: PlatformEvidenceGrade;
  confidence: PlatformConfidence;
  canonicalOrigin: string;
  evidence: readonly PlatformEvidenceSignal[];
  supportingEvidence: readonly PlatformEvidenceSignal[];
  contradictoryEvidence: readonly PlatformEvidenceSignal[];
  alternateCandidates: readonly PlatformCandidateScore[];
  observationSummary: Readonly<Record<SuppliedPlatformObservation["kind"], number>>;
  provenance: Readonly<{
    mode: "supplied_observations_only";
    onboardingVersion: PublicWebOnboardingResolution["version"];
    planFingerprint: string;
    resolutionFingerprint: string;
    observationFingerprint: string;
  }>;
  authorization: PlatformDetectionAuthorization;
  detectionFingerprint: string;
}>;

type NormalizedObservation =
  | Readonly<{ kind: "header"; name: string; value: string }>
  | Readonly<{ kind: "meta"; name: string; value: string }>
  | Readonly<{ kind: "asset_url"; value: string; hostname: string; pathname: string }>
  | Readonly<{ kind: "html_marker"; value: string }>
  | Readonly<{ kind: "structured_data_type"; value: string }>
  | Readonly<{ kind: "path"; value: string; statusCode: number }>;

const STRENGTH_SCORE: Readonly<Record<PlatformEvidenceStrength, number>> = {
  weak: 1,
  moderate: 2,
  strong: 4,
};

const STRENGTH_ORDER: Readonly<Record<PlatformEvidenceStrength, number>> = {
  weak: 0,
  moderate: 1,
  strong: 2,
};

const PLATFORM_ORDER: readonly Exclude<PlatformFamily, "unknown">[] = [
  "shopify",
  "woocommerce",
  "wordpress",
  "webflow",
  "wix",
  "headless_custom",
];

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

function authorizationBoundary(): PlatformDetectionAuthorization {
  return {
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    connectorCapabilityGranted: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
}

function requireBoundedString(
  value: unknown,
  code: string,
  maxLength = UGP_PLATFORM_DETECTION_LIMITS.maxValueLength,
): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > maxLength
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error(code);
  }
  return value.replace(/\s+/g, " ");
}

function requireStatusCode(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 100 || (value as number) > 599) {
    throw new Error("ugp_platform_detection_status_invalid");
  }
  return value as number;
}

function normalizeAssetUrl(value: string, canonicalOrigin: string): {
  value: string;
  hostname: string;
  pathname: string;
} {
  const input = requireBoundedString(
    value,
    "ugp_platform_detection_asset_url_invalid",
  );
  let parsed: URL;
  try {
    parsed = new URL(input, canonicalOrigin);
  } catch {
    throw new Error("ugp_platform_detection_asset_url_invalid");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("ugp_platform_detection_asset_scheme_invalid");
  }
  if (parsed.username || parsed.password || parsed.port) {
    throw new Error("ugp_platform_detection_asset_authority_invalid");
  }
  parsed.hash = "";
  parsed.search = "";
  return {
    value: parsed.toString(),
    hostname: parsed.hostname.toLowerCase(),
    pathname: parsed.pathname.toLowerCase(),
  };
}

function normalizeObservation(
  observation: SuppliedPlatformObservation,
  canonicalOrigin: string,
): NormalizedObservation {
  if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
    throw new Error("ugp_platform_detection_observation_invalid");
  }

  switch (observation.kind) {
    case "header": {
      const name = requireBoundedString(
        observation.name,
        "ugp_platform_detection_header_name_invalid",
        UGP_PLATFORM_DETECTION_LIMITS.maxHeaderNameLength,
      ).toLowerCase();
      if (!/^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(name)) {
        throw new Error("ugp_platform_detection_header_name_invalid");
      }
      const value = requireBoundedString(
        observation.value,
        "ugp_platform_detection_header_value_invalid",
      ).toLowerCase();
      return { kind: "header", name, value };
    }
    case "meta": {
      const name = requireBoundedString(
        observation.name,
        "ugp_platform_detection_meta_name_invalid",
        UGP_PLATFORM_DETECTION_LIMITS.maxHeaderNameLength,
      ).toLowerCase();
      const value = requireBoundedString(
        observation.value,
        "ugp_platform_detection_meta_value_invalid",
      ).toLowerCase();
      return { kind: "meta", name, value };
    }
    case "asset_url":
      return {
        kind: "asset_url",
        ...normalizeAssetUrl(observation.value, canonicalOrigin),
      };
    case "html_marker": {
      const value = requireBoundedString(
        observation.value,
        "ugp_platform_detection_html_marker_invalid",
        UGP_PLATFORM_DETECTION_LIMITS.maxMarkerLength,
      ).toLowerCase();
      if (!/^[a-z0-9:_-]+$/.test(value)) {
        throw new Error("ugp_platform_detection_html_marker_invalid");
      }
      return { kind: "html_marker", value };
    }
    case "structured_data_type": {
      const value = requireBoundedString(
        observation.value,
        "ugp_platform_detection_structured_data_type_invalid",
        UGP_PLATFORM_DETECTION_LIMITS.maxMarkerLength,
      ).toLowerCase();
      return { kind: "structured_data_type", value };
    }
    case "path": {
      const raw = requireBoundedString(
        observation.value,
        "ugp_platform_detection_path_invalid",
        UGP_PLATFORM_DETECTION_LIMITS.maxPathLength,
      );
      let parsed: URL;
      try {
        parsed = new URL(raw, canonicalOrigin);
      } catch {
        throw new Error("ugp_platform_detection_path_invalid");
      }
      if (parsed.origin !== canonicalOrigin) {
        throw new Error("ugp_platform_detection_path_cross_origin");
      }
      return {
        kind: "path",
        value: parsed.pathname.toLowerCase(),
        statusCode: requireStatusCode(observation.statusCode),
      };
    }
    default:
      throw new Error("ugp_platform_detection_observation_kind_invalid");
  }
}

function normalizeObservations(
  observations: readonly SuppliedPlatformObservation[],
  canonicalOrigin: string,
): readonly NormalizedObservation[] {
  if (!Array.isArray(observations)) {
    throw new Error("ugp_platform_detection_observations_invalid");
  }
  if (observations.length > UGP_PLATFORM_DETECTION_LIMITS.maxObservations) {
    throw new Error("ugp_platform_detection_observation_limit_exceeded");
  }

  const normalized = observations.map((observation) =>
    normalizeObservation(observation, canonicalOrigin)
  );
  const deduped = new Map<string, NormalizedObservation>();
  for (const observation of normalized) {
    deduped.set(stableJson(observation), observation);
  }
  return [...deduped.values()].sort((left, right) =>
    stableJson(left).localeCompare(stableJson(right))
  );
}

function assertResolutionBinding(
  plan: PublicWebOnboardingPlan,
  resolution: PublicWebOnboardingResolution,
): void {
  assertPublicWebOnboardingPlanIntegrity(plan);
  if (!resolution || typeof resolution !== "object" || Array.isArray(resolution)) {
    throw new Error("ugp_platform_detection_resolution_invalid");
  }
  if (resolution.version !== plan.version) {
    throw new Error("ugp_platform_detection_resolution_version_mismatch");
  }
  if (resolution.planFingerprint !== plan.planFingerprint) {
    throw new Error("ugp_platform_detection_plan_lineage_mismatch");
  }
  if (resolution.evidenceMode !== "supplied_only") {
    throw new Error("ugp_platform_detection_resolution_provenance_invalid");
  }
  if (resolution.platformDetection !== "not_performed") {
    throw new Error("ugp_platform_detection_resolution_platform_state_invalid");
  }
  if (!/^[0-9a-f]{64}$/.test(resolution.resolutionFingerprint)) {
    throw new Error("ugp_platform_detection_resolution_fingerprint_invalid");
  }

  let finalUrl: URL;
  let origin: URL;
  try {
    finalUrl = new URL(resolution.finalUrl);
    origin = new URL(resolution.canonicalOrigin);
  } catch {
    throw new Error("ugp_platform_detection_resolution_url_invalid");
  }
  if (
    finalUrl.protocol !== "https:"
    || origin.protocol !== "https:"
    || origin.origin !== resolution.canonicalOrigin
    || finalUrl.origin !== resolution.canonicalOrigin
    || finalUrl.hostname.toLowerCase() !== resolution.hostname.toLowerCase()
  ) {
    throw new Error("ugp_platform_detection_resolution_identity_invalid");
  }

  const closedAuthorization = {
    networkReadAuthorized: false,
    crawlExecutionAuthorized: false,
    persistenceAuthorized: false,
    schedulerEnabled: false,
    autonomousWorkerEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
  };
  if (stableJson(resolution.authorization) !== stableJson(closedAuthorization)) {
    throw new Error("ugp_platform_detection_resolution_authority_open");
  }
}

function signal(
  signals: Map<string, PlatformEvidenceSignal>,
  definition: PlatformEvidenceSignal,
): void {
  const key = definition.family + ":" + definition.id;
  if (!signals.has(key)) signals.set(key, definition);
}

function collectHostnameSignal(
  hostname: string,
  signals: Map<string, PlatformEvidenceSignal>,
): void {
  const host = hostname.toLowerCase();
  if (host === "myshopify.com" || host.endsWith(".myshopify.com")) {
    signal(signals, {
      id: "hostname_myshopify",
      family: "shopify",
      strength: "weak",
      sourceKind: "hostname",
      label: "Hosted Shopify hostname pattern",
    });
  }
  if (host === "wordpress.com" || host.endsWith(".wordpress.com")) {
    signal(signals, {
      id: "hostname_wordpress_com",
      family: "wordpress",
      strength: "weak",
      sourceKind: "hostname",
      label: "Hosted WordPress hostname pattern",
    });
  }
  if (host === "webflow.io" || host.endsWith(".webflow.io")) {
    signal(signals, {
      id: "hostname_webflow_io",
      family: "webflow",
      strength: "weak",
      sourceKind: "hostname",
      label: "Hosted Webflow hostname pattern",
    });
  }
  if (
    host === "wixsite.com"
    || host.endsWith(".wixsite.com")
    || host === "wixstudio.io"
    || host.endsWith(".wixstudio.io")
  ) {
    signal(signals, {
      id: "hostname_wix_hosted",
      family: "wix",
      strength: "weak",
      sourceKind: "hostname",
      label: "Hosted Wix hostname pattern",
    });
  }
}

function collectHeaderSignals(
  observation: Extract<NormalizedObservation, { kind: "header" }>,
  signals: Map<string, PlatformEvidenceSignal>,
): void {
  const { name, value } = observation;
  if (name.startsWith("x-shopify-") || name.startsWith("x-sorting-hat-")) {
    signal(signals, {
      id: "header_shopify",
      family: "shopify",
      strength: "strong",
      sourceKind: "header",
      label: "Shopify-specific response header",
    });
  }
  if (name === "x-powered-by" && value.includes("shopify")) {
    signal(signals, {
      id: "header_powered_by_shopify",
      family: "shopify",
      strength: "strong",
      sourceKind: "header",
      label: "Shopify response attribution",
    });
  }
  if (
    (name === "link" && value.includes("api.w.org"))
    || (name === "x-powered-by" && value.includes("wordpress"))
  ) {
    signal(signals, {
      id: "header_wordpress",
      family: "wordpress",
      strength: "strong",
      sourceKind: "header",
      label: "WordPress-specific response header",
    });
  }
  if (name === "x-pingback" && value.includes("xmlrpc.php")) {
    signal(signals, {
      id: "header_wordpress_pingback",
      family: "wordpress",
      strength: "moderate",
      sourceKind: "header",
      label: "WordPress pingback endpoint header",
    });
  }
  if (name.includes("woocommerce") || name.startsWith("x-wc-")) {
    signal(signals, {
      id: "header_woocommerce",
      family: "woocommerce",
      strength: "strong",
      sourceKind: "header",
      label: "WooCommerce-specific response header",
    });
  }
  if (
    (name === "x-powered-by" && value.includes("webflow"))
    || (name === "server" && value === "webflow")
  ) {
    signal(signals, {
      id: "header_webflow",
      family: "webflow",
      strength: "strong",
      sourceKind: "header",
      label: "Webflow response attribution",
    });
  }
  if (
    name === "x-wix-request-id"
    || name === "x-wix-published-version"
    || name === "x-wix-renderer-server"
  ) {
    signal(signals, {
      id: "header_wix",
      family: "wix",
      strength: "strong",
      sourceKind: "header",
      label: "Wix-specific response header",
    });
  }
  if (name === "x-seen-by" && value.includes("wix")) {
    signal(signals, {
      id: "header_wix_seen_by",
      family: "wix",
      strength: "moderate",
      sourceKind: "header",
      label: "Wix response routing marker",
    });
  }
}

function collectMetaSignals(
  observation: Extract<NormalizedObservation, { kind: "meta" }>,
  signals: Map<string, PlatformEvidenceSignal>,
): void {
  if (observation.name !== "generator") return;
  const value = observation.value;
  if (value.includes("woocommerce")) {
    signal(signals, {
      id: "generator_woocommerce",
      family: "woocommerce",
      strength: "strong",
      sourceKind: "meta",
      label: "WooCommerce generator metadata",
    });
  }
  if (value.includes("wordpress")) {
    signal(signals, {
      id: "generator_wordpress",
      family: "wordpress",
      strength: "strong",
      sourceKind: "meta",
      label: "WordPress generator metadata",
    });
  }
  if (value.includes("shopify")) {
    signal(signals, {
      id: "generator_shopify",
      family: "shopify",
      strength: "strong",
      sourceKind: "meta",
      label: "Shopify generator metadata",
    });
  }
  if (value.includes("webflow")) {
    signal(signals, {
      id: "generator_webflow",
      family: "webflow",
      strength: "strong",
      sourceKind: "meta",
      label: "Webflow generator metadata",
    });
  }
  if (value.includes("wix")) {
    signal(signals, {
      id: "generator_wix",
      family: "wix",
      strength: "strong",
      sourceKind: "meta",
      label: "Wix generator metadata",
    });
  }
  if (
    value.includes("next.js")
    || value.includes("nuxt")
    || value.includes("gatsby")
    || value.includes("astro")
  ) {
    signal(signals, {
      id: "generator_headless_framework",
      family: "headless_custom",
      strength: "moderate",
      sourceKind: "meta",
      label: "Headless/static framework generator metadata",
    });
  }
}

function collectAssetSignals(
  observation: Extract<NormalizedObservation, { kind: "asset_url" }>,
  signals: Map<string, PlatformEvidenceSignal>,
): void {
  const { hostname, pathname } = observation;

  if (
    hostname === "cdn.shopify.com"
    || hostname.endsWith(".cdn.shopify.com")
    || pathname.includes("/cdn/shop/")
    || pathname.includes("/shopifycloud/")
  ) {
    signal(signals, {
      id: "asset_shopify",
      family: "shopify",
      strength: "strong",
      sourceKind: "asset_url",
      label: "Shopify asset fingerprint",
    });
  }

  if (pathname.includes("/wp-content/") || pathname.includes("/wp-includes/")) {
    signal(signals, {
      id: "asset_wordpress",
      family: "wordpress",
      strength: "moderate",
      sourceKind: "asset_url",
      label: "WordPress asset path",
    });
  }

  if (
    pathname.includes("/plugins/woocommerce/")
    || pathname.includes("/woocommerce/assets/")
  ) {
    signal(signals, {
      id: "asset_woocommerce",
      family: "woocommerce",
      strength: "strong",
      sourceKind: "asset_url",
      label: "WooCommerce plugin asset path",
    });
  }

  if (
    hostname === "assets.website-files.com"
    || hostname.endsWith(".website-files.com")
    || hostname === "uploads-ssl.webflow.com"
    || pathname.endsWith("/webflow.js")
  ) {
    signal(signals, {
      id: "asset_webflow",
      family: "webflow",
      strength: "strong",
      sourceKind: "asset_url",
      label: "Webflow asset fingerprint",
    });
  }

  if (
    hostname === "static.wixstatic.com"
    || hostname.endsWith(".wixstatic.com")
    || hostname === "static.parastorage.com"
    || hostname.endsWith(".parastorage.com")
  ) {
    signal(signals, {
      id: "asset_wix",
      family: "wix",
      strength: "strong",
      sourceKind: "asset_url",
      label: "Wix asset fingerprint",
    });
  }

  if (
    pathname.includes("/_next/static/")
    || pathname.startsWith("/_nuxt/")
    || pathname.includes("/gatsby-")
    || pathname.includes("/astro/")
  ) {
    signal(signals, {
      id: "asset_headless_framework",
      family: "headless_custom",
      strength: "moderate",
      sourceKind: "asset_url",
      label: "Headless/static framework asset path",
    });
  }
}

function collectMarkerSignals(
  observation: Extract<NormalizedObservation, { kind: "html_marker" }>,
  signals: Map<string, PlatformEvidenceSignal>,
): void {
  const value = observation.value;
  if (["shopify-section", "shopify-payment-button", "shopify-features"].includes(value)) {
    signal(signals, {
      id: "html_shopify",
      family: "shopify",
      strength: "moderate",
      sourceKind: "html_marker",
      label: "Shopify HTML marker",
    });
  }
  if (["wp-block", "wp-embed", "wp-site-blocks"].includes(value)) {
    signal(signals, {
      id: "html_wordpress",
      family: "wordpress",
      strength: "moderate",
      sourceKind: "html_marker",
      label: "WordPress HTML marker",
    });
  }
  if (["woocommerce", "woocommerce-page", "wc-block"].includes(value)) {
    signal(signals, {
      id: "html_woocommerce",
      family: "woocommerce",
      strength: "strong",
      sourceKind: "html_marker",
      label: "WooCommerce HTML marker",
    });
  }
  if (["data-wf-page", "data-wf-site", "w-webflow-badge"].includes(value)) {
    signal(signals, {
      id: "html_webflow",
      family: "webflow",
      strength: "strong",
      sourceKind: "html_marker",
      label: "Webflow HTML marker",
    });
  }
  if (["wix-thunderbolt", "wix-image", "data-hook-wix"].includes(value)) {
    signal(signals, {
      id: "html_wix",
      family: "wix",
      strength: "strong",
      sourceKind: "html_marker",
      label: "Wix HTML marker",
    });
  }
  if (
    ["__next_data__", "next-route-announcer", "__nuxt__", "gatsby-focus-wrapper", "astro-island"]
      .includes(value)
  ) {
    signal(signals, {
      id: "html_headless_framework",
      family: "headless_custom",
      strength: "strong",
      sourceKind: "html_marker",
      label: "Headless/static framework HTML marker",
    });
  }
}

function collectPathSignals(
  observation: Extract<NormalizedObservation, { kind: "path" }>,
  signals: Map<string, PlatformEvidenceSignal>,
): void {
  if (observation.statusCode < 200 || observation.statusCode >= 400) return;

  if (observation.value === "/wp-json/" || observation.value.startsWith("/wp-json/")) {
    signal(signals, {
      id: "path_wordpress_rest",
      family: "wordpress",
      strength: "strong",
      sourceKind: "path",
      label: "Observed WordPress REST path",
    });
  } else if (
    observation.value === "/wp-login.php"
    || observation.value === "/wp-admin/"
    || observation.value.startsWith("/wp-admin/")
  ) {
    signal(signals, {
      id: "path_wordpress_admin",
      family: "wordpress",
      strength: "moderate",
      sourceKind: "path",
      label: "Observed WordPress administration path",
    });
  }

  if (
    observation.value.includes("/wp-json/wc/")
    || observation.value.includes("/wp-json/wc-store/")
  ) {
    signal(signals, {
      id: "path_woocommerce_rest",
      family: "woocommerce",
      strength: "strong",
      sourceKind: "path",
      label: "Observed WooCommerce REST path",
    });
  }
}

function collectEvidence(
  hostname: string,
  observations: readonly NormalizedObservation[],
): readonly PlatformEvidenceSignal[] {
  const signals = new Map<string, PlatformEvidenceSignal>();
  collectHostnameSignal(hostname, signals);

  for (const observation of observations) {
    if (observation.kind === "header") collectHeaderSignals(observation, signals);
    if (observation.kind === "meta") collectMetaSignals(observation, signals);
    if (observation.kind === "asset_url") collectAssetSignals(observation, signals);
    if (observation.kind === "html_marker") collectMarkerSignals(observation, signals);
    if (observation.kind === "path") collectPathSignals(observation, signals);
  }

  return [...signals.values()].sort((left, right) =>
    PLATFORM_ORDER.indexOf(left.family) - PLATFORM_ORDER.indexOf(right.family)
    || STRENGTH_ORDER[right.strength] - STRENGTH_ORDER[left.strength]
    || left.id.localeCompare(right.id)
  );
}

function candidateScores(
  evidence: readonly PlatformEvidenceSignal[],
): readonly PlatformCandidateScore[] {
  const scores = new Map<Exclude<PlatformFamily, "unknown">, {
    score: number;
    signals: PlatformEvidenceSignal[];
  }>();

  for (const family of PLATFORM_ORDER) scores.set(family, { score: 0, signals: [] });
  for (const item of evidence) {
    const bucket = scores.get(item.family)!;
    bucket.score += STRENGTH_SCORE[item.strength];
    bucket.signals.push(item);
  }

  const woo = scores.get("woocommerce")!;
  const wordpress = scores.get("wordpress")!;
  if (woo.score > 0 && wordpress.score > 0) {
    woo.score += Math.min(4, wordpress.score);
  }

  return PLATFORM_ORDER.map((family) => {
    const bucket = scores.get(family)!;
    const strongest = bucket.signals.reduce<PlatformEvidenceStrength>(
      (current, item) =>
        STRENGTH_ORDER[item.strength] > STRENGTH_ORDER[current]
          ? item.strength
          : current,
      "weak",
    );
    return {
      family,
      score: bucket.score,
      signalCount: bucket.signals.length,
      strongestEvidence: bucket.signals.length ? strongest : "weak",
    };
  })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) =>
      right.score - left.score
      || PLATFORM_ORDER.indexOf(left.family) - PLATFORM_ORDER.indexOf(right.family)
    );
}

function evidenceGrade(score: number, supporting: readonly PlatformEvidenceSignal[]): PlatformEvidenceGrade {
  if (!supporting.length || score === 0) return "none";
  const sourceKinds = new Set(supporting.map((item) => item.sourceKind));
  const strongCount = supporting.filter((item) => item.strength === "strong").length;
  if (score >= 7 || (strongCount >= 1 && sourceKinds.size >= 2)) return "strong";
  if (score >= 2) return "moderate";
  return "weak";
}

function observationSummary(
  observations: readonly NormalizedObservation[],
): Record<SuppliedPlatformObservation["kind"], number> {
  const summary: Record<SuppliedPlatformObservation["kind"], number> = {
    header: 0,
    meta: 0,
    asset_url: 0,
    html_marker: 0,
    structured_data_type: 0,
    path: 0,
  };
  for (const observation of observations) summary[observation.kind] += 1;
  return summary;
}

function isFrameworkEvidence(signal: PlatformEvidenceSignal): boolean {
  return (
    signal.family === "headless_custom"
    && signal.sourceKind !== "hostname"
  );
}

export function detectPlatformFromSuppliedObservations(input: {
  plan: PublicWebOnboardingPlan;
  resolution: PublicWebOnboardingResolution;
  observations: readonly SuppliedPlatformObservation[];
}): PlatformDetectionResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_platform_detection_input_invalid");
  }

  assertResolutionBinding(input.plan, input.resolution);
  const normalized = normalizeObservations(
    input.observations,
    input.resolution.canonicalOrigin,
  );
  const evidence = collectEvidence(input.resolution.hostname, normalized);
  const candidates = candidateScores(evidence);
  const top = candidates[0];
  const second = candidates[1];

  let state: PlatformDetectionState = "unknown";
  let candidatePlatform: PlatformFamily = "unknown";
  let confidence: PlatformConfidence = "none";

  if (top) {
    const topSignals = evidence.filter((item) =>
      item.family === top.family
      || (top.family === "woocommerce" && item.family === "wordpress")
    );
    const hasObservedEvidence = topSignals.some((item) => item.sourceKind !== "hostname");
    const headlessHasFrameworkEvidence =
      top.family !== "headless_custom" || topSignals.some(isFrameworkEvidence);
    const closeConflict = Boolean(
      second
      && second.score >= 3
      && top.score - second.score <= 1,
    );

    if (closeConflict) {
      state = "ambiguous";
      confidence = "low";
    } else if (hasObservedEvidence && headlessHasFrameworkEvidence && top.score >= 2) {
      state = "identified";
      candidatePlatform = top.family;
      const margin = top.score - (second?.score ?? 0);
      const sourceKinds = new Set(topSignals.map((item) => item.sourceKind));
      if (top.score >= 7 && margin >= 3 && sourceKinds.size >= 2) {
        confidence = "high";
      } else if (top.score >= 4 && margin >= 2) {
        confidence = "medium";
      } else {
        confidence = "low";
      }
    } else {
      confidence = "low";
    }
  }

  const supportingEvidence = candidatePlatform === "unknown"
    ? []
    : evidence.filter((item) =>
      item.family === candidatePlatform
      || (candidatePlatform === "woocommerce" && item.family === "wordpress")
    );
  const contradictoryEvidence = candidatePlatform === "unknown"
    ? evidence
    : evidence.filter((item) =>
      item.family !== candidatePlatform
      && !(candidatePlatform === "woocommerce" && item.family === "wordpress")
    );

  const topScore = top?.score ?? 0;
  const gradeSignals = candidatePlatform === "unknown"
    ? evidence.filter((item) => top && item.family === top.family)
    : supportingEvidence;
  const grade = evidenceGrade(topScore, gradeSignals);

  const normalizedForFingerprint = normalized.map((observation) => {
    if (observation.kind === "header") {
      return {
        kind: observation.kind,
        name: observation.name,
        valueFingerprint: stableHash(observation.value),
      };
    }
    if (observation.kind === "meta") {
      return {
        kind: observation.kind,
        name: observation.name,
        valueFingerprint: stableHash(observation.value),
      };
    }
    return observation;
  });
  const observationFingerprint = stableHash({
    purpose: "ugp_platform_detection_observations",
    canonicalOrigin: input.resolution.canonicalOrigin,
    observations: normalizedForFingerprint,
  });

  const base = {
    version: UGP_PLATFORM_DETECTION_VERSION,
    state,
    candidatePlatform,
    evidenceGrade: grade,
    confidence,
    canonicalOrigin: input.resolution.canonicalOrigin,
    evidence,
    supportingEvidence,
    contradictoryEvidence,
    alternateCandidates: candidates.slice(0, 4),
    observationSummary: observationSummary(normalized),
    provenance: {
      mode: "supplied_observations_only" as const,
      onboardingVersion: input.resolution.version,
      planFingerprint: input.plan.planFingerprint,
      resolutionFingerprint: input.resolution.resolutionFingerprint,
      observationFingerprint,
    },
    authorization: authorizationBoundary(),
  };

  return deepFreeze({
    ...base,
    detectionFingerprint: stableHash({
      purpose: "ugp_platform_detection_result",
      ...base,
    }),
  });
}
