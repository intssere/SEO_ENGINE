import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuthorityOutreachSingleSendExecutionIntent,
} from "./authority-outreach-single-send-intent.js";
import {
  buildAuthorityOutreachOutboundSafetyIntent,
} from "./authority-outreach-outbound-safety-intent.js";
import { buildUgp1031AuthorizationFixture } from "./authority-outreach-ugp-10-31-test-fixture.js";

function receipt(){
  const f=buildUgp1031AuthorizationFixture("email_address");
  const safety=buildAuthorityOutreachOutboundSafetyIntent({
    deliveryBindingAuthorizationDecision:f.deliveryBindingAuthorizationDecision,
    deliveryBindingAuthorizationDecisionInput:
      f.deliveryBindingAuthorizationDecisionInput,
  });
  return {
    fixture:f,
    reservation:{
      version:"ugp-10-31-outbound-safety-reservation-v1" as const,
      reservationId:safety.reservationId,
      reservationFingerprint:safety.reservationFingerprint,
      logicalSendKey:safety.logicalSendKey,
      deliveryBindingAuthorizationDecisionFingerprint:
        safety.deliveryBindingAuthorizationDecisionFingerprint,
      prospectFingerprint:safety.prospectFingerprint,
      opportunityFingerprint:safety.opportunityFingerprint,
      candidateFingerprint:safety.candidateFingerprint,
      selectedRoleCandidateFingerprint:safety.selectedRoleCandidateFingerprint,
      selectedContactPointFingerprint:safety.selectedContactPointFingerprint,
      sendReviewFingerprint:safety.sendReviewFingerprint,
      qualityGateFingerprint:safety.qualityGateFingerprint,
      recipientDomain:safety.recipientDomain,
      status:"reserved" as const,
      reservedAt:"2026-10-07T15:30:00.000Z",
      expiresAt:"2026-10-07T15:45:00.000Z",
      terminalAt:null,
      terminalReason:null,
      durable:true as const,
      providerDispatchAuthorized:false as const,
      messageTransmissionAuthorized:false as const,
      sendAuthorizationGranted:false as const,
      receiptFingerprint:"f".repeat(64),
    },
  };
}

test("UGP-10.32 execution intent binds exact selected contact and reviewed message",()=>{
  const {fixture,reservation}=receipt();
  const payload={
    contactPointType:fixture.contactPointType,
    contactPointValue:fixture.contactPointValue,
    sourceDomain:fixture.deliveryBindingAuthorizationDecision.sourceDomain,
    requestFingerprint:fixture.request.requestFingerprint,
    subject:fixture.candidate.subject,
    body:fixture.candidate.body,
  };
  const first=buildAuthorityOutreachSingleSendExecutionIntent({reservation,payload});
  const second=buildAuthorityOutreachSingleSendExecutionIntent({reservation,payload});
  assert.deepEqual(second,first);
  assert.equal(first.selectedContactPointFingerprint,reservation.selectedContactPointFingerprint);
  assert.equal(first.candidateFingerprint,reservation.candidateFingerprint);
  assert.equal(first.adapterClass,"mock");
  assert.equal(first.semantics.oneRecipientOnly,true);
  assert.equal(first.semantics.oneMessageOnly,true);

  assert.throws(
    ()=>buildAuthorityOutreachSingleSendExecutionIntent({
      reservation,
      payload:{...payload,subject:payload.subject+" changed"},
    }),
    /ugp10_32_reviewed_message_payload_mismatch/,
  );
  assert.throws(
    ()=>buildAuthorityOutreachSingleSendExecutionIntent({
      reservation,
      payload:{...payload,contactPointValue:"other@publisher.example.org"},
    }),
    /ugp10_32_selected_contact_payload_mismatch/,
  );
});
