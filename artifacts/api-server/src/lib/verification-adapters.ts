import { createHash } from "node:crypto";
import {
  executionStateFingerprint,
  type ExecutableField,
} from "./execution-foundation.js";
import {
  assertTask53Resource,
  assertTask53TargetUrl,
  readTask53ShopifyState,
  verifyTask53Storefront,
  Task53ProviderError,
  type Task53ProviderState,
  type Task53Resource,
  type Task53ShopifyCredential,
  type Task53StorefrontVerification,
} from "./task53-production-pilot.js";

export const P8_4_VERIFICATION_ADAPTER_VERSION = "p8-4-verification-adapter-v1" as const;

export const supportedVerificationMutationClasses = [
  "shopify_product_seo_title",
  "shopify_product_seo_meta_description",
  "shopify_collection_seo_title",
  "shopify_collection_seo_meta_description",
] as const;

export type VerificationMutationClass = typeof supportedVerificationMutationClasses[number];
export type VerificationStatus = "verified" | "failed" | "unavailable";

export type VerificationAdapterRegistryEntry = {
  mutationClass: VerificationMutationClass;
  resourceKind: "product" | "collection";
  field: ExecutableField;
  adapterFingerprint: string;
};

export type VerificationAdapterInput = {
  resource: {
    kind: string;
    gid: string;
  };
  targetUrl: string;
  field: string;
  expectedValue: string | null;
  expectedFingerprint: string;
  credential: Task53ShopifyCredential;
  fetchImpl?: typeof fetch;
};

export type VerificationAdapterDependencies = {
  readProvider?: (input: {
    credential: Task53ShopifyCredential;
    resource: Task53Resource;
    field: ExecutableField;
    fetchImpl?: typeof fetch;
  }) => Promise<Task53ProviderState>;
  verifyStorefront?: (input: {
    url: string;
    field: ExecutableField;
    expectedValue: string | null;
    fetchImpl?: typeof fetch;
  }) => Promise<Task53StorefrontVerification>;
};

export type VerificationAdapterResult = {
  version: typeof P8_4_VERIFICATION_ADAPTER_VERSION;
  mutationClass: VerificationMutationClass | null;
  adapterFingerprint: string | null;
  resource: {
    kind: string;
    gid: string;
  };
  targetUrl: string;
  field: string;
  expected: {
    value: string | null;
    fingerprint: string;
  };
  provider: {
    observedValue: string | null;
    observedFingerprint: string | null;
    requestId: string | null;
  };
  storefront: {
    observedValue: string | null;
    observedFingerprint: string | null;
    statusCode: number | null;
  };
  providerVerified: boolean;
  storefrontVerified: boolean;
  status: VerificationStatus;
  failureCategories: string[];
  providerWritePerformed: false;
  databaseMutationPerformed: false;
  automaticTransition: false;
  resultFingerprint: string;
};

type MutableResult = Omit<VerificationAdapterResult, "resultFingerprint">;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

const registryBase = [
  {
    mutationClass: "shopify_product_seo_title",
    resourceKind: "product",
    field: "title",
  },
  {
    mutationClass: "shopify_product_seo_meta_description",
    resourceKind: "product",
    field: "meta_description",
  },
  {
    mutationClass: "shopify_collection_seo_title",
    resourceKind: "collection",
    field: "title",
  },
  {
    mutationClass: "shopify_collection_seo_meta_description",
    resourceKind: "collection",
    field: "meta_description",
  },
] as const;

export const verificationAdapterRegistry: readonly VerificationAdapterRegistryEntry[] = Object.freeze(
  registryBase.map((entry) => Object.freeze({
    ...entry,
    adapterFingerprint: hash({
      version: P8_4_VERIFICATION_ADAPTER_VERSION,
      mutationClass: entry.mutationClass,
      resourceKind: entry.resourceKind,
      field: entry.field,
    }),
  })),
);

export function resolveVerificationMutationClass(
  resourceKind: string,
  field: string,
): VerificationAdapterRegistryEntry | null {
  return verificationAdapterRegistry.find(
    (entry) => entry.resourceKind === resourceKind && entry.field === field,
  ) ?? null;
}

