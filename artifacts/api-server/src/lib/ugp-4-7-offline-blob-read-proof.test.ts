import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { attestUGP47CapturedBlob } from "./ugp-4-7-offline-blob-read-proof.js";

const digest = (alg: "sha1"|"sha256", bytes: Buffer) => createHash(alg).update(bytes).digest("hex");
function fixture(data = "sample offline content") {
  const bytes = Buffer.from(data,"utf8");
  const header = Buffer.from("blob " + bytes.length + "\0","utf8");
  return {
    repositoryId:1234, baseSha:"a".repeat(40), path:"content/page.md", mode:"100644",
    blobSha:digest("sha1",Buffer.concat([header,bytes])),
    contentSha256:digest("sha256",bytes),
    contentBase64:bytes.toString("base64")
  };
}
const review = (v: unknown) => attestUGP47CapturedBlob(JSON.stringify(v));
function unsafe(v: unknown) {
  const result = attestUGP47CapturedBlob(v);
  assert.equal(result.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(result.gitReadAuthorized,false);
  assert.equal(result.gitWriteAuthorized,false);
  assert.equal(result.independentlyCertified,false);
}
test("captured bytes match a Git blob OID but cannot authenticate a provider",() => {
  const a=review(fixture()),b=review(fixture());
  assert.equal(a.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
  assert.deepEqual(a,b);
  assert.equal(a.gitReadAuthorized,false);
  assert.equal(a.gitWriteAuthorized,false);
  assert.equal(a.independentlyCertified,false);
});
test("mismatched content, SHA, file mode and unsafe paths reject",() => {
  const mutations: ((x: ReturnType<typeof fixture>) => void)[] = [
    x => {x.contentBase64=Buffer.from("modified").toString("base64");},
    x => {x.blobSha="b".repeat(40);},
    x => {x.contentSha256="b".repeat(64);},
    x => {x.baseSha="b";},
    x => {x.mode="120000";},
    x => {x.repositoryId=0;},
    x => {x.path="../config";},
    x => {x.path=".git/config";},
    x => {x.path="content/%2e%2e/config";},
    x => {x.path="/root";},
    x => {x.contentBase64="AA===";},
    x => {x.contentBase64="++++";},
    x => {x.contentBase64="AB==";}
  ];
  for (const mutate of mutations) {
    const x=fixture();mutate(x);
    unsafe(JSON.stringify(x));
  }
});
test("missing, unknown and oversized input denies",() => {
  unsafe(null);unsafe("");unsafe("[]");unsafe("{");
  unsafe(JSON.stringify({...fixture(), gitWriteAuthorized:true}));
  unsafe(JSON.stringify({...fixture(), contentBase64:"A".repeat(90000)}));
  unsafe("x".repeat(150000));
});
test("empty blob is verifiable without implying authorization",() => {
  const x=review(fixture(""));
  assert.equal(x.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
  assert.equal(x.gitReadAuthorized,false);
});
