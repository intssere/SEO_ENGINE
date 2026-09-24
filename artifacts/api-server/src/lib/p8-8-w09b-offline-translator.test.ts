import assert from "node:assert/strict";
import test from "node:test";
import {
  buildP88W09BAcquisitionCandidate,
  buildP88W09BAcquisitionPackage,
} from "./p8-8-w09b-evidence-contract.js";
import {
  p88W09BTranslatorCapability,
  p88W09BTranslatorSemantics,
  translateP88W09BAcquisitionPackage,
} from "./p8-8-w09b-offline-translator.js";
import { buildP88W09BSyntheticFixture } from "./p8-8-w09b-test-fixture.js";

test("W09-BE3 translates a complete package into one supplied_real_snapshot", () => {
  const fixture = buildP88W09BSyntheticFixture();
  const translated = translateP88W09BAcquisitionPackage({
    acquisitionPackage: fixture.package,
    grant: fixture.grant,
    evaluationExpiresAt: fixture.evaluationExpiresAt,
  });

  assert.equal(translated.translated.length, 1);
  assert.deepEqual(translated.skippedIncompleteCandidateIds, []);
  const item = translated.translated[0]!;
  assert.equal(item.w09Input.source.provenance, "supplied_real_snapshot");
  assert.equal(item.w09Input.source.sourceId, fixture.candidate.candidateId);
  assert.equal(item.shadowDecision.decision, "admit");
  assert.equal(item.shadowDecision.source.provenance, "supplied_real_snapshot");
  assert.ok(translated.shadowSession);
  assert.equal(translated.shadowSession!.summary.totalCandidates, 1);
  assert.match(translated.translationFingerprint, /^[0-9a-f]{64}$/);
});

test("translation is byte-for-byte deterministic", () => {
  const fixture = buildP88W09BSyntheticFixture();
  const first = translateP88W09BAcquisitionPackage({
    acquisitionPackage: fixture.package,
    grant: fixture.grant,
    evaluationExpiresAt: fixture.evaluationExpiresAt,
  });
  const second = translateP88W09BAcquisitionPackage({
    acquisitionPackage: structuredClone(fixture.package),
    grant: fixture.grant,
    evaluationExpiresAt: fixture.evaluationExpiresAt,
  });
  assert.deepEqual(first, second);
});

test("BE3 skips incomplete candidates and never promotes them into W09-A", () => {
  const fixture = buildP88W09BSyntheticFixture();
  const source = fixture.candidate;
  const {
    candidateId: _id,
    candidateFingerprint: _fp,
    completeness: _completeness,
    incompleteReasons: _reasons,
    ...base
  } = source;
  const incomplete = buildP88W09BAcquisitionCandidate({
    ...base,
    completeness: "complete_for_w09a",
    incompleteReasons: ["provider_before_not_authoritative"],
  } as any);
  const pkg = buildP88W09BAcquisitionPackage({
    version: fixture.package.version,
    request: fixture.package.request,
    querySet: fixture.package.querySet,
    transaction: fixture.package.transaction,
    schemaState: fixture.package.schemaState,
    site: fixture.package.site,
    policy: fixture.package.policy,
    queryResults: fixture.package.queryResults,
    candidates: [incomplete],
  });
  const translated = translateP88W09BAcquisitionPackage({
    acquisitionPackage: pkg,
    grant: fixture.grant,
    evaluationExpiresAt: fixture.evaluationExpiresAt,
  });
  assert.equal(translated.translated.length, 0);
  assert.deepEqual(translated.skippedIncompleteCandidateIds, [incomplete.candidateId]);
  assert.equal(translated.shadowSession, null);
});

test("BE3 rejects package tampering before translation", () => {
  const fixture = buildP88W09BSyntheticFixture();
  const tampered = structuredClone(fixture.package) as any;
  tampered.site.domain = "example.com";
  assert.throws(
    () => translateP88W09BAcquisitionPackage({
      acquisitionPackage: tampered,
      grant: fixture.grant,
      evaluationExpiresAt: fixture.evaluationExpiresAt,
    }),
    /p88_w09b_acquisition_package_integrity_failure/,
  );
});

test("BE3 rejects W02 lineage drift even when the enclosing package is re-fingerprinted", () => {
  const fixture = buildP88W09BSyntheticFixture();
  const source = fixture.candidate;
  const reconstruction = structuredClone(source.reconstruction) as any;
  reconstruction.w02Materialization.proposalFingerprint = "f".repeat(64);
  const {
    candidateId: _id,
    candidateFingerprint: _fp,
    completeness: _completeness,
    incompleteReasons: _reasons,
    reconstruction: _oldReconstruction,
    ...base
  } = source;
  const driftedCandidate = buildP88W09BAcquisitionCandidate({
    ...base,
    reconstruction,
    completeness: "complete_for_w09a",
    incompleteReasons: [],
  } as any);
  const pkg = buildP88W09BAcquisitionPackage({
    version: fixture.package.version,
    request: fixture.package.request,
    querySet: fixture.package.querySet,
    transaction: fixture.package.transaction,
    schemaState: fixture.package.schemaState,
    site: fixture.package.site,
    policy: fixture.package.policy,
    queryResults: fixture.package.queryResults,
    candidates: [driftedCandidate],
  });
  assert.throws(
    () => translateP88W09BAcquisitionPackage({
      acquisitionPackage: pkg,
      grant: fixture.grant,
      evaluationExpiresAt: fixture.evaluationExpiresAt,
    }),
    /p88_w09b_w02_reconstruction_integrity_mismatch/,
  );
});

test("BE3 rejects policy identity drift", () => {
  const fixture = buildP88W09BSyntheticFixture();
  const wrongGrant = {
    ...fixture.grant,
    policyFingerprint: "f".repeat(64),
  } as any;
  assert.throws(
    () => translateP88W09BAcquisitionPackage({
      acquisitionPackage: fixture.package,
      grant: wrongGrant,
      evaluationExpiresAt: fixture.evaluationExpiresAt,
    }),
    /p88_w09b_policy_identity_mismatch/,
  );
});

test("BE3 semantics and capability freeze offline/no-authority behavior", () => {
  const semantics = p88W09BTranslatorSemantics();
  const capability = p88W09BTranslatorCapability();

  assert.equal(semantics.offlineOnly, true);
  assert.equal(semantics.packageIntegrityRequired, true);
  assert.equal(semantics.completeCandidatesOnly, true);
  assert.equal(semantics.w02Recomputed, true);
  assert.equal(semantics.w01Recomputed, true);
  assert.equal(semantics.w09aRecomputesW01Again, true);
  assert.equal(semantics.sourceProvenance, "supplied_real_snapshot");
  assert.equal(semantics.productionReadSnapshotEmitted, false);
  assert.equal(semantics.w10ActivationAuthorized, false);

  assert.equal(capability.databaseReadPerformed, false);
  assert.equal(capability.databaseWritePerformed, false);
  assert.equal(capability.providerNetworkReadPerformed, false);
  assert.equal(capability.providerWritePerformed, false);
  assert.equal(capability.persistencePerformed, false);
  assert.equal(capability.w03ToW07AuthorityCreated, false);
  assert.equal(capability.schedulerActivated, false);
  assert.equal(capability.workerActivated, false);
  assert.equal(capability.deploymentPerformed, false);
  assert.equal(capability.publicationPerformed, false);
});
