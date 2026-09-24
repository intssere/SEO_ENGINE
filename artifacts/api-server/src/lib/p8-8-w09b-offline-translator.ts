import {
  evaluateP88PolicyAdmission,
  type P88PolicyCandidate,
  type P88PolicyGrant,
} from "./p8-8-policy-grant-evaluation.js";
import {
  materializeP88W02GovernedProposal,
} from "./p8-8-governed-proposal-materialization.js";
import {
  buildP88W09ShadowDecision,
  buildP88W09ShadowSession,
  computeP88W09SourceFingerprint,
  p88W09StableHash,
  type P88W09ShadowDecision,
  type P88W09ShadowItemInput,
  type P88W09ShadowSession,
} from "./p8-8-stage-0-shadow-certification.js";
import {
  P8_8_W09B_EVIDENCE_VERSION,
  P8_8_W09B_TRANSLATOR_VERSION,
  assertP88W09BAcquisitionPackageIntegrity,
  p88W09BStableJson,
  type P88W09BAcquisitionCandidate,
  type P88W09BAcquisitionPackage,
} from "./p8-8-w09b-evidence-contract.js";

export type P88W09BTranslatedCandidate = Readonly<{
  acquisitionCandidateId: string;
  acquisitionCandidateFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  w01Candidate: P88PolicyCandidate;
  w09Input: P88W09ShadowItemInput;
  shadowDecision: P88W09ShadowDecision;
}>;

export type P88W09BTranslationResult = Readonly<{
  version: typeof P8_8_W09B_TRANSLATOR_VERSION;
  translationId: string;
  translationFingerprint: string;
  acquisitionPackageId: string;
  acquisitionPackageFingerprint: string;
  translated: readonly P88W09BTranslatedCandidate[];
  skippedIncompleteCandidateIds: readonly string[];
  shadowSession: P88W09ShadowSession | null;
  semantics: ReturnType<typeof p88W09BTranslatorSemantics>;
  safety: ReturnType<typeof p88W09BTranslatorCapability>;
}>;

function stableEqual(left: unknown, right: unknown): boolean {
  return p88W09BStableJson(left) === p88W09BStableJson(right);
}

function candidateFromAcquisition(
  candidate: P88W09BAcquisitionCandidate,
): P88PolicyCandidate {
  if (candidate.completeness !== "complete_for_w09a") {
    throw new Error("p88_w09b_candidate_not_complete_for_w09a");
  }
  if (
    !candidate.reconstruction
    || !candidate.productGidWitness
    || !candidate.providerBeforeWitness
    || !candidate.derivedCurrentState
  ) {
    throw new Error("p88_w09b_complete_candidate_lineage_missing");
  }

  const rebuiltW02 = materializeP88W02GovernedProposal(
    candidate.reconstruction.w02Input,
  );
  if (!stableEqual(rebuiltW02, candidate.reconstruction.w02Materialization)) {
    throw new Error("p88_w09b_w02_reconstruction_integrity_mismatch");
  }

  const facts = rebuiltW02.w01Facts;
  if (facts.resourceGid !== candidate.productGidWitness.resourceGid) {
    throw new Error("p88_w09b_product_gid_reconstruction_mismatch");
  }
  if (facts.targetUrl !== candidate.productGidWitness.candidateUrl) {
    throw new Error("p88_w09b_target_url_reconstruction_mismatch");
  }
  if (
    candidate.providerBeforeWitness.observation.observedBeforeFingerprint === null
  ) {
    throw new Error("p88_w09b_provider_before_fingerprint_missing");
  }

  return {
    recommendation: {
      recommendationClass: facts.recommendationClass,
      recommendationFingerprint: facts.recommendationFingerprint,
      recommendationIdempotencyKey: facts.recommendationIdempotencyKey,
      lineageMaterialized: facts.lineageMaterialized,
      changedPreviewPresent: facts.changedPreviewPresent,
      deterministic: facts.deterministic,
      aiAssisted: facts.aiAssisted,
      humanEditedAfterCertification: facts.humanEditedAfterCertification,
      lifecycleEligible: facts.lifecycleEligible,
      proposalGenerationMethod: facts.proposalGenerationMethod,
    },
    proposal: {
      proposalFingerprint: facts.proposalFingerprint,
      boundedPilot: true,
      wholeSiteCoverage: facts.wholeSiteCoverage,
    },
    evidence: {
      ids: [...candidate.reconstruction.evidenceIds],
      missingEvidence: [...candidate.reconstruction.missingEvidence],
    },
    quality: {
      status: candidate.reconstruction.quality.status,
      approvalEligible: candidate.reconstruction.quality.approvalEligible,
      score: candidate.reconstruction.quality.score,
      blockingReasons: [...candidate.reconstruction.quality.blockingReasons],
      warnings: [...candidate.reconstruction.quality.warnings],
    },
    risk: {
      classification: candidate.reconstruction.risk.classification,
    },
    target: {
      provider: facts.provider,
      domain: facts.domain,
      resourceKind: facts.resourceKind,
      resourceGid: facts.resourceGid,
      targetUrl: facts.targetUrl,
      actionType: facts.actionType,
      field: facts.field,
      requiredProviderScope: facts.requiredProviderScope,
      beforeFingerprint: facts.beforeFingerprint,
      afterFingerprint: facts.afterFingerprint,
    },
    currentState: {
      ...candidate.derivedCurrentState,
      providerObservedBeforeFingerprint:
        candidate.providerBeforeWitness.observation.observedBeforeFingerprint,
    },
  };
}

