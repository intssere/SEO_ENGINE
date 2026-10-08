import {
  AuthorityOutreachOutboundSafetyStore,
} from "./authority-outreach-outbound-safety-store.js";
import {
  buildAuthorityOutreachSingleSendExecutionIntentForAdapter,
  authorityOutreachSingleSendStableHash,
  type AuthorityOutreachSingleSendPayload,
} from "./authority-outreach-single-send-intent.js";
import {
  AuthorityOutreachSingleSendExecutionStore,
} from "./authority-outreach-single-send-store.js";
import {
  buildUgp1033CertificationPlan,
  createUgp1033ControlledHttpsAdapter,
  type Ugp1033CertificationPlan,
} from "./authority-outreach-ugp-10-33-certification.js";

type FetchLike=(input:string|URL,init?:RequestInit)=>Promise<Response>;

export type Ugp1033ControlledCertificationResult=Readonly<{
  version:"ugp-10-33-controlled-real-web-submission-certification-v1";
  disposition:
    |"accepted"
    |"rejected"
    |"uncertain"
    |"existing_accepted"
    |"existing_rejected"
    |"existing_uncertain"
    |"recovered_as_uncertain";
  planFingerprint:string;
  executionId:string;
  executionFingerprint:string;
  reservationId:string;
  reservationFingerprint:string;
  adapterReceiptFingerprint:string|null;
  networkCalls:0|1;
  adapterAttempts:0|1;
  automaticRetryPerformed:false;
  messageTransmissionAttempted:boolean;
  messageTransmissionAccepted:boolean;
  productionExecution:false;
}>;

function result(input:{
  disposition:Ugp1033ControlledCertificationResult["disposition"];
  plan:Ugp1033CertificationPlan;
  executionId:string;
  executionFingerprint:string;
  reservationId:string;
  reservationFingerprint:string;
  adapterReceiptFingerprint:string|null;
  networkCalls:0|1;
}):Ugp1033ControlledCertificationResult{
  return Object.freeze({
    version:"ugp-10-33-controlled-real-web-submission-certification-v1",
    disposition:input.disposition,
    planFingerprint:input.plan.planFingerprint,
    executionId:input.executionId,
    executionFingerprint:input.executionFingerprint,
    reservationId:input.reservationId,
    reservationFingerprint:input.reservationFingerprint,
    adapterReceiptFingerprint:input.adapterReceiptFingerprint,
    networkCalls:input.networkCalls,
    adapterAttempts:input.networkCalls,
    automaticRetryPerformed:false as const,
    messageTransmissionAttempted:input.networkCalls===1,
    messageTransmissionAccepted:input.disposition==="accepted"
      ||input.disposition==="existing_accepted",
    productionExecution:false as const,
  });
}

