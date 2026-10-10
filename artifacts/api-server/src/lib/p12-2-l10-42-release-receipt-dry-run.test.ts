import assert from "node:assert/strict";
import test from "node:test";
import { produceDryRunReleaseReceipt } from "./p12-2-l10-42-release-receipt-dry-run.js";
const valid={source_sha:"1".repeat(40),source_tree:"2".repeat(40),image:"ghcr.io/intssere/seo-engine@sha256:"+"a".repeat(64)};
test("L10.42 dry-run projects only validated deterministic receipt fields",()=>{
  const a=produceDryRunReleaseReceipt(valid);
  assert.equal(a.ok,true);
  if(!a.ok)return;
  const parsed=JSON.parse(a.json);
  assert.deepEqual(Object.keys(parsed),["schema","source_sha","source_tree","image","platform","target"]);
  assert.equal(produceDryRunReleaseReceipt(valid).ok,true);
  assert.equal(parsed.image,valid.image);
});
test("L10.42 never serializes authorization or unknown fields",()=>{
  for(const x of [{...valid,authorization:"synthetic-placeholder"},{...valid,secret:"synthetic-placeholder"}, {...valid,source_sha:"x".repeat(40)}, {...valid,image:valid.image.replace("seo-engine@","other@")}, null])
    assert.deepEqual(produceDryRunReleaseReceipt(x),{ok:false,code:"INVALID_BUILD_IDENTITY"});
});
