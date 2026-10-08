import {
  executeAuthorityOutreachMockSingleSend,
} from "./authority-outreach-single-send-executor.js";
import type {
  AuthorityOutreachSingleSendAdapterOutcome,
} from "./authority-outreach-single-send-adapter.js";
import type {
  AuthorityOutreachSingleSendPayload,
} from "./authority-outreach-single-send-intent.js";

const HEX64=/^[0-9a-f]{64}$/;
const RESERVATION_ID=/^uaosr-[0-9a-f]{24}$/;
const REQUEST_KEYS=new Set([
  "reservationId",
  "reservationFingerprint",
  "contactPointType",
  "contactPointValue",
  "sourceDomain",
  "requestFingerprint",
  "subject",
  "body",
  "mockOutcome",
  "confirmation",
  "_csrf",
]);

export type AuthorityOutreachMockSingleSendRequest=Readonly<{
  reservationId:string;
  reservationFingerprint:string;
  payload:AuthorityOutreachSingleSendPayload;
  mockOutcome:AuthorityOutreachSingleSendAdapterOutcome;
  confirmation:string;
}>;

export class AuthorityOutreachSingleSendRuntimeError extends Error{
  constructor(
    readonly category:string,
    readonly status:number,
  ){
    super(category);
    this.name="AuthorityOutreachSingleSendRuntimeError";
  }
}

function exactString(
  value:unknown,
  field:string,
  max:number,
):string{
  if(
    typeof value!=="string"
    ||value.trim()!==value
    ||value.length<1
    ||value.length>max
  ){
    throw new AuthorityOutreachSingleSendRuntimeError(
      "invalid_"+field,
      400,
    );
  }
  return value;
}

function exactFingerprint(value:unknown,field:string):string{
  const normalized=exactString(value,field,64);
  if(!HEX64.test(normalized)){
    throw new AuthorityOutreachSingleSendRuntimeError(
      "invalid_"+field,
      400,
    );
  }
  return normalized;
}

function expectedConfirmation(input:{
  reservationId:string;
  reservationFingerprint:string;
  mockOutcome:AuthorityOutreachSingleSendAdapterOutcome;
}):string{
  return [
    "EXECUTE_OUTREACH_SINGLE_SEND_MOCK",
    input.mockOutcome,
    input.reservationId,
    input.reservationFingerprint,
  ].join(":");
}

export function parseAuthorityOutreachMockSingleSendRequest(
  value:unknown,
):AuthorityOutreachMockSingleSendRequest{
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new AuthorityOutreachSingleSendRuntimeError(
      "invalid_single_send_request",
      400,
    );
  }
  const body=value as Record<string,unknown>;
  for(const key of Object.keys(body)){
    if(!REQUEST_KEYS.has(key)){
      throw new AuthorityOutreachSingleSendRuntimeError(
        "unexpected_single_send_request_field",
        400,
      );
    }
  }

  const reservationId=exactString(body.reservationId,"reservation_id",32);
  if(!RESERVATION_ID.test(reservationId)){
    throw new AuthorityOutreachSingleSendRuntimeError(
      "invalid_reservation_id",
      400,
    );
  }
  const reservationFingerprint=exactFingerprint(
    body.reservationFingerprint,
    "reservation_fingerprint",
  );
  const contactPointType=
    body.contactPointType==="email_address"
    ||body.contactPointType==="web_contact_form"
      ?body.contactPointType
      :null;
  if(contactPointType===null){
    throw new AuthorityOutreachSingleSendRuntimeError(
      "invalid_contact_point_type",
      400,
    );
  }
  const contactPointValue=exactString(
    body.contactPointValue,
    "contact_point_value",
    2048,
  );
  const sourceDomain=exactString(body.sourceDomain,"source_domain",253);
  const requestFingerprint=exactFingerprint(
    body.requestFingerprint,
    "request_fingerprint",
  );
  const subject=exactString(body.subject,"subject",120);
  const messageBody=exactString(body.body,"body",3000);
  const mockOutcome=
    body.mockOutcome==="accepted"
    ||body.mockOutcome==="rejected"
    ||body.mockOutcome==="uncertain"
      ?body.mockOutcome
      :null;
  if(mockOutcome===null){
    throw new AuthorityOutreachSingleSendRuntimeError(
      "invalid_mock_outcome",
      400,
    );
  }
  const confirmation=exactString(body.confirmation,"confirmation",512);
  if(
    confirmation!==expectedConfirmation({
      reservationId,
      reservationFingerprint,
      mockOutcome,
    })
  ){
    throw new AuthorityOutreachSingleSendRuntimeError(
      "explicit_mock_execution_confirmation_required",
      400,
    );
  }

  return Object.freeze({
    reservationId,
    reservationFingerprint,
    payload:Object.freeze({
      contactPointType,
      contactPointValue,
      sourceDomain,
      requestFingerprint,
      subject,
      body:messageBody,
    }),
    mockOutcome,
    confirmation,
  });
}