export async function executeUgp1033ControlledCertification(input:{
  databaseUrl:string;
  sourceCommitSha:string;
  receiverUrl:string;
  authorizationLiteral:string;
  reservationId:string;
  reservationFingerprint:string;
  payload:AuthorityOutreachSingleSendPayload;
  actorId:string;
  fetchImpl?:FetchLike;
}):Promise<Ugp1033ControlledCertificationResult>{
  const safetyStore=new AuthorityOutreachOutboundSafetyStore({
    databaseUrl:input.databaseUrl,
  });
  const executionStore=new AuthorityOutreachSingleSendExecutionStore({
    databaseUrl:input.databaseUrl,
  });
  const reservation=await safetyStore.readReservation({
    reservationId:input.reservationId,
    reservationFingerprint:input.reservationFingerprint,
  });
  const intentInput={
    reservation,
    payload:input.payload,
  };
  const intent=buildAuthorityOutreachSingleSendExecutionIntentForAdapter(
    intentInput,
    "controlled_https_cert",
  );
  const plan=buildUgp1033CertificationPlan({
    sourceCommitSha:input.sourceCommitSha,
    receiverUrl:input.receiverUrl,
    executionFingerprint:intent.executionFingerprint,
    payloadFingerprint:intent.payloadFingerprint,
  });
  if(input.authorizationLiteral!==plan.authorizationLiteral){
    throw new Error("ugp10_33_exact_authorization_literal_required");
  }

  const claim=await executionStore.claim({
    intent,
    intentInput,
    actorId:input.actorId,
  });
  if(claim.kind==="existing"){
    if(claim.record.state==="accepted"){
      return result({
        disposition:"existing_accepted",
        plan,
        executionId:claim.record.executionId,
        executionFingerprint:claim.record.executionFingerprint,
        reservationId:claim.record.reservationId,
        reservationFingerprint:claim.record.reservationFingerprint,
        adapterReceiptFingerprint:claim.record.adapterReceiptFingerprint,
        networkCalls:0,
      });
    }
    if(claim.record.state==="rejected"){
      return result({
        disposition:"existing_rejected",
        plan,
        executionId:claim.record.executionId,
        executionFingerprint:claim.record.executionFingerprint,
        reservationId:claim.record.reservationId,
        reservationFingerprint:claim.record.reservationFingerprint,
        adapterReceiptFingerprint:claim.record.adapterReceiptFingerprint,
        networkCalls:0,
      });
    }
    if(claim.record.state==="uncertain"){
      return result({
        disposition:"existing_uncertain",
        plan,
        executionId:claim.record.executionId,
        executionFingerprint:claim.record.executionFingerprint,
        reservationId:claim.record.reservationId,
        reservationFingerprint:claim.record.reservationFingerprint,
        adapterReceiptFingerprint:claim.record.adapterReceiptFingerprint,
        networkCalls:0,
      });
    }
    const recoveryFingerprint=authorityOutreachSingleSendStableHash({
      purpose:"ugp10_33_replay_of_claimed_execution_is_uncertain",
      executionFingerprint:claim.record.executionFingerprint,
    });
    try{
      await safetyStore.transition({
        reservationId:claim.record.reservationId,
        reservationFingerprint:claim.record.reservationFingerprint,
        transition:"mark_uncertain",
        actorId:input.actorId,
      });
    }catch{
      // Never reopen or retry an already claimed execution.
    }
    const recovered=await executionStore.finalize({
      executionId:claim.record.executionId,
      executionFingerprint:claim.record.executionFingerprint,
      state:"uncertain",
      adapterReceiptFingerprint:recoveryFingerprint,
      reason:"controlled_https_cert_uncertain",
      actorId:input.actorId,
    });
    return result({
      disposition:"recovered_as_uncertain",
      plan,
      executionId:recovered.record.executionId,
      executionFingerprint:recovered.record.executionFingerprint,
      reservationId:recovered.record.reservationId,
      reservationFingerprint:recovered.record.reservationFingerprint,
      adapterReceiptFingerprint:recovered.record.adapterReceiptFingerprint,
      networkCalls:0,
    });
  }

  const adapter=createUgp1033ControlledHttpsAdapter({
    plan,
    authorizationLiteral:input.authorizationLiteral,
    fetchImpl:input.fetchImpl,
  });
  const adapterReceipt=await adapter.send(intent);
  const transition=
    adapterReceipt.outcome==="accepted"
      ?"consume" as const
      :adapterReceipt.outcome==="rejected"
        ?"release" as const
        :"mark_uncertain" as const;
  let finalOutcome=adapterReceipt.outcome;
  let finalReceiptFingerprint=adapterReceipt.receiptFingerprint;
  try{
    await safetyStore.transition({
      reservationId:intent.reservationId,
      reservationFingerprint:intent.reservationFingerprint,
      transition,
      actorId:input.actorId,
    });
  }catch{
    finalOutcome="uncertain";
    finalReceiptFingerprint=authorityOutreachSingleSendStableHash({
      purpose:"ugp10_33_post_network_state_transition_uncertain",
      executionFingerprint:intent.executionFingerprint,
      adapterReceiptFingerprint:adapterReceipt.receiptFingerprint,
    });
    try{
      await safetyStore.transition({
        reservationId:intent.reservationId,
        reservationFingerprint:intent.reservationFingerprint,
        transition:"mark_uncertain",
        actorId:input.actorId,
      });
    }catch{
      // Once the network boundary was crossed, ambiguity stays terminal.
    }
  }

  const reason=
    finalOutcome==="accepted"
      ?"controlled_https_cert_accepted" as const
      :finalOutcome==="rejected"
        ?"controlled_https_cert_rejected" as const
        :"controlled_https_cert_uncertain" as const;
  const finalized=await executionStore.finalize({
    executionId:intent.executionId,
    executionFingerprint:intent.executionFingerprint,
    state:finalOutcome,
    adapterReceiptFingerprint:finalReceiptFingerprint,
    reason,
    actorId:input.actorId,
  });
  return result({
    disposition:finalOutcome,
    plan,
    executionId:finalized.record.executionId,
    executionFingerprint:finalized.record.executionFingerprint,
    reservationId:finalized.record.reservationId,
    reservationFingerprint:finalized.record.reservationFingerprint,
    adapterReceiptFingerprint:finalized.record.adapterReceiptFingerprint,
    networkCalls:1,
  });
}