export function p88W09BTranslatorSemantics() {
  return Object.freeze({
    offlineOnly: true,
    packageIntegrityRequired: true,
    completeCandidatesOnly: true,
    w02Recomputed: true,
    w01Recomputed: true,
    w09aRecomputesW01Again: true,
    sourceProvenance: "supplied_real_snapshot" as const,
    productionReadSnapshotEmitted: false,
    databaseAccessPerformed: false,
    providerAccessPerformed: false,
    persistencePerformed: false,
    w10ActivationAuthorized: false,
  });
}

export function p88W09BTranslatorCapability() {
  return Object.freeze({
    deterministicTranslationOnly: true,
    databaseReadPerformed: false,
    databaseWritePerformed: false,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    publicSiteReadPerformed: false,
    publicSiteWritePerformed: false,
    persistencePerformed: false,
    schemaMutationPerformed: false,
    w03ToW07AuthorityCreated: false,
    schedulerActivated: false,
    workerActivated: false,
    deploymentPerformed: false,
    publicationPerformed: false,
    w10ActivationAuthorized: false,
  });
}

export function translateP88W09BAcquisitionPackage(input: {
  acquisitionPackage: P88W09BAcquisitionPackage;
  grant: P88PolicyGrant;
  evaluationExpiresAt: string;
}): P88W09BTranslationResult {
  assertP88W09BAcquisitionPackageIntegrity(input.acquisitionPackage);

  const pkg = input.acquisitionPackage;
  if (pkg.version !== P8_8_W09B_EVIDENCE_VERSION) {
    throw new Error("p88_w09b_package_version_mismatch");
  }
  if (
    input.grant.policyId !== pkg.policy.policyId
    || input.grant.policyVersion !== pkg.policy.policyVersion
    || input.grant.policyFingerprint !== pkg.policy.policyFingerprint
  ) {
    throw new Error("p88_w09b_policy_identity_mismatch");
  }

  const translated: P88W09BTranslatedCandidate[] = [];
  const skippedIncompleteCandidateIds: string[] = [];
  for (const candidate of pkg.candidates) {
    if (candidate.completeness !== "complete_for_w09a") {
      skippedIncompleteCandidateIds.push(candidate.candidateId);
      continue;
    }

    const w01Candidate = candidateFromAcquisition(candidate);
    const evaluation = evaluateP88PolicyAdmission({
      grant: input.grant,
      candidate: w01Candidate,
      referenceTime: pkg.request.acquisitionReferenceTime,
      evaluationExpiresAt: input.evaluationExpiresAt,
    });
    const sourceBase = {
      system: "p88w09b-offline-translator",
      version: P8_8_W09B_TRANSLATOR_VERSION,
      sourceId: candidate.candidateId,
      provenance: "supplied_real_snapshot" as const,
    };
    const sourceFingerprint = computeP88W09SourceFingerprint({
      source: sourceBase,
      grant: input.grant,
      candidate: w01Candidate,
      referenceTime: pkg.request.acquisitionReferenceTime,
      evaluationExpiresAt: input.evaluationExpiresAt,
    });
    const w09Input: P88W09ShadowItemInput = Object.freeze({
      source: Object.freeze({
        ...sourceBase,
        sourceFingerprint,
      }),
      grant: input.grant,
      candidate: w01Candidate,
      referenceTime: pkg.request.acquisitionReferenceTime,
      evaluationExpiresAt: input.evaluationExpiresAt,
      evaluation,
      humanLedger: null,
    });
    const shadowDecision = buildP88W09ShadowDecision(w09Input);
    translated.push(Object.freeze({
      acquisitionCandidateId: candidate.candidateId,
      acquisitionCandidateFingerprint: candidate.candidateFingerprint,
      sourceId: sourceBase.sourceId,
      sourceFingerprint,
      w01Candidate,
      w09Input,
      shadowDecision,
    }));
  }

  translated.sort((left, right) =>
    left.acquisitionCandidateId.localeCompare(right.acquisitionCandidateId)
  );
  skippedIncompleteCandidateIds.sort((left, right) => left.localeCompare(right));

  const shadowSession = translated.length
    ? buildP88W09ShadowSession({
      sessionReferenceTime: pkg.request.acquisitionReferenceTime,
      items: translated.map((item) => item.w09Input),
    })
    : null;

  const withoutIdentity = {
    version: P8_8_W09B_TRANSLATOR_VERSION,
    acquisitionPackageId: pkg.packageId,
    acquisitionPackageFingerprint: pkg.packageFingerprint,
    translated: Object.freeze(translated),
    skippedIncompleteCandidateIds: Object.freeze(skippedIncompleteCandidateIds),
    shadowSession,
    semantics: p88W09BTranslatorSemantics(),
    safety: p88W09BTranslatorCapability(),
  };
  const translationFingerprint = p88W09StableHash({
    version: P8_8_W09B_TRANSLATOR_VERSION,
    purpose: "p8.8_w09b_offline_translation",
    result: withoutIdentity,
  });
  return Object.freeze({
    ...withoutIdentity,
    translationFingerprint,
    translationId: "p88w09b-translation-" + translationFingerprint.slice(0, 24),
  });
}
