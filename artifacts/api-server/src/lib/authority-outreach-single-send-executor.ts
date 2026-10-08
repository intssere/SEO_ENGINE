import {
  AuthorityOutreachOutboundSafetyStore,
} from "./authority-outreach-outbound-safety-store.js";
import {
  createAuthorityOutreachMockSingleSendAdapter,
  type AuthorityOutreachSingleSendAdapter,
  type AuthorityOutreachSingleSendAdapterOutcome,
  type AuthorityOutreachSingleSendAdapterReceipt,
} from "./authority-outreach-single-send-adapter.js";
import {
  authorityOutreachSingleSendStableHash,
  buildAuthorityOutreachSingleSendExecutionIntent,
  type AuthorityOutreachSingleSendPayload,
} from "./authority-outreach-single-send-intent.js";
import {
  AuthorityOutreachSingleSendExecutionStore,
  type AuthorityOutreachSingleSendExecutionRecord,
} from "./authority-outreach-single-send-store.js";

export type AuthorityOutreachSingleSendExecutionResult=Readonly<{
  version:"ugp-10-32-single-send-execution-v1";
  disposition:
    |"mock_accepted"
    |"mock_rejected"
    |"mock_uncertain"
    |"recovered_as_uncertain"
    |"existing_accepted"
    |"existing_rejected"
    |"existing_uncertain";
  execution:AuthorityOutreachSingleSendExecutionRecord;
  adapterInvoked:boolean;
  adapterAttemptCount:0|1;
  automaticRetryPerformed:false;
  realProviderExecutionPerformed:false;
  networkOperationPerformed:false;
  messageTransmissionPerformed:false;
}>;

function result(
  disposition:AuthorityOutreachSingleSendExecutionResult["disposition"],
  execution:AuthorityOutreachSingleSendExecutionRecord,
  adapterInvoked:boolean,
):AuthorityOutreachSingleSendExecutionResult{
  return Object.freeze({
    version:"ugp-10-32-single-send-execution-v1" as const,
    disposition,
    execution,
    adapterInvoked,
    adapterAttemptCount:(adapterInvoked?1:0) as 0|1,
    automaticRetryPerformed:false as const,
    realProviderExecutionPerformed:false as const,
    networkOperationPerformed:false as const,
    messageTransmissionPerformed:false as const,
  });
}

function validateReceipt(
  receipt:AuthorityOutreachSingleSendAdapterReceipt,
  adapter:AuthorityOutreachSingleSendAdapter,
):AuthorityOutreachSingleSendAdapterReceipt{
  if(
    !receipt
    ||receipt.adapterClass!==adapter.adapterClass
    ||!["accepted","rejected","uncertain"].includes(receipt.outcome)
    ||!/^[0-9a-f]{64}$/.test(receipt.receiptFingerprint)
    ||receipt.networkOperationPerformed!==false
    ||receipt.automaticRetryPerformed!==false
  ){
    throw new Error("ugp10_32_adapter_receipt_invalid");
  }
  return receipt;
}

function syntheticUncertainFingerprint(
  executionFingerprint:string,
  purpose:string,
):string{
  return authorityOutreachSingleSendStableHash({
    purpose,
    executionFingerprint,
  });
}