function baseResult(input: VerificationAdapterInput, entry: VerificationAdapterRegistryEntry | null): MutableResult {
  return {
    version: P8_4_VERIFICATION_ADAPTER_VERSION,
    mutationClass: entry?.mutationClass ?? null,
    adapterFingerprint: entry?.adapterFingerprint ?? null,
    resource: {
      kind: input.resource.kind,
      gid: input.resource.gid,
    },
    targetUrl: input.targetUrl,
    field: input.field,
    expected: {
      value: input.expectedValue,
      fingerprint: input.expectedFingerprint,
    },
    provider: {
      observedValue: null,
      observedFingerprint: null,
      requestId: null,
    },
    storefront: {
      observedValue: null,
      observedFingerprint: null,
      statusCode: null,
    },
    providerVerified: false,
    storefrontVerified: false,
    status: "failed",
    failureCategories: [],
    providerWritePerformed: false,
    databaseMutationPerformed: false,
    automaticTransition: false,
  };
}

export function verificationAdapterResultFingerprint(
  result: Omit<VerificationAdapterResult, "resultFingerprint">,
): string {
  const normalized = {
    ...result,
    failureCategories: [...new Set(result.failureCategories)].sort(),
  };
  return hash(normalized);
}

export function verificationAdapterIntegrityIssues(result: VerificationAdapterResult): string[] {
  const issues: string[] = [];
  if (result.version !== P8_4_VERIFICATION_ADAPTER_VERSION) {
    issues.push("verification_version_mismatch");
  }
  const entry = resolveVerificationMutationClass(result.resource.kind, result.field);
  if (!entry || result.mutationClass !== entry.mutationClass) {
    issues.push("verification_mutation_class_mismatch");
  }
  if (!entry || result.adapterFingerprint !== entry.adapterFingerprint) {
    issues.push("verification_adapter_fingerprint_mismatch");
  }
  if (executionStateFingerprint(result.field, result.expected.value) !== result.expected.fingerprint) {
    issues.push("verification_expected_fingerprint_mismatch");
  }
  if (
    result.providerWritePerformed !== false ||
    result.databaseMutationPerformed !== false ||
    result.automaticTransition !== false
  ) {
    issues.push("verification_side_effect_marker_invalid");
  }
  const categories = [...new Set(result.failureCategories)].sort();
  if (JSON.stringify(categories) !== JSON.stringify(result.failureCategories)) {
    issues.push("verification_failure_categories_not_canonical");
  }
  if (
    result.status === "verified" &&
    (!result.providerVerified || !result.storefrontVerified || categories.length !== 0)
  ) {
    issues.push("verification_verified_state_inconsistent");
  }
  const { resultFingerprint: _ignored, ...withoutFingerprint } = result;
  if (verificationAdapterResultFingerprint(withoutFingerprint) !== result.resultFingerprint) {
    issues.push("verification_result_fingerprint_mismatch");
  }
  return [...new Set(issues)].sort();
}

function finalize(result: MutableResult): VerificationAdapterResult {
  const failureCategories = [...new Set(result.failureCategories)].sort();
  const normalized: MutableResult = {
    ...result,
    failureCategories,
  };
  return {
    ...normalized,
    resultFingerprint: verificationAdapterResultFingerprint(normalized),
  };
}

function providerErrorCategory(error: unknown): { status: VerificationStatus; category: string } {
  if (error instanceof Task53ProviderError) {
    const category = error.category;
    if (
      category === "task53_resource_identity_invalid" ||
      category === "task53_target_url_invalid" ||
      category === "task53_target_site_mismatch" ||
      category === "task53_resource_url_kind_mismatch" ||
      category === "shopify_resource_not_found" ||
      category === "shopify_resource_identity_mismatch"
    ) {
      return { status: "failed", category: "provider_" + category };
    }
    return { status: "unavailable", category: "provider_unavailable_" + category };
  }
  return { status: "unavailable", category: "provider_unavailable_unknown_error" };
}

function storefrontUnavailable(category: string | null): boolean {
  if (!category) return false;
  return (
    category === "storefront_network_error" ||
    category.startsWith("storefront_http_")
  );
}

