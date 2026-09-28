import assert from "node:assert/strict";
import test from "node:test";
import { attestCapturedWebflowJson, runOfflineWebflowHarness, UGP_WEBFLOW_OFFLINE_HARNESS_VERSION } from "./webflow-captured-evidence-cli.js";

const pages=JSON.stringify({pages:[{id:"p1",title:"Home"}]});
const collections=JSON.stringify({collections:[{id:"c1",displayName:"Articles"}]});

test("offline harness emits deterministic sanitized attestation",()=>{
 const first=runOfflineWebflowHarness(["pages.json","collections.json"],p=>p==="pages.json"?pages:collections);
 const second=runOfflineWebflowHarness(["pages.json","collections.json"],p=>p==="pages.json"?pages:collections);
 assert.equal(first,second);
 const out=JSON.parse(first);
 assert.equal(out.harnessVersion,UGP_WEBFLOW_OFFLINE_HARNESS_VERSION);
 assert.equal(out.assertions.offlineOnly,true);
 assert.equal(out.assertions.networkCalls,false);
 assert.equal(out.assertions.credentials,false);
 assert.deepEqual(out.receipts.map((r:any)=>[r.resource,r.responseBytes]),[["pages",576],["collections",214]]);
 assert.equal(JSON.stringify(out).includes("Authorization"),false);
 assert.equal(JSON.stringify(out).includes("Bearer"),false);
});

test("harness fails closed on argument count and malformed JSON",()=>{
 assert.throws(()=>runOfflineWebflowHarness([],()=>pages),/exact_two_capture_paths/);
 assert.throws(()=>runOfflineWebflowHarness(["a","b","c"],()=>pages),/exact_two_capture_paths/);
 assert.throws(()=>attestCapturedWebflowJson({pagesJson:"{",collectionsJson:collections}));
});

test("payload tampering changes deterministic receipt state",()=>{
 const a=attestCapturedWebflowJson({pagesJson:pages,collectionsJson:collections});
 const b=attestCapturedWebflowJson({pagesJson:JSON.stringify({pages:[{id:"p2"}]}),collectionsJson:collections});
 assert.notEqual(a.receipts[0]?.receipt.stateFingerprint,b.receipts[0]?.receipt.stateFingerprint);
 assert.notEqual(a.receipts[0]?.receipt.receiptFingerprint,b.receipts[0]?.receipt.receiptFingerprint);
});
