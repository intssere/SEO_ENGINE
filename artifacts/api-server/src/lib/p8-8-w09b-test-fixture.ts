import {
  buildP88W09BAcquisitionCandidate,
  buildP88W09BAcquisitionPackage,
  buildP88W09BQueryResult,
  P8_8_W09B_QUERY_DESCRIPTORS,
  P8_8_W09B_QUERY_SET_FINGERPRINT,
  P8_8_W09B_QUERY_SET_VERSION,
  p88W09BRequestForGrant,
  p88W09BStableHash,
  type P88W09BAcquisitionCandidate,
  type P88W09BAcquisitionPackage,
  type P88W09BAcquisitionRequest,
} from "./p8-8-w09b-evidence-contract.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

export type P88W09BSyntheticFixture = Readonly<{
  grant: ReturnType<typeof buildP88W07TestFixture>["scenario"]["intentInput"]["w01EvaluationInput"]["grant"];
  evaluationExpiresAt: string;
  request: P88W09BAcquisitionRequest;
  candidate: P88W09BAcquisitionCandidate;
  package: P88W09BAcquisitionPackage;
  w07: ReturnType<typeof buildP88W07TestFixture>;
}>;

export function buildP88W09BSyntheticFixture(options: {
  baseTime?: string;
  siteId?: string;
  productId?: string;
  handle?: string;
} = {}): P88W09BSyntheticFixture {
  const w07 = buildP88W07TestFixture({
    baseTime: options.baseTime ?? "2026-09-23T12:00:00.000Z",
    siteId: options.siteId,
    productId: options.productId ?? "650000001",
    handle: options.handle ?? "w09b-synthetic",
    before: "Before W09-B synthetic bytes",
    after: "After W09-B synthetic bytes",
    policyStage: "shadow",
  });
  const grant = w07.scenario.intentInput.w01EvaluationInput.grant;
  const referenceTime = w07.scenario.intentInput.w01EvaluationInput.referenceTime;
  const evaluationExpiresAt =
    w07.scenario.intentInput.w01EvaluationInput.evaluationExpiresAt;
  const w02Input = w07.scenario.intentInput.w02MaterializationInput;
  const w02 = w07.scenario.intentInput.w02Materialization;
  const sourceFingerprint = "c".repeat(64);
  const observedAt = new Date(Date.parse(referenceTime) - 60_000).toISOString();
  const staleAfter = new Date(Date.parse(observedAt) + 3_600_000).toISOString();

  const request = p88W09BRequestForGrant({
    applicationSha: "a".repeat(40),
    applicationTree: "b".repeat(40),
    databaseName: "seo_engine_test",
    roleIdentity: "postgres",
    grant,
    referenceTime,
  });

  const opportunity = Object.freeze({
    opportunity_id: "00000000-0000-4000-8000-000000000101",
    site_id: grant.siteId,
    page_id: "00000000-0000-4000-8000-000000000201",
    opportunity_type: "query_gap",
    status: "new",
    score: 95,
    updated_at: referenceTime,
  });
  const page = Object.freeze({
    id: "00000000-0000-4000-8000-000000000201",
    site_id: grant.siteId,
    url: w02.w01Facts.targetUrl,
    normalized_url: w02.w01Facts.targetUrl,
    path: new URL(w02.w01Facts.targetUrl).pathname,
    page_type: "product",
    indexable: true,
    last_seen_at: referenceTime,
  });
  const legacyEvidence = Object.freeze([
    Object.freeze({
      id: "00000000-0000-4000-8000-000000000301",
      site_id: grant.siteId,
      page_id: page.id,
      source: "synthetic",
      kind: "p8_8_w09b_reconstruction",
      observed_at: observedAt,
      confidence: 1,
      payload: {
        resourceGid: w02.w01Facts.resourceGid,
        reconstruction: {
          w02Input,
          w02Materialization: w02,
          evidenceIds: ["evidence-a", "evidence-b"],
          missingEvidence: [],
          quality: {
            status: "pass",
            approvalEligible: true,
            score: 100,
            blockingReasons: [],
            warnings: [],
          },
          risk: { classification: "low" },
        },
      },
      provenance: { sourceFingerprint },
      created_at: observedAt,
    }),
  ]);
  const normalizedObservations = Object.freeze([
    Object.freeze({
      observation_id: "1".repeat(64),
      schema_version: "v1",
      semantic_key: "2".repeat(64),
      subject_kind: "url",
      site_id: grant.siteId,
      canonical_origin: "https://diamondshelf.us",
      url_id: "3".repeat(64),
      canonical_url: w02.w01Facts.targetUrl,
      observation_kind: "provider_product_meta_description",
      material_value: { providerObservation: w07.providerObservation },
      value_fingerprint: "4".repeat(64),
      evidence_set_fingerprint: "5".repeat(64),
      source_kind: "synthetic_w06_persisted",
      source_fingerprint: "6".repeat(64),
      collector_id: "p88-w09b-synthetic",
      provenance_fingerprint: "7".repeat(64),
      confidence: "verified",
      observed_at: observedAt,
      fresh_for_ms: 3_600_000,
      stale_after: staleAfter,
      retention_class: "evidence_lineage",
      record_fingerprint: "8".repeat(64),
    }),
  ]);
  const controlState = Object.freeze({
    control_version: w07.control.version,
    site_id: grant.siteId,
    revision: w07.control.revision,
    previous_control_fingerprint: w07.control.previousControlFingerprint,
    mode: w07.control.mode,
    effective_at: w07.control.effectiveAt,
    control_fingerprint: w07.control.controlFingerprint,
    updated_at: w07.control.effectiveAt,
  });

  const candidate = buildP88W09BAcquisitionCandidate({
    opportunity,
    page,
    pageSnapshots: Object.freeze([]),
    legacyEvidence,
    normalizedObservations,
    normalizedEvidence: Object.freeze([]),
    productGidWitness: Object.freeze({
      resourceGid: w02.w01Facts.resourceGid,
      sourceRecordKind: "p8_8_w09b_reconstruction",
      sourceRecordId: String(legacyEvidence[0]!.id),
      sourceFingerprint,
      sourceFieldPath: "payload.resourceGid",
      candidateUrl: w02.w01Facts.targetUrl,
    }),
    providerBeforeWitness: Object.freeze({
      observation: w07.providerObservation,
      container: Object.freeze({
        observationId: String(normalizedObservations[0]!.observation_id),
        recordFingerprint: String(normalizedObservations[0]!.record_fingerprint),
        provenanceFingerprint: String(
          normalizedObservations[0]!.provenance_fingerprint,
        ),
        observedAt,
        freshForMs: 3_600_000,
        staleAfter,
      }),
    }),
    controlState,
    reservations: Object.freeze([]),
    claims: Object.freeze([]),
    dispatches: Object.freeze([]),
    dispatchEvents: Object.freeze([]),
    humanActions: Object.freeze([]),
    humanApprovals: Object.freeze([]),
    humanDeployments: Object.freeze([]),
    humanRollbacks: Object.freeze([]),
    humanVerifications: Object.freeze([]),
    reconstruction: Object.freeze({
      w02Input,
      w02Materialization: w02,
      evidenceIds: Object.freeze(["evidence-a", "evidence-b"]),
      missingEvidence: Object.freeze([]),
      quality: Object.freeze({
        status: "pass",
        approvalEligible: true,
        score: 100,
        blockingReasons: Object.freeze([]),
        warnings: Object.freeze([]),
      }),
      risk: Object.freeze({ classification: "low" }),
    }),
    derivedCurrentState: Object.freeze({
      providerObservedBeforeFingerprint:
        w07.providerObservation.observedBeforeFingerprint!,
      priorDeploymentCount: 0,
      otherActiveSiteMutationCount: 0,
      sameTargetCooldownSatisfied: true,
      mutationQuotaRemaining: 1,
      unresolvedManualIntervention: false,
      unresolvedUncertainProviderWrite: false,
      unresolvedRollbackFailure: false,
      mutationControlMode: "running",
      mutationControlFingerprint: w07.control.controlFingerprint,
    }),
    completeness: "complete_for_w09a",
    incompleteReasons: Object.freeze([]),
  });

  const queryResults = P8_8_W09B_QUERY_DESCRIPTORS.map((descriptor, index) => {
    const rows =
      descriptor.queryId === "w09b.transaction_identity.v1"
        ? [{
            database_name: "seo_engine_test",
            role_identity: "postgres",
            transaction_read_only: "on",
            transaction_isolation: "repeatable read",
            reference_time: referenceTime,
            server_version: "PostgreSQL synthetic",
          }]
        : descriptor.queryId === "w09b.site_identity.v1"
          ? [{
              id: grant.siteId,
              domain: "diamondshelf.us",
              canonical_origin: "https://diamondshelf.us",
              platform: "shopify",
              is_active: true,
              updated_at: referenceTime,
            }]
          : descriptor.queryId === "w09b.control_state.v1"
            ? [controlState]
            : descriptor.queryId === "w09b.candidate_opportunities.v1"
              ? [opportunity]
              : [];
    return buildP88W09BQueryResult({
      descriptor,
      invocationIndex: 0,
      parameters: { synthetic: true, index },
      rows,
    });
  });
  const transactionStartFingerprint = p88W09BStableHash({
    purpose: "p8.8_w09b_transaction_start",
    synthetic: true,
    referenceTime,
  });
  const transactionCompletionFingerprint = p88W09BStableHash({
    purpose: "p8.8_w09b_transaction_completion",
    transactionStartFingerprint,
    candidateFingerprint: candidate.candidateFingerprint,
  });
  const siteResult = queryResults.find(
    (result) => result.queryId === "w09b.site_identity.v1",
  )!;

  const pkg = buildP88W09BAcquisitionPackage({
    version: "p8-8-w09b-synthetic-evidence-v1",
    request,
    querySet: Object.freeze({
      version: P8_8_W09B_QUERY_SET_VERSION,
      querySetFingerprint: P8_8_W09B_QUERY_SET_FINGERPRINT,
      descriptors: P8_8_W09B_QUERY_DESCRIPTORS,
    }),
    transaction: Object.freeze({
      databaseName: "seo_engine_test",
      roleIdentity: "postgres",
      referenceTime,
      serverVersion: "PostgreSQL synthetic",
      transactionReadOnly: true,
      transactionIsolation: "repeatable_read",
      startFingerprint: transactionStartFingerprint,
      completionFingerprint: transactionCompletionFingerprint,
    }),
    schemaState: "full_w07_schema",
    site: Object.freeze({
      siteId: grant.siteId,
      domain: "diamondshelf.us",
      canonicalOrigin: "https://diamondshelf.us",
      platform: "shopify",
      active: true,
      sourceResultFingerprint: siteResult.rowResultFingerprint,
    }),
    policy: request.policy,
    queryResults: Object.freeze(queryResults),
    candidates: Object.freeze([candidate]),
  });

  return Object.freeze({
    grant,
    evaluationExpiresAt,
    request,
    candidate,
    package: pkg,
    w07,
  });
}
