import { findUniversalCapability } from "./universal-capability-registry.js";
import {
  buildUniversalRollbackIntent,
  buildUniversalVerifyMutationRequest,
  type UniversalMutationReceipt,
  type UniversalRollbackIntent,
  type UniversalVerifyMutationRequest,
} from "./universal-connector-contract.js";
import {
  assertInternalLinkMutationPreviewIntegrity,
  type InternalLinkMutationPreviewEntry,
  type InternalLinkMutationPreviewResult,
} from "./internal-link-mutation-preview.js";
import {
  assertInternalLinkProviderPatchIntegrity,
  type InternalLinkProviderPatch,
} from "./internal-link-provider-patch-mapping.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_INTERNAL_LINK_VERIFICATION_ROLLBACK_VERSION =
  "ugp-8-2e-internal-link-verification-rollback-v1" as const;

export type InternalLinkVerificationRollbackPlan = Readonly<{
  version: typeof UGP_INTERNAL_LINK_VERIFICATION_ROLLBACK_VERSION;
  previewEntryFingerprint: string;
  providerPatchFingerprint: string;
  provider: InternalLinkProviderPatch["provider"];
  targetLocatorFingerprint: string;
  mutationIntentFingerprint: string;
  descriptorFingerprint: string;
  expectedAppliedStateFingerprint: string;
  restoreStateFingerprint: string;
  proposedContentFingerprint: string;
  verificationCapability: "verify.change";
  rollbackCapability: "rollback.change";
  semantics: Readonly<{
    deterministic: true;
    planningOnly: true;
    verificationRequiresMutationReceipt: true;
    rollbackIntentRequiresMutationReceipt: true;
    rollbackRequestConstructed: false;
    executeRequestConstructed: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    usesCredentials: false;
    grantsAuthorization: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  planFingerprint: string;
}>;

export type InternalLinkReceiptBoundVerification = Readonly<{
  version: typeof UGP_INTERNAL_LINK_VERIFICATION_ROLLBACK_VERSION;
  planFingerprint: string;
  mutationReceiptFingerprint: string;
  verificationRequest: UniversalVerifyMutationRequest;
  bindingFingerprint: string;
}>;

export type InternalLinkReceiptBoundRollback = Readonly<{
  version: typeof UGP_INTERNAL_LINK_VERIFICATION_ROLLBACK_VERSION;
  planFingerprint: string;
  mutationReceiptFingerprint: string;
  rollbackIntent: UniversalRollbackIntent;
  rollbackRequestConstructed: false;
  bindingFingerprint: string;
}>;

const HEX64=/^[0-9a-f]{64}$/;
const PLAN_SEMANTICS=Object.freeze({
  deterministic:true as const,
  planningOnly:true as const,
  verificationRequiresMutationReceipt:true as const,
  rollbackIntentRequiresMutationReceipt:true as const,
  rollbackRequestConstructed:false as const,
  executeRequestConstructed:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  usesCredentials:false as const,
  grantsAuthorization:false as const,
  executionAuthorized:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
});

function fp(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)) throw new Error("ugp_internal_link_vr_invalid_"+field);
  return value;
}
function findEntry(preview:InternalLinkMutationPreviewResult,entryFingerprint:string):InternalLinkMutationPreviewEntry{
  assertInternalLinkMutationPreviewIntegrity(preview);
  fp(entryFingerprint,"preview_entry_fingerprint");
  const entry=preview.entries.find(e=>e.entryFingerprint===entryFingerprint);
  if(!entry) throw new Error("ugp_internal_link_vr_unknown_preview_entry");
  return entry;
}
function providerMatchesDescriptor(provider:InternalLinkProviderPatch["provider"],descriptorProvider:string,connectorKind:string):boolean{
  if(provider==="git_markdown") return connectorKind==="git";
  return provider===descriptorProvider;
}
function assertReceiptBinding(plan:InternalLinkVerificationRollbackPlan,entry:InternalLinkMutationPreviewEntry,receipt:UniversalMutationReceipt):void{
  fp(receipt.receiptFingerprint,"mutation_receipt_fingerprint");
  if(receipt.descriptorFingerprint!==plan.descriptorFingerprint) throw new Error("ugp_internal_link_vr_receipt_descriptor_mismatch");
  if(receipt.targetLocatorFingerprint!==plan.targetLocatorFingerprint) throw new Error("ugp_internal_link_vr_receipt_target_mismatch");
  if(receipt.mutationIntentFingerprint!==plan.mutationIntentFingerprint) throw new Error("ugp_internal_link_vr_receipt_intent_mismatch");
  if(receipt.targetLocatorFingerprint!==entry.mutationIntent.target.resourceLocatorFingerprint) throw new Error("ugp_internal_link_vr_receipt_entry_target_mismatch");
  if(receipt.mutationStatus!=="reported_applied"||receipt.verified!==false) throw new Error("ugp_internal_link_vr_receipt_state_invalid");
}

