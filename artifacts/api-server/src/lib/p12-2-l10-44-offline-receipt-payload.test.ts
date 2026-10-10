import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildOfflineReleaseReceiptPayload } from "./p12-2-l10-44-offline-receipt-payload.js";

const valid = {
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  image: "ghcr.io/intssere/seo-engine@sha256:" + "c".repeat(64),
};
test("L10.44 emits only exact sanitized JSON plus newline and matching SHA-256", () => {
  const result = buildOfflineReleaseReceiptPayload(valid);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const json = Buffer.from(result.bytes).toString("utf8");
  assert.equal(json.endsWith("\n"), true);
  const parsed = JSON.parse(json);
  assert.deepEqual(Object.keys(parsed), ["schema","source_sha","source_tree","image","platform","target"]);
  assert.equal(parsed.source_sha, valid.source_sha);
  assert.equal(parsed.source_tree, valid.source_tree);
  assert.equal(parsed.image, valid.image);
  assert.equal(result.sha256, createHash("sha256").update(result.bytes).digest("hex"));
  const again = buildOfflineReleaseReceiptPayload(valid);
  assert.equal(again.ok, true);
  if (again.ok) {
    assert.equal(Buffer.from(again.bytes).toString("hex"), Buffer.from(result.bytes).toString("hex"));
    assert.equal(again.sha256, result.sha256);
  }
});
test("L10.44 rejects authorization literal, unexpected keys and invalid digest", () => {
  assert.deepEqual(buildOfflineReleaseReceiptPayload({...valid, authorization:"SECRET"}), {ok:false,code:"INVALID_BUILD_IDENTITY"});
  assert.deepEqual(buildOfflineReleaseReceiptPayload({...valid, image:"ghcr.io/intssere/seo-engine:latest"}), {ok:false,code:"INVALID_BUILD_IDENTITY"});
  assert.deepEqual(buildOfflineReleaseReceiptPayload({...valid, source_sha:"bad"}), {ok:false,code:"INVALID_BUILD_IDENTITY"});
});