export function authorityOutreachMockSingleSendRuntimeCapability(
  env:NodeJS.ProcessEnv=process.env,
){
  const production=env.NODE_ENV==="production";
  const enabled=!production
    &&env.UGP_10_32_MOCK_EXECUTION_ENABLED?.trim().toLowerCase()==="true";
  return Object.freeze({
    version:"ugp-10-32-single-send-execution-v1" as const,
    endpoint:"/authority/outreach/single-send/mock" as const,
    mockExecutionEnabled:enabled,
    disabledInProduction:production,
    authenticatedOperatorRequired:true as const,
    csrfRequired:true as const,
    sameOriginRequired:true as const,
    oneReservationOnly:true as const,
    oneRecipientOnly:true as const,
    oneMessageOnly:true as const,
    mockAdapterOnly:true as const,
    realProviderAdapterAvailable:false as const,
    networkOperationAvailable:false as const,
    automaticRetryAvailable:false as const,
  });
}

function mapExecutionError(error:unknown):AuthorityOutreachSingleSendRuntimeError{
  if(error instanceof AuthorityOutreachSingleSendRuntimeError) return error;
  const message=error instanceof Error?error.message:"";
  if(
    message==="ugp10_32_contact_suppressed"
    ||message==="ugp10_32_reservation_not_reserved"
    ||message==="ugp10_32_reservation_expired"
    ||message==="ugp10_32_reservation_lineage_mismatch"
    ||message==="ugp10_32_selected_contact_payload_mismatch"
    ||message==="ugp10_32_reviewed_message_payload_mismatch"
    ||message==="ugp10_32_recipient_domain_mismatch"
  ){
    return new AuthorityOutreachSingleSendRuntimeError(
      "single_send_preflight_blocked",
      409,
    );
  }
  if(
    message==="ugp10_32_contact_rate_state_invalid"
    ||message==="ugp10_32_domain_rate_state_invalid"
  ){
    return new AuthorityOutreachSingleSendRuntimeError(
      "single_send_rate_limit_blocked",
      429,
    );
  }
  if(
    message.includes("schema_")
    ||message.includes("database_")
    ||message==="ugp10_31_database_url_required"
    ||message==="ugp10_32_database_url_required"
  ){
    return new AuthorityOutreachSingleSendRuntimeError(
      "single_send_runtime_unavailable",
      503,
    );
  }
  return new AuthorityOutreachSingleSendRuntimeError(
    "single_send_execution_failed",
    500,
  );
}

export async function executeAuthorityOutreachMockSingleSendRequest(
  request:AuthorityOutreachMockSingleSendRequest,
  actorId:string,
  env:NodeJS.ProcessEnv=process.env,
){
  const capability=authorityOutreachMockSingleSendRuntimeCapability(env);
  if(!capability.mockExecutionEnabled){
    throw new AuthorityOutreachSingleSendRuntimeError(
      "mock_single_send_disabled",
      503,
    );
  }
  const databaseUrl=env.DATABASE_URL?.trim();
  if(!databaseUrl){
    throw new AuthorityOutreachSingleSendRuntimeError(
      "single_send_runtime_unavailable",
      503,
    );
  }
  try{
    return await executeAuthorityOutreachMockSingleSend({
      databaseUrl,
      reservationId:request.reservationId,
      reservationFingerprint:request.reservationFingerprint,
      payload:request.payload,
      actorId,
      mockOutcome:request.mockOutcome,
    });
  }catch(error){
    throw mapExecutionError(error);
  }
}
