import {
  authorityOutreachSingleSendStableHash,
  type AuthorityOutreachSingleSendExecutionIntent,
} from "./authority-outreach-single-send-intent.js";
import type {
  AuthorityOutreachSingleSendAdapter,
  AuthorityOutreachSingleSendAdapterReceipt,
} from "./authority-outreach-single-send-adapter.js";

export const UGP_10_33_CERTIFICATION_VERSION=
  "ugp-10-33-controlled-real-web-submission-certification-v1" as const;
export const UGP_10_33_RECEIVER_VERSION=
  "ugp-10-33-controlled-receiver-v1" as const;

export type Ugp1033CertificationPlan=Readonly<{
  version:typeof UGP_10_33_CERTIFICATION_VERSION;
  sourceCommitSha:string;
  receiverUrl:string;
  receiverDomain:string;
  executionFingerprint:string;
  payloadFingerprint:string;
  maxCalls:1;
  maxAttemptsPerCall:1;
  automaticRetry:false;
  maxConcurrency:1;
  timeoutMs:10000;
  maxResponseBytes:16384;
  channel:"web_contact_form";
  providerClass:"controlled_https_cert";
  productionAllowed:false;
  schedulerAllowed:false;
  workerAllowed:false;
  planFingerprint:string;
  authorizationLiteral:string;
}>;

export type Ugp1033ControlledReceiverResponse=Readonly<{
  version:typeof UGP_10_33_RECEIVER_VERSION;
  accepted:true;
  executionFingerprint:string;
  payloadFingerprint:string;
  receiptFingerprint:string;
}>;

type FetchLike=(input:string|URL,init?:RequestInit)=>Promise<Response>;

const HEX40=/^[0-9a-f]{40}$/;
const HEX64=/^[0-9a-f]{64}$/;

function exactFingerprint(value:string,field:string):string{
  if(!HEX64.test(value)) throw new Error("ugp10_33_invalid_"+field);
  return value;
}

function controlledReceiverUrl(value:string):URL{
  let url:URL;
  try{
    url=new URL(value);
  }catch{
    throw new Error("ugp10_33_receiver_url_invalid");
  }
  if(
    url.protocol!=="https:"
    ||url.username!==""
    ||url.password!==""
    ||url.search!==""
    ||url.hash!==""
    ||url.port!==""
    ||url.pathname!=="/ugp-10-33/receive"
    ||!url.hostname.endsWith(".up.railway.app")
  ){
    throw new Error("ugp10_33_receiver_url_out_of_scope");
  }
  return url;
}

export function buildUgp1033CertificationPlan(input:{
  sourceCommitSha:string;
  receiverUrl:string;
  executionFingerprint:string;
  payloadFingerprint:string;
}):Ugp1033CertificationPlan{
  if(!HEX40.test(input.sourceCommitSha)){
    throw new Error("ugp10_33_source_commit_invalid");
  }
  const receiver=controlledReceiverUrl(input.receiverUrl);
  const executionFingerprint=exactFingerprint(
    input.executionFingerprint,
    "execution_fingerprint",
  );
  const payloadFingerprint=exactFingerprint(
    input.payloadFingerprint,
    "payload_fingerprint",
  );
  const base={
    version:UGP_10_33_CERTIFICATION_VERSION,
    sourceCommitSha:input.sourceCommitSha,
    receiverUrl:receiver.toString(),
    receiverDomain:receiver.hostname,
    executionFingerprint,
    payloadFingerprint,
    maxCalls:1 as const,
    maxAttemptsPerCall:1 as const,
    automaticRetry:false as const,
    maxConcurrency:1 as const,
    timeoutMs:10000 as const,
    maxResponseBytes:16384 as const,
    channel:"web_contact_form" as const,
    providerClass:"controlled_https_cert" as const,
    productionAllowed:false as const,
    schedulerAllowed:false as const,
    workerAllowed:false as const,
  };
  const planFingerprint=authorityOutreachSingleSendStableHash({
    purpose:"ugp10_33_certification_plan",
    ...base,
  });
  return Object.freeze({
    ...base,
    planFingerprint,
    authorizationLiteral:[
      "AUTHORIZE",
      "UGP_10_33_CONTROLLED_REAL_WEB_SUBMISSION",
      input.sourceCommitSha,
      planFingerprint,
    ].join(":"),
  });
}

