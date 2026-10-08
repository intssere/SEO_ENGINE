import { createHash } from "node:crypto";
import {
  authorityOutreachPublicContactPointFingerprint,
} from "./authority-outreach-contact-point-evidence-validation.js";
import {
  authorityOutreachDraftCandidateFingerprint,
} from "./authority-outreach-draft-candidate-validation.js";
import type {
  AuthorityOutreachContactPointType,
} from "./authority-outreach-contact-verification-specification.js";
import type {
  AuthorityOutreachOutboundSafetyReceipt,
} from "./authority-outreach-outbound-safety-store.js";

export const UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION =
  "ugp-10-32-single-send-execution-v1" as const;
export const UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_EVENT_VERSION =
  "ugp-10-32-single-send-execution-event-v1" as const;

export type AuthorityOutreachSingleSendAdapterClass=
  |"mock"
  |"controlled_https_cert";

export type AuthorityOutreachSingleSendPayload = Readonly<{
  contactPointType: AuthorityOutreachContactPointType;
  contactPointValue: string;
  sourceDomain: string;
  requestFingerprint: string;
  subject: string;
  body: string;
}>;

export type AuthorityOutreachSingleSendExecutionIntent = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION;
  executionId: string;
  executionFingerprint: string;
  reservationId: string;
  reservationFingerprint: string;
  logicalSendKey: string;
  selectedContactPointFingerprint: string;
  candidateFingerprint: string;
  recipientDomain: string;
  payloadFingerprint: string;
  adapterClass: AuthorityOutreachSingleSendAdapterClass;
  payload: AuthorityOutreachSingleSendPayload;
  semantics: Readonly<{
    deterministic: true;
    exactUgp1031ReservationRequired: true;
    exactSelectedContactPointPayloadRequired: true;
    exactReviewedMessagePayloadRequired: true;
    oneRecipientOnly: true;
    oneMessageOnly: true;
    providerNeutralContract: true;
    mockAdapterOnly: boolean;
    controlledCertificationAdapter: boolean;
    rawPayloadProcessLocalOnly: true;
    rawPayloadPersistenceAuthorized: false;
    realProviderExecutionAuthorized: false;
    networkOperationAuthorized: false;
    automaticRetryAuthorized: false;
    schedulerEnabled: false;
    workerEnabled: false;
  }>;
}>;

const DOMAIN=/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HEX64=/^[0-9a-f]{64}$/;

function stableJson(value:unknown):string{
  if(value===undefined) return "null";
  if(value===null||typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(stableJson).join(",")+"]";
  const object=value as Record<string,unknown>;
  return "{"+Object.keys(object).sort().map(
    key=>JSON.stringify(key)+":"+stableJson(object[key]),
  ).join(",")+"}";
}

export function authorityOutreachSingleSendStableHash(value:unknown):string{
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function canonicalDomain(value:unknown):string{
  if(typeof value!=="string"||value.trim()!==value){
    throw new Error("ugp10_32_invalid_source_domain");
  }
  const normalized=value.toLowerCase().replace(/\.$/,"");
  if(!DOMAIN.test(normalized)){
    throw new Error("ugp10_32_invalid_source_domain");
  }
  return normalized;
}

function fingerprint(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)){
    throw new Error("ugp10_32_invalid_"+field);
  }
  return value;
}

function assertReservation(
  reservation:AuthorityOutreachOutboundSafetyReceipt,
):void{
  if(
    !reservation
    ||reservation.version!=="ugp-10-31-outbound-safety-reservation-v1"
    ||!["reserved","released","consumed","uncertain"].includes(reservation.status)
    ||reservation.durable!==true
    ||reservation.providerDispatchAuthorized!==false
    ||reservation.messageTransmissionAuthorized!==false
    ||reservation.sendAuthorizationGranted!==false
  ){
    throw new Error("ugp10_32_exact_ugp10_31_receipt_required");
  }
  fingerprint(reservation.reservationFingerprint,"reservation_fingerprint");
  fingerprint(reservation.logicalSendKey,"logical_send_key");
  fingerprint(
    reservation.selectedContactPointFingerprint,
    "selected_contact_point_fingerprint",
  );
  fingerprint(reservation.candidateFingerprint,"candidate_fingerprint");
}

