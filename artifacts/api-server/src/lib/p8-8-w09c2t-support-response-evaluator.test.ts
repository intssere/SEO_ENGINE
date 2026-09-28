import assert from "node:assert/strict";
import test from "node:test";
import {
  W09_C2T_REQUIREMENTS,
  W09_C2T_SCHEMA_VERSION,
  evaluateSupportMechanism,
  type SupportMechanismAssessment,
} from "./p8-8-w09c2t-support-response-evaluator.js";

const fixture = (): SupportMechanismAssessment => ({
  schemaVersion: W09_C2T_SCHEMA_VERSION,
  mechanismName: "SyntheticDeploymentDatabaseBinding",
  documentationReference: "https://example.invalid/synthetic-control-plane",
  requirements: Object.fromEntries(W09_C2T_REQUIREMENTS.map(k => [k, "PASS"])) as SupportMechanismAssessment["requirements"],
  identityMapping: "PASS",
  lineageContinuity: "PASS",
});

test("complete explicit mechanism assessment is acceptable deterministically", () => {
  assert.deepEqual(evaluateSupportMechanism(fixture()), {
    classification: "ACCEPTABLE_MECHANISM",
    gaps: [],
    nextOfflineStep: "CERTIFY_PRODUCER_ADAPTER",
  });
  assert.deepEqual(evaluateSupportMechanism(fixture()), evaluateSupportMechanism(fixture()));
});

test("one unanswered requirement is conditional and names only the gap", () => {
  const value = fixture();
  value.requirements.bindingRevisionSemantics = "UNANSWERED";
  assert.deepEqual(evaluateSupportMechanism(value), {
    classification: "CONDITIONAL_MECHANISM",
    gaps: ["bindingRevisionSemantics"],
    nextOfflineStep: "REQUEST_BOUNDED_SUPPORT_FOLLOWUP",
  });
});

test("contradicted mandatory requirement is insufficient", () => {
  const value = fixture();
  value.requirements.exactDeploymentDatabaseAssociation = "CONTRADICTED";
  const result = evaluateSupportMechanism(value);
  assert.equal(result.classification, "INSUFFICIENT_RESPONSE");
  assert.equal(result.nextOfflineStep, "NO_LIVE_ADVANCEMENT");
});

test("missing concrete mechanism cannot be promoted from prose-like material", () => {
  const value = fixture();
  value.mechanismName = "";
  assert.equal(evaluateSupportMechanism(value).classification, "INSUFFICIENT_RESPONSE");
});

test("unknown fields fail closed rather than accepting support prose", () => {
  const value: Record<string, unknown> = fixture();
  value.supportResponseText = "Your production database is Neon project synthetic-project";
  assert.deepEqual(evaluateSupportMechanism(value), {
    classification: "INSUFFICIENT_RESPONSE",
    gaps: ["UNKNOWN_FIELD"],
    nextOfflineStep: "NO_LIVE_ADVANCEMENT",
  });
});

test("credential-shaped keys or values fail closed and are not echoed", () => {
  for (const mutate of [
    (x: Record<string, unknown>) => { x.DATABASE_URL = "postgresql://user:pass@example.invalid/db"; },
    (x: Record<string, unknown>) => { x.documentationReference = "postgresql://user:pass@example.invalid/db"; },
  ]) {
    const value: Record<string, unknown> = fixture();
    mutate(value);
    const result = evaluateSupportMechanism(value);
    assert.equal(result.classification, "INSUFFICIENT_RESPONSE");
    assert.deepEqual(result.gaps, ["CREDENTIAL_SHAPED_INPUT"]);
    assert.doesNotMatch(JSON.stringify(result), /postgresql:\/\/|user:pass/);
  }
});

test("identity mapping and lineage continuity must both pass", () => {
  const identity = fixture();
  identity.identityMapping = "UNANSWERED";
  assert.equal(evaluateSupportMechanism(identity).classification, "CONDITIONAL_MECHANISM");

  const lineage = fixture();
  lineage.lineageContinuity = "CONTRADICTED";
  assert.equal(evaluateSupportMechanism(lineage).classification, "INSUFFICIENT_RESPONSE");
});

test("unknown or missing requirement verdicts fail closed", () => {
  const unknown = fixture() as unknown as Record<string, unknown>;
  (unknown.requirements as Record<string, unknown>).extra = "PASS";
  assert.equal(evaluateSupportMechanism(unknown).classification, "INSUFFICIENT_RESPONSE");

  const missing = fixture() as unknown as Record<string, unknown>;
  delete (missing.requirements as Record<string, unknown>).authoritativeProvenance;
  assert.equal(evaluateSupportMechanism(missing).classification, "INSUFFICIENT_RESPONSE");
});