export function buildInternalLinkVerificationRollbackPlan(input:{
  preview:InternalLinkMutationPreviewResult;
  entryFingerprint:string;
  providerPatch:InternalLinkProviderPatch;
}):InternalLinkVerificationRollbackPlan{
  const entry=findEntry(input.preview,input.entryFingerprint);
  assertInternalLinkProviderPatchIntegrity(input.providerPatch);
  if(input.providerPatch.previewEntryFingerprint!==entry.entryFingerprint) throw new Error("ugp_internal_link_vr_patch_preview_lineage_mismatch");
  if(!providerMatchesDescriptor(input.providerPatch.provider,entry.mutationIntent.descriptor.provider,entry.mutationIntent.descriptor.connectorKind)) throw new Error("ugp_internal_link_vr_patch_provider_mismatch");

  const verification=findUniversalCapability(entry.mutationIntent.descriptor.registry,"verify.change",entry.mutationIntent.target.kind);
  if(!verification) throw new Error("ugp_internal_link_vr_verify_capability_required");
  const rollback=findUniversalCapability(entry.mutationIntent.descriptor.registry,"rollback.change",entry.mutationIntent.target.kind);
  if(!rollback) throw new Error("ugp_internal_link_vr_rollback_capability_required");

  const base={
    version:UGP_INTERNAL_LINK_VERIFICATION_ROLLBACK_VERSION,
    previewEntryFingerprint:entry.entryFingerprint,
    providerPatchFingerprint:input.providerPatch.mappingFingerprint,
    provider:input.providerPatch.provider,
    targetLocatorFingerprint:entry.mutationIntent.target.resourceLocatorFingerprint,
    mutationIntentFingerprint:entry.mutationIntent.intentFingerprint,
    descriptorFingerprint:entry.mutationIntent.descriptor.descriptorFingerprint,
    expectedAppliedStateFingerprint:entry.proposedStateFingerprint,
    restoreStateFingerprint:entry.sourceStateFingerprint,
    proposedContentFingerprint:input.providerPatch.proposedContentFingerprint,
    verificationCapability:"verify.change" as const,
    rollbackCapability:"rollback.change" as const,
    semantics:PLAN_SEMANTICS,
  };
  return Object.freeze({
    ...base,
    planFingerprint:stableEvidenceHash({purpose:"ugp_internal_link_verification_rollback_plan",...base}),
  });
}

