import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTENT_ADDRESSED_TRANSPORT_SCHEMA,
  evaluateContentAddressedImageTransport,
} from "./p8-8-w09c3fa-f11-content-addressed-image-transport.js";

const digest = "sha256:" + "a".repeat(64);
const base = {
  schema: CONTENT_ADDRESSED_TRANSPORT_SCHEMA,
  sourceMode: "content_addressed_oci_image" as const,
  registry: "ghcr" as const,
  repository: "ghcr.io/intssere/seo-engine",
  imageDigest: digest,
  canonicalRepository: "intssere/SEO_ENGINE",
  canonicalCommitSha: "b".repeat(40),
  canonicalTreeSha: "c".repeat(40),
  sourceArtifactSha256: "d".repeat(64),
  buildProvenanceDigest: "sha256:" + "e".repeat(64),
  railwayProjectId: "project-1",
  railwayEnvironmentId: "environment-1",
  railwayServiceId: "service-1",
  railwaySourceImage: "ghcr.io/intssere/seo-engine@" + digest,
};

test("exact digest-pinned Railway image source passes", () => {
  assert.deepEqual(evaluateContentAddressedImageTransport(base), {
    result: "pass",
    immutableImageReference: base.railwaySourceImage,
  });
});

test("mutable tag fails closed", () => {
  assert.deepEqual(evaluateContentAddressedImageTransport({
    ...base, railwaySourceImage: "ghcr.io/intssere/seo-engine:latest",
  }), { result: "fail_closed", code: "mutable_image_reference" });
});

test("different digest fails closed", () => {
  assert.deepEqual(evaluateContentAddressedImageTransport({
    ...base, railwaySourceImage: "ghcr.io/intssere/seo-engine@sha256:" + "f".repeat(64),
  }), { result: "fail_closed", code: "digest_mismatch" });
});

test("unknown fields and malformed lineage fail closed", () => {
  assert.deepEqual(evaluateContentAddressedImageTransport({
    ...base, extra: true,
  }), { result: "fail_closed", code: "invalid_evidence" });
  assert.deepEqual(evaluateContentAddressedImageTransport({
    ...base, canonicalCommitSha: "not-a-sha",
  }), { result: "fail_closed", code: "invalid_evidence" });
});

test("credential-shaped material fails closed", () => {
  assert.deepEqual(evaluateContentAddressedImageTransport({
    ...base, token: "secret",
  }), { result: "fail_closed", code: "credential_shaped_material" });
});
