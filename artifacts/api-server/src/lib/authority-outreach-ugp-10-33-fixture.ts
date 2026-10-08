import {
  buildAuthorityOutreachOutboundSafetyIntent,
  type AuthorityOutreachOutboundSafetyIntent,
} from "./authority-outreach-outbound-safety-intent.js";
import type {
  AuthorityOutreachOutboundSafetyReceipt,
} from "./authority-outreach-outbound-safety-store.js";
import {
  authorityOutreachSingleSendStableHash,
  buildAuthorityOutreachSingleSendExecutionIntentForAdapter,
  type AuthorityOutreachSingleSendPayload,
} from "./authority-outreach-single-send-intent.js";
import {
  buildUgp1033CertificationPlan,
} from "./authority-outreach-ugp-10-33-certification.js";
import {
  buildUgp1031AuthorizationFixture,
} from "./authority-outreach-ugp-10-31-test-fixture.js";

export function buildUgp1033ControlledCertificationFixture(input:{
  sourceCommitSha:string;
  receiverUrl:string;
}){
  const receiver=new URL(input.receiverUrl);
  const previousDomain=process.env.UGP_10_33_CERT_RECEIVER_DOMAIN;
  const previousUrl=process.env.UGP_10_33_CERT_RECEIVER_URL;
  process.env.UGP_10_33_CERT_RECEIVER_DOMAIN=receiver.hostname;
  process.env.UGP_10_33_CERT_RECEIVER_URL=receiver.toString();
  try{
    const fixture=buildUgp1031AuthorizationFixture(
      "web_contact_form",
      "approve_for_separate_delivery_binding_operational_authorization",
      "authorization_preparation_sufficient_for_separate_operational_authorization",
      "f",
    );
    const safetyIntentInput={
      deliveryBindingAuthorizationDecision:
        fixture.deliveryBindingAuthorizationDecision,
      deliveryBindingAuthorizationDecisionInput:
        fixture.deliveryBindingAuthorizationDecisionInput,
    };
    const safetyIntent=buildAuthorityOutreachOutboundSafetyIntent(
      safetyIntentInput,
    );
    const reservation=syntheticReservedReceipt(safetyIntent);
    const payload:AuthorityOutreachSingleSendPayload=Object.freeze({
      contactPointType:"web_contact_form",
      contactPointValue:receiver.toString(),
      sourceDomain:receiver.hostname,
      requestFingerprint:fixture.request.requestFingerprint,
      subject:fixture.candidate.subject,
      body:fixture.candidate.body,
    });
    const executionIntent=
      buildAuthorityOutreachSingleSendExecutionIntentForAdapter(
        {reservation,payload},
        "controlled_https_cert",
      );
    const plan=buildUgp1033CertificationPlan({
      sourceCommitSha:input.sourceCommitSha,
      receiverUrl:receiver.toString(),
      executionFingerprint:executionIntent.executionFingerprint,
      payloadFingerprint:executionIntent.payloadFingerprint,
    });
    return Object.freeze({
      fixture,
      safetyIntentInput,
      safetyIntent,
      payload,
      executionIntent,
      plan,
    });
  }finally{
    if(previousDomain===undefined){
      delete process.env.UGP_10_33_CERT_RECEIVER_DOMAIN;
    }else{
      process.env.UGP_10_33_CERT_RECEIVER_DOMAIN=previousDomain;
    }
    if(previousUrl===undefined){
      delete process.env.UGP_10_33_CERT_RECEIVER_URL;
    }else{
      process.env.UGP_10_33_CERT_RECEIVER_URL=previousUrl;
    }
  }
}

function syntheticReservedReceipt(
  safetyIntent:AuthorityOutreachOutboundSafetyIntent,
):AuthorityOutreachOutboundSafetyReceipt{
  const base={
    version:"ugp-10-31-outbound-safety-reservation-v1" as const,
    reservationId:safetyIntent.reservationId,
    reservationFingerprint:safetyIntent.reservationFingerprint,
    logicalSendKey:safetyIntent.logicalSendKey,
    deliveryBindingAuthorizationDecisionFingerprint:
      safetyIntent.deliveryBindingAuthorizationDecisionFingerprint,
    prospectFingerprint:safetyIntent.prospectFingerprint,
    opportunityFingerprint:safetyIntent.opportunityFingerprint,
    candidateFingerprint:safetyIntent.candidateFingerprint,
    selectedRoleCandidateFingerprint:
      safetyIntent.selectedRoleCandidateFingerprint,
    selectedContactPointFingerprint:
      safetyIntent.selectedContactPointFingerprint,
    sendReviewFingerprint:safetyIntent.sendReviewFingerprint,
    qualityGateFingerprint:safetyIntent.qualityGateFingerprint,
    recipientDomain:safetyIntent.recipientDomain,
    status:"reserved" as const,
    reservedAt:"2026-10-08T10:00:00.000Z",
    expiresAt:"2026-10-08T10:15:00.000Z",
    terminalAt:null,
    terminalReason:null,
    durable:true as const,
    providerDispatchAuthorized:false as const,
    messageTransmissionAuthorized:false as const,
    sendAuthorizationGranted:false as const,
  };
  return Object.freeze({
    ...base,
    receiptFingerprint:authorityOutreachSingleSendStableHash({
      purpose:"ugp10_33_synthetic_reservation_receipt",
      ...base,
    }),
  });
}