export function assertInternalLinkVerificationRollbackPlanIntegrity(plan:InternalLinkVerificationRollbackPlan):void{
  if(!plan||plan.version!==UGP_INTERNAL_LINK_VERIFICATION_ROLLBACK_VERSION) throw new Error("ugp_internal_link_vr_plan_version_invalid");
  for(const [field,value] of [
    ["preview_entry_fingerprint",plan.previewEntryFingerprint],
    ["provider_patch_fingerprint",plan.providerPatchFingerprint],
    ["target_locator_fingerprint",plan.targetLocatorFingerprint],
    ["mutation_intent_fingerprint",plan.mutationIntentFingerprint],
    ["descriptor_fingerprint",plan.descriptorFingerprint],
    ["expected_applied_state_fingerprint",plan.expectedAppliedStateFingerprint],
    ["restore_state_fingerprint",plan.restoreStateFingerprint],
    ["proposed_content_fingerprint",plan.proposedContentFingerprint],
    ["plan_fingerprint",plan.planFingerprint],
  ] as const) fp(value,field);
  if(plan.expectedAppliedStateFingerprint===plan.restoreStateFingerprint) throw new Error("ugp_internal_link_vr_plan_state_unchanged");
  if(plan.verificationCapability!=="verify.change"||plan.rollbackCapability!=="rollback.change") throw new Error("ugp_internal_link_vr_plan_capability_invalid");
  const s=plan.semantics;
  if(s.deterministic!==true||s.planningOnly!==true||s.verificationRequiresMutationReceipt!==true||s.rollbackIntentRequiresMutationReceipt!==true||s.rollbackRequestConstructed!==false||s.executeRequestConstructed!==false||s.performsNetworkOperation!==false||s.performsPersistence!==false||s.usesCredentials!==false||s.grantsAuthorization!==false||s.executionAuthorized!==false||s.providerWrites!==false||s.publicSiteWrites!==false) throw new Error("ugp_internal_link_vr_plan_unsafe_semantics");
  const {planFingerprint,...base}=plan;
  const expected=stableEvidenceHash({purpose:"ugp_internal_link_verification_rollback_plan",...base});
  if(planFingerprint!==expected) throw new Error("ugp_internal_link_vr_plan_fingerprint_mismatch");
}

export function bindInternalLinkVerificationToReceipt(input:{
  plan:InternalLinkVerificationRollbackPlan;
  preview:InternalLinkMutationPreviewResult;
  mutationReceipt:UniversalMutationReceipt;
}):InternalLinkReceiptBoundVerification{
  assertInternalLinkVerificationRollbackPlanIntegrity(input.plan);
  const entry=findEntry(input.preview,input.plan.previewEntryFingerprint);
  if(entry.mutationIntent.intentFingerprint!==input.plan.mutationIntentFingerprint) throw new Error("ugp_internal_link_vr_plan_preview_intent_mismatch");
  assertReceiptBinding(input.plan,entry,input.mutationReceipt);
  const verificationRequest=buildUniversalVerifyMutationRequest({
    descriptor:entry.mutationIntent.descriptor,
    mutationReceipt:input.mutationReceipt,
    target:entry.mutationIntent.target,
    expectedStateFingerprint:input.plan.expectedAppliedStateFingerprint,
  });
  const base={
    version:UGP_INTERNAL_LINK_VERIFICATION_ROLLBACK_VERSION,
    planFingerprint:input.plan.planFingerprint,
    mutationReceiptFingerprint:input.mutationReceipt.receiptFingerprint,
    verificationRequest,
  };
  return Object.freeze({...base,bindingFingerprint:stableEvidenceHash({purpose:"ugp_internal_link_receipt_bound_verification",...base})});
}

export function bindInternalLinkRollbackIntentToReceipt(input:{
  plan:InternalLinkVerificationRollbackPlan;
  preview:InternalLinkMutationPreviewResult;
  mutationReceipt:UniversalMutationReceipt;
}):InternalLinkReceiptBoundRollback{
  assertInternalLinkVerificationRollbackPlanIntegrity(input.plan);
  const entry=findEntry(input.preview,input.plan.previewEntryFingerprint);
  if(entry.mutationIntent.intentFingerprint!==input.plan.mutationIntentFingerprint) throw new Error("ugp_internal_link_vr_plan_preview_intent_mismatch");
  assertReceiptBinding(input.plan,entry,input.mutationReceipt);
  const rollbackIntent=buildUniversalRollbackIntent({
    descriptor:entry.mutationIntent.descriptor,
    target:entry.mutationIntent.target,
    originalMutationReceipt:input.mutationReceipt,
    restoreStateFingerprint:input.plan.restoreStateFingerprint,
  });
  const base={
    version:UGP_INTERNAL_LINK_VERIFICATION_ROLLBACK_VERSION,
    planFingerprint:input.plan.planFingerprint,
    mutationReceiptFingerprint:input.mutationReceipt.receiptFingerprint,
    rollbackIntent,
    rollbackRequestConstructed:false as const,
  };
  return Object.freeze({...base,bindingFingerprint:stableEvidenceHash({purpose:"ugp_internal_link_receipt_bound_rollback",...base})});
}
