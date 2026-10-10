import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildOfflineReleaseReceiptPayload } from "./p12-2-l10-44-offline-receipt-payload.js";
import { verifyOfflineReleaseReceiptPayload } from "./p12-2-l10-45-offline-receipt-integrity.js";
const identity = {source_sha:"a".repeat(40),source_tree:"b".repeat(40),image:"ghcr.io/intssere/seo-engine@sha256:"+"c".repeat(64)};
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
test("L10.45 verifies exact deterministic L10.44 bytes and checksum",()=>{
  const payload=buildOfflineReleaseReceiptPayload(identity);
  assert.equal(payload.ok,true);
  if (payload.ok) assert.equal(verifyOfflineReleaseReceiptPayload(payload.bytes,payload.sha256),true);
});
test("L10.45 fails closed on tamper, missing checksum and authorization field",()=>{
  const payload=buildOfflineReleaseReceiptPayload(identity);
  assert.equal(payload.ok,true);
  if(!payload.ok)return;
  assert.equal(verifyOfflineReleaseReceiptPayload(payload.bytes,"0".repeat(64)),false);
  assert.equal(verifyOfflineReleaseReceiptPayload(payload.bytes,"invalid"),false);
  const parsed=JSON.parse(Buffer.from(payload.bytes).toString("utf8"));
  for (const modified of [{...parsed,authorization:"SECRET"},{...parsed,platform:"linux/arm64"},{...parsed,image:"ghcr.io/intssere/seo-engine:latest"}]) {
    const raw=JSON.stringify(modified)+"\n";
    assert.equal(verifyOfflineReleaseReceiptPayload(Buffer.from(raw),digest(raw)),false);
  }
  const pretty=JSON.stringify(parsed,null,2)+"\n";
  assert.equal(verifyOfflineReleaseReceiptPayload(Buffer.from(pretty),digest(pretty)),false);
  assert.equal(verifyOfflineReleaseReceiptPayload(Buffer.from("{bad"),digest("{bad")),false);
});