function responseReceipt(
  plan:Ugp1033CertificationPlan,
  status:number,
  bodyFingerprint:string,
  outcome:"accepted"|"rejected"|"uncertain",
):AuthorityOutreachSingleSendAdapterReceipt{
  return Object.freeze({
    adapterClass:"controlled_https_cert",
    outcome,
    receiptFingerprint:authorityOutreachSingleSendStableHash({
      purpose:"ugp10_33_controlled_https_adapter_receipt",
      planFingerprint:plan.planFingerprint,
      status,
      bodyFingerprint,
      outcome,
    }),
    externalRequestId:null,
    networkOperationPerformed:true,
    automaticRetryPerformed:false as const,
  });
}

function bodyFingerprint(bytes:Uint8Array):string{
  return authorityOutreachSingleSendStableHash({
    purpose:"ugp10_33_receiver_response_body",
    body:Array.from(bytes),
  });
}

export function createUgp1033ControlledHttpsAdapter(input:{
  plan:Ugp1033CertificationPlan;
  authorizationLiteral:string;
  fetchImpl?:FetchLike;
}):AuthorityOutreachSingleSendAdapter{
  if(input.authorizationLiteral!==input.plan.authorizationLiteral){
    throw new Error("ugp10_33_exact_authorization_literal_required");
  }
  const fetchImpl=input.fetchImpl??globalThis.fetch.bind(globalThis);
  let calls=0;

  return Object.freeze({
    adapterClass:"controlled_https_cert",
    networkOperationCapable:true,
    async send(
      intent:AuthorityOutreachSingleSendExecutionIntent,
    ):Promise<AuthorityOutreachSingleSendAdapterReceipt>{
      if(calls!==0){
        throw new Error("ugp10_33_second_network_attempt_forbidden");
      }
      calls+=1;
      if(
        intent.adapterClass!=="controlled_https_cert"
        ||intent.executionFingerprint!==input.plan.executionFingerprint
        ||intent.payloadFingerprint!==input.plan.payloadFingerprint
        ||intent.payload.contactPointType!=="web_contact_form"
        ||intent.payload.contactPointValue!==input.plan.receiverUrl
        ||intent.payload.sourceDomain!==input.plan.receiverDomain
      ){
        throw new Error("ugp10_33_execution_plan_mismatch");
      }

      let response:Response;
      try{
        response=await fetchImpl(input.plan.receiverUrl,{
          method:"POST",
          redirect:"error",
          signal:AbortSignal.timeout(input.plan.timeoutMs),
          headers:{
            "content-type":"application/json",
            "accept":"application/json",
            "x-ugp-cert-version":UGP_10_33_CERTIFICATION_VERSION,
            "x-ugp-plan-fingerprint":input.plan.planFingerprint,
          },
          body:JSON.stringify({
            version:UGP_10_33_CERTIFICATION_VERSION,
            executionFingerprint:intent.executionFingerprint,
            reservationFingerprint:intent.reservationFingerprint,
            payloadFingerprint:intent.payloadFingerprint,
            subject:intent.payload.subject,
            body:intent.payload.body,
          }),
        });
      }catch{
        return responseReceipt(
          input.plan,
          0,
          authorityOutreachSingleSendStableHash({
            purpose:"ugp10_33_network_exception",
            executionFingerprint:intent.executionFingerprint,
          }),
          "uncertain",
        );
      }

      const raw=new Uint8Array(await response.arrayBuffer());
      const rawFingerprint=bodyFingerprint(raw);
      if(raw.byteLength>input.plan.maxResponseBytes){
        return responseReceipt(
          input.plan,
          response.status,
          rawFingerprint,
          "uncertain",
        );
      }
      if(response.status<200||response.status>=300){
        return responseReceipt(
          input.plan,
          response.status,
          rawFingerprint,
          response.status>=400&&response.status<500?"rejected":"uncertain",
        );
      }

      let parsed:unknown;
      try{
        parsed=JSON.parse(new TextDecoder().decode(raw));
      }catch{
        return responseReceipt(
          input.plan,
          response.status,
          rawFingerprint,
          "uncertain",
        );
      }
      const body=parsed as Partial<Ugp1033ControlledReceiverResponse>;
      if(
        body.version!==UGP_10_33_RECEIVER_VERSION
        ||body.accepted!==true
        ||body.executionFingerprint!==intent.executionFingerprint
        ||body.payloadFingerprint!==intent.payloadFingerprint
        ||typeof body.receiptFingerprint!=="string"
        ||!HEX64.test(body.receiptFingerprint)
      ){
        return responseReceipt(
          input.plan,
          response.status,
          rawFingerprint,
          "uncertain",
        );
      }
      return responseReceipt(
        input.plan,
        response.status,
        authorityOutreachSingleSendStableHash({
          rawFingerprint,
          receiverReceiptFingerprint:body.receiptFingerprint,
        }),
        "accepted",
      );
    },
  });
}
