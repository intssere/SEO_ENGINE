import assert from "node:assert/strict";
import test from "node:test";
import { buildSanitizedReceiptArtifact } from "./p12-2-l10-40-sanitized-receipt-artifact.js";

const sample={source_sha:"1".repeat(40),source_tree:"2".repeat(40),image:"ghcr.io/intssere/seo-engine@sha256:"+"a".repeat(64)};
test("L10.40 emits deterministic allowlisted artifact with no credential fields",()=>{
  const r=buildSanitizedReceiptArtifact(sample);
  assert.equal(r.ok,true);
  if(!r.ok) return;
  assert.deepEqual(Object.keys(r.artifact),["schema","source_sha","source_tree","image","platform","target"]);
  assert.equal(r.artifact.image,sample.image);
  assert.equal(JSON.stringify(r),JSON.stringify(buildSanitizedReceiptArtifact({...sample})));
});
test("L10.40 rejects secrets and extraneous/unknown fields",()=>{
  for(const value of [
    {...sample,authorization:"synthetic-placeholder"},
    {...sample,token:"synthetic-placeholder"},
    {...sample,source_sha:"f".repeat(39)},
    {...sample,image:"ghcr.io/intssere/other@sha256:"+"a".repeat(64)},
    {...sample,image:"ghcr.io/intssere/seo-engine:latest"},
    {...sample,source_tree:"2".repeat(40)+"\x1b"},
    null,[],{},
  ]) assert.equal(buildSanitizedReceiptArtifact(value).ok,false);
});