export async function executeAuthorityOutreachSingleSend(input:{
  databaseUrl:string;
  reservationId:string;
  reservationFingerprint:string;
  payload:AuthorityOutreachSingleSendPayload;
  actorId:string;
  adapter:AuthorityOutreachSingleSendAdapter;
}):Promise<AuthorityOutreachSingleSendExecutionResult>{
  if(
    input.adapter.adapterClass!=="mock"
    ||input.adapter.networkOperationCapable!==false
  ){
    throw new Error("ugp10_32_real_provider_adapter_not_authorized");
  }

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
  const intent=buildAuthorityOutreachSingleSendExecutionIntent(intentInput);
  const claim=await executionStore.claim({
    intent,
    intentInput,
    actorId:input.actorId,
  });

  if(claim.kind==="existing"){
    if(claim.record.state==="accepted"){
      return result("existing_accepted",claim.record,false);
    }
    if(claim.record.state==="rejected"){
      return result("existing_rejected",claim.record,false);
    }
    if(claim.record.state==="uncertain"){
      return result("existing_uncertain",claim.record,false);
    }

    const recoveryFingerprint=syntheticUncertainFingerprint(
      claim.record.executionFingerprint,
      "ugp10_32_replay_of_claimed_execution_is_uncertain",
    );
    try{
      await safetyStore.transition({
        reservationId:claim.record.reservationId,
        reservationFingerprint:claim.record.reservationFingerprint,
        transition:"mark_uncertain",
        actorId:input.actorId,
      });
    }catch{
      // A terminal reservation is still non-retryable; execution closes uncertain.
    }
    const recovered=await executionStore.finalize({
      executionId:claim.record.executionId,
      executionFingerprint:claim.record.executionFingerprint,
      state:"uncertain",
      adapterReceiptFingerprint:recoveryFingerprint,
      reason:"execution_recovery_uncertain",
      actorId:input.actorId,
    });
    return result("recovered_as_uncertain",recovered.record,false);
  }

  let receipt:AuthorityOutreachSingleSendAdapterReceipt;
  try{
    receipt=validateReceipt(await input.adapter.send(intent),input.adapter);
  }catch{
    const uncertainFingerprint=syntheticUncertainFingerprint(
      intent.executionFingerprint,
      "ugp10_32_mock_adapter_throw_uncertain",
    );
    try{
      await safetyStore.transition({
        reservationId:intent.reservationId,
        reservationFingerprint:intent.reservationFingerprint,
        transition:"mark_uncertain",
        actorId:input.actorId,
      });
    }catch{
      // Never retry after the adapter boundary has been crossed.
    }
    const finalized=await executionStore.finalize({
      executionId:intent.executionId,
      executionFingerprint:intent.executionFingerprint,
      state:"uncertain",
      adapterReceiptFingerprint:uncertainFingerprint,
      reason:"mock_adapter_uncertain",
      actorId:input.actorId,
    });
    return result("mock_uncertain",finalized.record,true);
  }

  const transition=
    receipt.outcome==="accepted"
      ?"consume" as const
      :receipt.outcome==="rejected"
        ?"release" as const
        :"mark_uncertain" as const;
  let forcedUncertain=false;
  try{
    await safetyStore.transition({
      reservationId:intent.reservationId,
      reservationFingerprint:intent.reservationFingerprint,
      transition,
      actorId:input.actorId,
    });
  }catch{
    forcedUncertain=true;
    try{
      await safetyStore.transition({
        reservationId:intent.reservationId,
        reservationFingerprint:intent.reservationFingerprint,
        transition:"mark_uncertain",
        actorId:input.actorId,
      });
    }catch{
      // Existing terminal state remains non-retryable.
    }
  }

  const finalOutcome:AuthorityOutreachSingleSendAdapterOutcome=
    forcedUncertain?"uncertain":receipt.outcome;
  const finalReceiptFingerprint=forcedUncertain
    ?syntheticUncertainFingerprint(
      intent.executionFingerprint,
      "ugp10_32_post_adapter_state_transition_uncertain",
    )
    :receipt.receiptFingerprint;
  const reason=
    finalOutcome==="accepted"
      ?"mock_adapter_accepted" as const
      :finalOutcome==="rejected"
        ?"mock_adapter_rejected" as const
        :"mock_adapter_uncertain" as const;
  const finalized=await executionStore.finalize({
    executionId:intent.executionId,
    executionFingerprint:intent.executionFingerprint,
    state:finalOutcome,
    adapterReceiptFingerprint:finalReceiptFingerprint,
    reason,
    actorId:input.actorId,
  });
  return result(
    finalOutcome==="accepted"
      ?"mock_accepted"
      :finalOutcome==="rejected"
        ?"mock_rejected"
        :"mock_uncertain",
    finalized.record,
    true,
  );
}

export async function executeAuthorityOutreachMockSingleSend(input:{
  databaseUrl:string;
  reservationId:string;
  reservationFingerprint:string;
  payload:AuthorityOutreachSingleSendPayload;
  actorId:string;
  mockOutcome:AuthorityOutreachSingleSendAdapterOutcome;
}):Promise<AuthorityOutreachSingleSendExecutionResult>{
  return executeAuthorityOutreachSingleSend({
    ...input,
    adapter:createAuthorityOutreachMockSingleSendAdapter(input.mockOutcome),
  });
}