export function buildAuthorityOutreachSingleSendExecutionIntentForAdapter(
  input:Readonly<{
    reservation:AuthorityOutreachOutboundSafetyReceipt;
    payload:AuthorityOutreachSingleSendPayload;
  }>,
  adapterClass:AuthorityOutreachSingleSendAdapterClass,
):AuthorityOutreachSingleSendExecutionIntent{
  assertReservation(input.reservation);
  if(!input.payload||typeof input.payload!=="object"||Array.isArray(input.payload)){
    throw new Error("ugp10_32_invalid_payload");
  }
  const sourceDomain=canonicalDomain(input.payload.sourceDomain);
  if(sourceDomain!==input.reservation.recipientDomain){
    throw new Error("ugp10_32_recipient_domain_mismatch");
  }

  const selectedContactPointFingerprint=
    authorityOutreachPublicContactPointFingerprint(
      input.payload.contactPointType,
      input.payload.contactPointValue,
      sourceDomain,
    );
  if(
    selectedContactPointFingerprint
      !==input.reservation.selectedContactPointFingerprint
  ){
    throw new Error("ugp10_32_selected_contact_payload_mismatch");
  }

  const candidateFingerprint=authorityOutreachDraftCandidateFingerprint({
    requestFingerprint:input.payload.requestFingerprint,
    subject:input.payload.subject,
    body:input.payload.body,
  });
  if(candidateFingerprint!==input.reservation.candidateFingerprint){
    throw new Error("ugp10_32_reviewed_message_payload_mismatch");
  }

  const payload=Object.freeze({
    contactPointType:input.payload.contactPointType,
    contactPointValue:input.payload.contactPointValue,
    sourceDomain,
    requestFingerprint:input.payload.requestFingerprint,
    subject:input.payload.subject,
    body:input.payload.body,
  });
  const payloadFingerprint=authorityOutreachSingleSendStableHash({
    purpose:"ugp10_32_single_send_payload",
    reservationFingerprint:input.reservation.reservationFingerprint,
    contactPointFingerprint:selectedContactPointFingerprint,
    candidateFingerprint,
    contactPointType:payload.contactPointType,
    contactPointValue:payload.contactPointValue,
    sourceDomain:payload.sourceDomain,
    requestFingerprint:payload.requestFingerprint,
    subject:payload.subject,
    body:payload.body,
  });
  const base={
    version:UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION,
    reservationId:input.reservation.reservationId,
    reservationFingerprint:input.reservation.reservationFingerprint,
    logicalSendKey:input.reservation.logicalSendKey,
    selectedContactPointFingerprint,
    candidateFingerprint,
    recipientDomain:sourceDomain,
    payloadFingerprint,
    adapterClass,
    payload,
    semantics:Object.freeze({
      deterministic:true as const,
      exactUgp1031ReservationRequired:true as const,
      exactSelectedContactPointPayloadRequired:true as const,
      exactReviewedMessagePayloadRequired:true as const,
      oneRecipientOnly:true as const,
      oneMessageOnly:true as const,
      providerNeutralContract:true as const,
      mockAdapterOnly:adapterClass==="mock",
      controlledCertificationAdapter:adapterClass==="controlled_https_cert",
      rawPayloadProcessLocalOnly:true as const,
      rawPayloadPersistenceAuthorized:false as const,
      realProviderExecutionAuthorized:false as const,
      networkOperationAuthorized:false as const,
      automaticRetryAuthorized:false as const,
      schedulerEnabled:false as const,
      workerEnabled:false as const,
    }),
  };
  const executionFingerprint=authorityOutreachSingleSendStableHash({
    purpose:"ugp10_32_single_send_execution",
    reservationId:base.reservationId,
    reservationFingerprint:base.reservationFingerprint,
    payloadFingerprint:base.payloadFingerprint,
    adapterClass:base.adapterClass,
  });
  return Object.freeze({
    ...base,
    executionId:"uaosx-"+executionFingerprint.slice(0,24),
    executionFingerprint,
  });
}

export function buildAuthorityOutreachSingleSendExecutionIntent(input:Readonly<{
  reservation:AuthorityOutreachOutboundSafetyReceipt;
  payload:AuthorityOutreachSingleSendPayload;
}>):AuthorityOutreachSingleSendExecutionIntent{
  return buildAuthorityOutreachSingleSendExecutionIntentForAdapter(input,"mock");
}

export function assertAuthorityOutreachSingleSendExecutionIntentIntegrity(
  intent:AuthorityOutreachSingleSendExecutionIntent,
  input:Parameters<typeof buildAuthorityOutreachSingleSendExecutionIntent>[0],
):void{
  if(
    !intent
    ||intent.version!==UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION
  ){
    throw new Error("ugp10_32_execution_intent_version_invalid");
  }
  const expected=buildAuthorityOutreachSingleSendExecutionIntentForAdapter(
    input,
    intent.adapterClass,
  );
  if(stableJson(expected)!==stableJson(intent)){
    throw new Error("ugp10_32_execution_intent_integrity_mismatch");
  }
}
