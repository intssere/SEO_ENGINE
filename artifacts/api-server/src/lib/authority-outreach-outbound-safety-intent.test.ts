import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAuthorityOutreachOutboundSafetyIntentIntegrity,
  buildAuthorityOutreachOutboundSafetyIntent,
} from "./authority-outreach-outbound-safety-intent.js";
import { buildUgp1031AuthorizationFixture } from "./authority-outreach-ugp-10-31-test-fixture.js";

test("UGP-10.31 builds deterministic provider-free safety intent from exact approved UGP-10.29 lineage",()=>{
  const f=buildUgp1031AuthorizationFixture("email_address");
  const input={
    deliveryBindingAuthorizationDecision:f.deliveryBindingAuthorizationDecision,
    deliveryBindingAuthorizationDecisionInput:
      f.deliveryBindingAuthorizationDecisionInput,
  };
  const first=buildAuthorityOutreachOutboundSafetyIntent(input);
  const second=buildAuthorityOutreachOutboundSafetyIntent(input);
  assert.deepEqual(second,first);
  assert.equal(first.ownedSiteDomain,f.deliveryBindingAuthorizationDecision.targetDomain);
  assert.equal(first.recipientDomain,f.deliveryBindingAuthorizationDecision.sourceDomain);
  assert.equal(first.selectedContactPointFingerprint,
    f.deliveryBindingAuthorizationDecision.selectedContactPointFingerprint);
  assert.equal(first.ratePolicy.contactMaximumReservations,1);
  assert.equal(first.ratePolicy.contactWindowSeconds,604800);
  assert.equal(first.ratePolicy.domainMaximumReservations,5);
  assert.equal(first.ratePolicy.domainWindowSeconds,86400);
  assert.equal(first.ratePolicy.reservationTtlSeconds,900);
  assert.equal(first.semantics.providerFree,true);
  assert.equal(first.semantics.durableSuppressionRequired,true);
  assert.equal(first.semantics.permanentLogicalSendIdempotencyRequired,true);
  assert.equal(first.semantics.uncertainAttemptFenceRequired,true);
  assert.equal(first.semantics.sendAuthorizationGranted,false);
  assert.equal(first.semantics.outreachSendingAuthorized,false);
  assert.equal(first.semantics.performsNetworkOperation,false);
  assert.equal(first.semantics.performsPersistence,false);
  assertAuthorityOutreachOutboundSafetyIntentIntegrity(first,input);

  const tampered=structuredClone(first);
  Object.assign(tampered,{recipientDomain:"tampered.example"});
  assert.throws(
    ()=>assertAuthorityOutreachOutboundSafetyIntentIntegrity(tampered,input),
    /ugp_outreach_outbound_safety_intent_integrity_mismatch/,
  );
});

test("UGP-10.31 channel-specific approved decisions produce distinct logical sends without raw contact values",()=>{
  const email=buildUgp1031AuthorizationFixture("email_address");
  const web=buildUgp1031AuthorizationFixture("web_contact_form");
  const emailIntent=buildAuthorityOutreachOutboundSafetyIntent({
    deliveryBindingAuthorizationDecision:email.deliveryBindingAuthorizationDecision,
    deliveryBindingAuthorizationDecisionInput:
      email.deliveryBindingAuthorizationDecisionInput,
  });
  const webIntent=buildAuthorityOutreachOutboundSafetyIntent({
    deliveryBindingAuthorizationDecision:web.deliveryBindingAuthorizationDecision,
    deliveryBindingAuthorizationDecisionInput:
      web.deliveryBindingAuthorizationDecisionInput,
  });
  assert.notEqual(emailIntent.logicalSendKey,webIntent.logicalSendKey);
  assert.notEqual(
    emailIntent.selectedContactPointFingerprint,
    webIntent.selectedContactPointFingerprint,
  );
  assert.match(emailIntent.logicalSendKey,/^[0-9a-f]{64}$/);
  assert.match(webIntent.logicalSendKey,/^[0-9a-f]{64}$/);
});

test("UGP-10.31 rejects rejected or deferred UGP-10.29 decisions",()=>{
  for(const [decision,reason] of [
    [
      "reject_delivery_binding_authorization_preparation",
      "authorization_preparation_rejected",
    ],
    [
      "defer_delivery_binding_authorization_review",
      "needs_more_authorization_context",
    ],
  ] as const){
    const f=buildUgp1031AuthorizationFixture("email_address",decision,reason);
    assert.throws(
      ()=>buildAuthorityOutreachOutboundSafetyIntent({
        deliveryBindingAuthorizationDecision:f.deliveryBindingAuthorizationDecision,
        deliveryBindingAuthorizationDecisionInput:
          f.deliveryBindingAuthorizationDecisionInput,
      }),
      /ugp_outreach_outbound_safety_approved_ugp_10_29_decision_required/,
    );
  }
});
