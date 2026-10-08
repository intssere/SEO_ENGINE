import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUgp1033CertificationPlan,
  createUgp1033ControlledHttpsAdapter,
  UGP_10_33_RECEIVER_VERSION,
} from "./authority-outreach-ugp-10-33-certification.js";
import {
  buildUgp1033ControlledCertificationFixture,
} from "./authority-outreach-ugp-10-33-fixture.js";

const SOURCE="a".repeat(40);
const URL="https://ugp-10-33-ci.up.railway.app/ugp-10-33/receive";

test("UGP-10.33 plan freezes one exact Railway HTTPS call and derives exact authorization literal",()=>{
  const built=buildUgp1033ControlledCertificationFixture({
    sourceCommitSha:SOURCE,
    receiverUrl:URL,
  });
  const plan=built.plan;
  assert.equal(plan.receiverUrl,URL);
  assert.equal(plan.receiverDomain,"ugp-10-33-ci.up.railway.app");
  assert.equal(plan.maxCalls,1);
  assert.equal(plan.maxAttemptsPerCall,1);
  assert.equal(plan.automaticRetry,false);
  assert.equal(plan.maxConcurrency,1);
  assert.equal(plan.productionAllowed,false);
  assert.equal(plan.schedulerAllowed,false);
  assert.equal(plan.workerAllowed,false);
  assert.match(plan.planFingerprint,/^[0-9a-f]{64}$/);
  assert.equal(
    plan.authorizationLiteral,
    [
      "AUTHORIZE",
      "UGP_10_33_CONTROLLED_REAL_WEB_SUBMISSION",
      SOURCE,
      plan.planFingerprint,
    ].join(":"),
  );
});

test("UGP-10.33 rejects non-Railway, non-HTTPS, query, and path drift",()=>{
  for(const receiverUrl of [
    "http://ugp-10-33-ci.up.railway.app/ugp-10-33/receive",
    "https://example.com/ugp-10-33/receive",
    "https://ugp-10-33-ci.up.railway.app/wrong",
    "https://ugp-10-33-ci.up.railway.app/ugp-10-33/receive?x=1",
  ]){
    assert.throws(
      ()=>buildUgp1033CertificationPlan({
        sourceCommitSha:SOURCE,
        receiverUrl,
        executionFingerprint:"b".repeat(64),
        payloadFingerprint:"c".repeat(64),
      }),
      /receiver_url_/,
    );
  }
});

test("UGP-10.33 controlled adapter makes exactly one injected call and validates receiver receipt",async()=>{
  const built=buildUgp1033ControlledCertificationFixture({
    sourceCommitSha:SOURCE,
    receiverUrl:URL,
  });
  let calls=0;
  const fetchImpl=async()=>{
    calls+=1;
    return new Response(JSON.stringify({
      version:UGP_10_33_RECEIVER_VERSION,
      accepted:true,
      executionFingerprint:built.executionIntent.executionFingerprint,
      payloadFingerprint:built.executionIntent.payloadFingerprint,
      receiptFingerprint:"d".repeat(64),
    }),{
      status:200,
      headers:{"content-type":"application/json"},
    });
  };
  const adapter=createUgp1033ControlledHttpsAdapter({
    plan:built.plan,
    authorizationLiteral:built.plan.authorizationLiteral,
    fetchImpl,
  });
  const receipt=await adapter.send(built.executionIntent);
  assert.equal(receipt.outcome,"accepted");
  assert.equal(receipt.networkOperationPerformed,true);
  assert.equal(receipt.automaticRetryPerformed,false);
  assert.equal(calls,1);
  await assert.rejects(
    ()=>adapter.send(built.executionIntent),
    /second_network_attempt_forbidden/,
  );
  assert.equal(calls,1);
});

test("UGP-10.33 exact authorization is required before adapter construction",()=>{
  const built=buildUgp1033ControlledCertificationFixture({
    sourceCommitSha:SOURCE,
    receiverUrl:URL,
  });
  assert.throws(
    ()=>createUgp1033ControlledHttpsAdapter({
      plan:built.plan,
      authorizationLiteral:"wrong",
      fetchImpl:async()=>new Response(),
    }),
    /exact_authorization_literal_required/,
  );
});
