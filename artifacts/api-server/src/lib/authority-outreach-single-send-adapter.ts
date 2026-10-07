import {
  authorityOutreachSingleSendStableHash,
  type AuthorityOutreachSingleSendExecutionIntent,
} from "./authority-outreach-single-send-intent.js";

export type AuthorityOutreachSingleSendAdapterOutcome=
  |"accepted"
  |"rejected"
  |"uncertain";

export type AuthorityOutreachSingleSendAdapterReceipt=Readonly<{
  adapterClass:string;
  outcome:AuthorityOutreachSingleSendAdapterOutcome;
  receiptFingerprint:string;
  externalRequestId:string|null;
  networkOperationPerformed:boolean;
  automaticRetryPerformed:false;
}>;

export interface AuthorityOutreachSingleSendAdapter{
  readonly adapterClass:string;
  readonly networkOperationCapable:boolean;
  send(intent:AuthorityOutreachSingleSendExecutionIntent):
    Promise<AuthorityOutreachSingleSendAdapterReceipt>;
}

export function createAuthorityOutreachMockSingleSendAdapter(
  outcome:AuthorityOutreachSingleSendAdapterOutcome,
):AuthorityOutreachSingleSendAdapter{
  if(!["accepted","rejected","uncertain"].includes(outcome)){
    throw new Error("ugp10_32_mock_outcome_invalid");
  }
  return Object.freeze({
    adapterClass:"mock",
    networkOperationCapable:false,
    async send(intent:AuthorityOutreachSingleSendExecutionIntent){
      const receiptFingerprint=authorityOutreachSingleSendStableHash({
        purpose:"ugp10_32_mock_adapter_receipt",
        executionFingerprint:intent.executionFingerprint,
        payloadFingerprint:intent.payloadFingerprint,
        outcome,
      });
      return Object.freeze({
        adapterClass:"mock",
        outcome,
        receiptFingerprint,
        externalRequestId:null,
        networkOperationPerformed:false,
        automaticRetryPerformed:false as const,
      });
    },
  });
}
