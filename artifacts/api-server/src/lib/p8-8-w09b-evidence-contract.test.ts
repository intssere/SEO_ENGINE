import assert from "node:assert/strict";
import test from "node:test";
import {
  P8_8_W09B_QUERY_DESCRIPTORS,
  P8_8_W09B_QUERY_SET_FINGERPRINT,
  assertP88W09BAcquisitionPackageIntegrity,
  assertP88W09BQueryDescriptors,
  buildP88W09BAcquisitionCandidate,
  buildP88W09BAcquisitionPackage,
  buildP88W09BQueryResult,
  p88W09BAcquisitionPackageIntegrityIssues,
  p88W09BEvidenceCapability,
  p88W09BEvidenceSemantics,
  p88W09BQueryDescriptorIssues,
  p88W09BQuerySetFingerprint,
} from "./p8-8-w09b-evidence-contract.js";
import { buildP88W09BSyntheticFixture } from "./p8-8-w09b-test-fixture.js";

test("W09-BE1 freezes exactly 18 SELECT-only query descriptors", () => {
  assert.equal(P8_8_W09B_QUERY_DESCRIPTORS.length, 18);
  assert.deepEqual(p88W09BQueryDescriptorIssues(), []);
  assert.doesNotThrow(() => assertP88W09BQueryDescriptors());
  assert.equal(
    p88W09BQuerySetFingerprint(P8_8_W09B_QUERY_DESCRIPTORS),
    P8_8_W09B_QUERY_SET_FINGERPRINT,
  );
  assert.equal(
    new Set(P8_8_W09B_QUERY_DESCRIPTORS.map((item) => item.queryId)).size,
    18,
  );
  for (const descriptor of P8_8_W09B_QUERY_DESCRIPTORS) {
    assert.match(descriptor.sql.trim(), /^SELECT\b/i);
  }
});

test("query-set fingerprint changes when SQL or row caps change", () => {
  const first = P8_8_W09B_QUERY_DESCRIPTORS[0]!;
  const changedSql = [
    { ...first, sql: first.sql + " " },
    ...P8_8_W09B_QUERY_DESCRIPTORS.slice(1),
  ];
  const changedCap = [
    { ...first, maxRowsPerInvocation: first.maxRowsPerInvocation + 1 },
    ...P8_8_W09B_QUERY_DESCRIPTORS.slice(1),
  ];
  assert.notEqual(
    p88W09BQuerySetFingerprint(changedSql as any),
    P8_8_W09B_QUERY_SET_FINGERPRINT,
  );
  assert.notEqual(
    p88W09BQuerySetFingerprint(changedCap as any),
    P8_8_W09B_QUERY_SET_FINGERPRINT,
  );
});

test("canonical synthetic acquisition package is deterministic and integrity-valid", () => {
  const first = buildP88W09BSyntheticFixture();
  const second = buildP88W09BSyntheticFixture();

  assert.deepEqual(first.package, second.package);
  assert.deepEqual(p88W09BAcquisitionPackageIntegrityIssues(first.package), []);
  assert.doesNotThrow(() => assertP88W09BAcquisitionPackageIntegrity(first.package));
  assert.equal(first.package.candidates.length, 1);
  assert.equal(first.package.candidates[0]!.completeness, "complete_for_w09a");
  assert.equal(first.package.summary.completeCount, 1);
  assert.equal(first.package.summary.incompleteCount, 0);
  assert.match(first.package.packageFingerprint, /^[0-9a-f]{64}$/);
});

test("package, candidate, query-result and summary tampering is detected", () => {
  const fixture = buildP88W09BSyntheticFixture();

  const packageTamper = structuredClone(fixture.package) as any;
  packageTamper.site.domain = "example.com";
  assert.ok(
    p88W09BAcquisitionPackageIntegrityIssues(packageTamper).includes(
      "p88_w09b_package_fingerprint_mismatch",
    ),
  );

  const candidateTamper = structuredClone(fixture.package) as any;
  candidateTamper.candidates[0].derivedCurrentState.mutationQuotaRemaining = 0;
  assert.ok(
    p88W09BAcquisitionPackageIntegrityIssues(candidateTamper).includes(
      "p88_w09b_candidate_fingerprint_mismatch",
    ),
  );

  const queryTamper = structuredClone(fixture.package) as any;
  queryTamper.queryResults[0].rows[0].database_name = "tampered";
  assert.ok(
    p88W09BAcquisitionPackageIntegrityIssues(queryTamper).includes(
      "p88_w09b_query_result_fingerprint_mismatch",
    ),
  );

  const summaryTamper = structuredClone(fixture.package) as any;
  summaryTamper.summary.completeCount = 0;
  assert.ok(
    p88W09BAcquisitionPackageIntegrityIssues(summaryTamper).includes(
      "p88_w09b_package_summary_mismatch",
    ),
  );
});

