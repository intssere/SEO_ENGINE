/**
 * RT01-A12.18 disconnected cutover sequencing only.
 * Composes the already-merged A12.13 security plan and trusted-boundary assessment.
 * Does not authenticate, access DB, enqueue, dispatch, start workers or bind runtime.
 */
import {
  assessTrustedBoundary, assessTransitionPlan,
  type Evidence, type IntegrationPlan, type RequestedIntent
} from "./pilot-01-rt01a12-13-integration-readiness.js";

export type CutoverPhase=
  "route_authorization"|"custody_admission"|"queue_claim"|
  "worker_continuation"|"provider_dispatch"|"recovery";
export type CutoverObservation=Readonly<{
  phase:CutoverPhase;
  authEnforced:boolean;
  legacyQueueReachable:boolean;
  trustedSessionBound:boolean;
  scopedAdmissionRecorded:boolean;
  ownershipFenceCurrent:boolean;
  revocationStillClear:boolean;
  transactionOutcome:"committed"|"rolled_back"|"unknown"|"not_attempted";
  recoveryUsesTrustedQueue:boolean;
  providerReadsEnabled:boolean;
  publicSiteWritesEnabled:boolean;
  // This is deliberately synthetic: no caller may treat a decision as an actual grant.
  evidenceSource:"mock_server_test"|"caller"|"unavailable";
}>;
export type CutoverDecision=Readonly<{
  decision:"blocked"|"design_consistent";
  reason:string;
}>;
const blocked=(reason:string):CutoverDecision=>({decision:"blocked",reason});
/**
 * Paper-only fail-closed phase sequencing.
 * Rejects all ambiguous transaction states and legacy fallbacks.
 * Positive results are documentation/test consistency, NEVER permission to execute.
 */
export function assessCutoverPhase(
  intent:RequestedIntent,
  evidence:Evidence|null,
  plan:IntegrationPlan,
  observation:CutoverObservation|null,
  now:number
):CutoverDecision{
  if(assessTrustedBoundary(intent,evidence,now)!=="design_consistent"||
     assessTransitionPlan(plan)!=="design_consistent")
    return blocked("trusted_boundary_or_plan_unverified");
  if(!observation||observation.evidenceSource!=="mock_server_test")
    return blocked("untrusted_cutover_observation");
  if(!observation.authEnforced||observation.legacyQueueReachable||
     !observation.trustedSessionBound||
     observation.providerReadsEnabled||observation.publicSiteWritesEnabled)
    return blocked("runtime_or_legacy_bypass");
  if(observation.transactionOutcome==="unknown")
    return blocked("unknown_commit_must_reconcile_without_retry");
  if(observation.transactionOutcome==="rolled_back")
    return blocked("rolled_back_admission");
  switch(observation.phase){
    case "route_authorization":
      if(observation.transactionOutcome!=="not_attempted"||
         observation.scopedAdmissionRecorded||observation.ownershipFenceCurrent)
        return blocked("route_must_not_claim_admission");
      break;
    case "custody_admission":
      if(observation.transactionOutcome!=="committed"||
         !observation.scopedAdmissionRecorded||
         observation.ownershipFenceCurrent)
        return blocked("admission_receipt_required");
      break;
    case "queue_claim":
    case "worker_continuation":
    case "provider_dispatch":
      if(observation.transactionOutcome!=="committed"||
         !observation.scopedAdmissionRecorded||
         !observation.ownershipFenceCurrent||!observation.revocationStillClear)
        return blocked("fenced_authority_not_current");
      break;
    case "recovery":
      if(observation.transactionOutcome!=="committed"||
         !observation.scopedAdmissionRecorded||
         !observation.ownershipFenceCurrent||!observation.revocationStillClear||
         !observation.recoveryUsesTrustedQueue)
        return blocked("recovery_cannot_use_legacy_queue");
      break;
    default:
      return blocked("unknown_phase");
  }
  return {decision:"design_consistent",reason:"synthetic_only_no_runtime_authority"};
}