export async function verifyCertifiedMutation(
  input: VerificationAdapterInput,
  dependencies: VerificationAdapterDependencies = {},
): Promise<VerificationAdapterResult> {
  const entry = resolveVerificationMutationClass(input.resource.kind, input.field);
  const result = baseResult(input, entry);

  if (!entry) {
    result.failureCategories.push("unsupported_mutation_class");
    return finalize(result);
  }

  const expectedFingerprint = executionStateFingerprint(entry.field, input.expectedValue);
  if (expectedFingerprint !== input.expectedFingerprint) {
    result.failureCategories.push("expected_fingerprint_mismatch");
    return finalize(result);
  }

  const resource = {
    kind: entry.resourceKind,
    gid: input.resource.gid,
  } satisfies Task53Resource;

  try {
    assertTask53Resource(resource);
    assertTask53TargetUrl(resource, input.targetUrl);
  } catch (error) {
    const classified = providerErrorCategory(error);
    result.status = "failed";
    result.failureCategories.push(classified.category);
    return finalize(result);
  }

  const readProvider = dependencies.readProvider ?? readTask53ShopifyState;
  const verifyStorefront = dependencies.verifyStorefront ?? verifyTask53Storefront;

  let providerState: Task53ProviderState;
  try {
    providerState = await readProvider({
      credential: input.credential,
      resource,
      field: entry.field,
      fetchImpl: input.fetchImpl,
    });
  } catch (error) {
    const classified = providerErrorCategory(error);
    result.status = classified.status;
    result.failureCategories.push(classified.category);
    return finalize(result);
  }

  result.provider = {
    observedValue: providerState.value,
    observedFingerprint: providerState.fingerprint,
    requestId: providerState.providerRequestId,
  };

  const providerComputedFingerprint = executionStateFingerprint(entry.field, providerState.value);
  if (
    providerState.resource.kind !== entry.resourceKind ||
    providerState.resource.gid !== resource.gid
  ) {
    result.failureCategories.push("provider_resource_identity_mismatch");
  }
  if (providerState.field !== entry.field) {
    result.failureCategories.push("provider_field_identity_mismatch");
  }
  if (providerComputedFingerprint !== providerState.fingerprint) {
    result.failureCategories.push("provider_fingerprint_integrity_mismatch");
  }
  if (providerState.fingerprint !== input.expectedFingerprint) {
    result.failureCategories.push("provider_state_mismatch");
  }
  result.providerVerified = result.failureCategories.length === 0;

  let storefrontState: Task53StorefrontVerification;
  try {
    storefrontState = await verifyStorefront({
      url: input.targetUrl,
      field: entry.field,
      expectedValue: input.expectedValue,
      fetchImpl: input.fetchImpl,
    });
  } catch {
    result.status = result.failureCategories.length > 0 ? "failed" : "unavailable";
    result.failureCategories.push("storefront_unavailable_unknown_error");
    return finalize(result);
  }

  result.storefront = {
    observedValue: storefrontState.observedValue,
    observedFingerprint: storefrontState.observedFingerprint,
    statusCode: storefrontState.statusCode,
  };

  if (storefrontState.expectedFingerprint !== input.expectedFingerprint) {
    result.failureCategories.push("storefront_expected_fingerprint_mismatch");
  }
  if (!storefrontState.ok) {
    if (storefrontUnavailable(storefrontState.errorCategory)) {
      result.failureCategories.push(
        "storefront_unavailable_" + (storefrontState.errorCategory ?? "unknown"),
      );
    } else {
      result.failureCategories.push(
        storefrontState.errorCategory ?? "storefront_verification_failed",
      );
    }
  }
  if (
    storefrontState.observedFingerprint !== null &&
    storefrontState.observedFingerprint !== input.expectedFingerprint
  ) {
    result.failureCategories.push("storefront_state_mismatch");
  }

  result.storefrontVerified = (
    storefrontState.ok &&
    storefrontState.expectedFingerprint === input.expectedFingerprint &&
    storefrontState.observedFingerprint === input.expectedFingerprint
  );

  if (
    providerState.fingerprint &&
    storefrontState.observedFingerprint &&
    providerState.fingerprint !== storefrontState.observedFingerprint
  ) {
    result.failureCategories.push("provider_storefront_disagreement");
  }

  const categories = [...new Set(result.failureCategories)];
  const hasAuthoritativeFailure = categories.some(
    (category) => !category.startsWith("storefront_unavailable_"),
  );
  const hasUnavailable = categories.some(
    (category) => category.startsWith("storefront_unavailable_"),
  );

  if (result.providerVerified && result.storefrontVerified && categories.length === 0) {
    result.status = "verified";
  } else if (hasAuthoritativeFailure) {
    result.status = "failed";
  } else if (hasUnavailable) {
    result.status = "unavailable";
  } else {
    result.status = "failed";
  }

  return finalize(result);
}

export function verificationAdapterCapability() {
  return Object.freeze({
    version: P8_4_VERIFICATION_ADAPTER_VERSION,
    mutationClasses: verificationAdapterRegistry.map((entry) => entry.mutationClass),
    supportedResourceKinds: ["product", "collection"] as const,
    supportedFields: ["title", "meta_description"] as const,
    providerWritePerformed: false,
    databaseMutationPerformed: false,
    automaticTransition: false,
    mediaAltImplemented: false,
    writeFilesScopeRequired: false,
  });
}