test("unexpected query IDs and missing mandatory query are rejected", () => {
  const fixture = buildP88W09BSyntheticFixture();
  const missing = structuredClone(fixture.package) as any;
  missing.queryResults = missing.queryResults.filter(
    (item: any) => item.queryId !== "w09b.site_identity.v1",
  );
  assert.ok(
    p88W09BAcquisitionPackageIntegrityIssues(missing).includes(
      "p88_w09b_mandatory_query_missing",
    ),
  );

  const unexpected = structuredClone(fixture.package) as any;
  unexpected.queryResults.push({
    ...unexpected.queryResults[0],
    queryId: "w09b.unreviewed.v1",
  });
  assert.ok(
    p88W09BAcquisitionPackageIntegrityIssues(unexpected).includes(
      "p88_w09b_query_not_frozen",
    ),
  );
});

test("candidate builder orders incomplete reasons and never labels them complete", () => {
  const fixture = buildP88W09BSyntheticFixture();
  const source = fixture.candidate;
  const {
    candidateId: _id,
    candidateFingerprint: _fp,
    completeness: _completeness,
    incompleteReasons: _reasons,
    ...base
  } = source;
  const rebuilt = buildP88W09BAcquisitionCandidate({
    ...base,
    completeness: "complete_for_w09a",
    incompleteReasons: [
      "provider_before_stale",
      "missing_product_gid",
      "provider_before_stale",
    ],
  } as any);
  assert.equal(rebuilt.completeness, "missing_product_gid");
  assert.deepEqual(rebuilt.incompleteReasons, [
    "missing_product_gid",
    "provider_before_stale",
  ]);
});

test("query result overflow marker follows descriptor cap", () => {
  const descriptor = P8_8_W09B_QUERY_DESCRIPTORS.find(
    (item) => item.queryId === "w09b.site_identity.v1",
  )!;
  const result = buildP88W09BQueryResult({
    descriptor,
    invocationIndex: 0,
    parameters: { domain: "diamondshelf.us" },
    rows: [{ id: "1" }, { id: "2" }, { id: "3" }],
  });
  assert.equal(result.overflowDetected, true);
  assert.equal(result.rowCount, 3);
});

test("BE1 semantics/capability remain non-authorizing", () => {
  const semantics = p88W09BEvidenceSemantics();
  const capability = p88W09BEvidenceCapability();

  assert.equal(semantics.syntheticEngineeringOnly, true);
  assert.equal(semantics.realProductionRunAuthorized, false);
  assert.equal(semantics.providerReadAuthorized, false);
  assert.equal(semantics.persistenceAuthorized, false);
  assert.equal(semantics.productionReadSnapshotAllowed, false);
  assert.equal(semantics.productGidMayBeInferred, false);
  assert.equal(semantics.providerAuthorityMayBeInferredFromLabels, false);
  assert.equal(semantics.w10ActivationAuthorized, false);

  assert.equal(capability.productionDatabaseAccessPerformed, false);
  assert.equal(capability.providerNetworkReadPerformed, false);
  assert.equal(capability.providerWritePerformed, false);
  assert.equal(capability.persistencePerformed, false);
  assert.equal(capability.migrationPerformed, false);
  assert.equal(capability.w03ToW07AuthorityCreated, false);
  assert.equal(capability.schedulerActivated, false);
  assert.equal(capability.workerActivated, false);
  assert.equal(capability.deploymentPerformed, false);
  assert.equal(capability.publicationPerformed, false);
});

test("rebuilt package fingerprint changes with candidate completeness", () => {
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
    incompleteReasons: ["missing_product_gid"],
  } as any);
  const rebuilt = buildP88W09BAcquisitionPackage({
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
  assert.notEqual(rebuilt.packageFingerprint, fixture.package.packageFingerprint);
  assert.equal(rebuilt.summary.completeCount, 0);
  assert.equal(rebuilt.summary.incompleteCount, 1);
});
