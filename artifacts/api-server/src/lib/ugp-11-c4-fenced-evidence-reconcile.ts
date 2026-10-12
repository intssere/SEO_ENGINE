/** UGP-11.C4 independent marker + fenced-state reconciliation, pure evidence only.
 * Never dispatches, retries, connects, persists, or grants production authority.
 */
import {reconcileUncertainCommit, type CommitDisposition} from "./ugp-11-c4-commit-uncertainty-policy.js";
type Identity = Readonly<{attemptId:string;tenantId:string;siteId:string;jobIdentity:string;fingerprint:string;priorFence:number;committedFence:number;priorAttempts:number;owner:string}>;
type Marker = Readonly<{attemptId:string;tenantId:string;siteId:string;jobIdentity:string;fingerprint:string;priorFence:number;committedFence:number}>;
type Job = Readonly<{workerId:string;fence:number;attempts:number}>;
export type EvidenceSnapshot = Readonly<{kind:"available";markers:readonly Marker[];job:Job|null}|{kind:"unavailable"|"partial"|"conflicting"}>;
const uncertain=():CommitDisposition=>({outcome:"manual_intervention_required",automaticRetryAllowed:false,providerDispatchAllowed:false,productionAuthority:false});
export function reconcileFencedCommitEvidence(expected:Identity,snapshot:EvidenceSnapshot):CommitDisposition {
 if(!/^[0-9a-f]{64}$/.test(expected.jobIdentity)|| !/^[0-9a-f]{64}$/.test(expected.fingerprint)||
    !expected.attemptId||!expected.tenantId||!expected.siteId||!expected.owner||
    !Number.isSafeInteger(expected.priorFence)||expected.priorFence<0||
    !Number.isSafeInteger(expected.committedFence)||expected.committedFence!==expected.priorFence+1||
    !Number.isSafeInteger(expected.priorAttempts)||expected.priorAttempts<0) return uncertain();
 if(snapshot.kind!=="available"||snapshot.markers.length!==1||!snapshot.job)return uncertain();
 const marker=snapshot.markers[0]!,job=snapshot.job;
 if(marker.attemptId!==expected.attemptId||marker.tenantId!==expected.tenantId||
    marker.siteId!==expected.siteId||marker.jobIdentity!==expected.jobIdentity||
    marker.fingerprint!==expected.fingerprint||marker.priorFence!==expected.priorFence||
    marker.committedFence!==expected.committedFence||job.workerId!==expected.owner||
    job.fence!==expected.committedFence||job.attempts!==expected.priorAttempts+1)
    return uncertain();
 return reconcileUncertainCommit({attemptId:expected.attemptId,fingerprint:expected.fingerprint},
    {kind:"durable_attempt",attemptId:marker.attemptId,fingerprint:marker.fingerprint,outcome:"committed",independentlyVerified:true});
}
