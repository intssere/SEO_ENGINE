/**
 * RT01-A12.25 — disconnected provenance certification *design*, not an
 * operational verifier or permission to inspect/mutate any database.
 *
 * Reuses A12.24 evidence reconciliation and A12.23 migration history checks.
 * A trusted external authority must prove attestation cryptography,
 * authenticated role/identity, target and append-only replay state. This
 * module has no provider, database, cryptographic key or runtime connection.
 */
import {assessLineageEvidence,type EvidencePackage,type IndependentEvidenceVerifier,
  type EvidenceDisposition,type ResourceIdentity
} from "./pilot-01-rt01a12-24-disconnected-evidence-gate.js";

export type ProvenanceEnvelope=Readonly<{
  packageId:string;
  target:ResourceIdentity;
  observationId:string;
  nonce:string;
  issuedAtUtc:string;
  expiresAtUtc:string;
  policyRevision:string;
  evidence:EvidencePackage;
}>;
export type ProvenanceDecision=Readonly<{
  disposition:EvidenceDisposition;
  issues:readonly string[];
  operationalExecutionAuthorized:false;
}>;
export type IndependentProvenanceAuthority=Readonly<{
  evidence:IndependentEvidenceVerifier;
  /**
   * Authenticate a canonical envelope hash and signatures via an independently
   * trusted registry/verification channel; caller-supplied flags are invalid.
   * Returned identifiers must be scoped to the envelope's exact target.
   * This interface has no implementation in A12.25.
   */
  authenticateEnvelope(input:ProvenanceEnvelope):Promise<Readonly<{
    authenticated:boolean; trustedAuthorityId:string; targetBindingId:string;
    observationId:string; policyRevision:string; independentReviewerId:string;
    authenticatedCollectorId:string;
  }>>;
  /**
   * A read-only observation of a separately attested append-only nonce ledger.
   * Checking a fabricated array is not replay protection. If unavailable,
   * disposition MUST remain UNVERIFIED. No reservation/consume/write here.
   */
  attestReplayState(input:Readonly<{
    target:ResourceIdentity;nonce:string;observationId:string;
  }>):Promise<Readonly<{
    authenticated:boolean; previouslyObserved:boolean;
    trustedAuthorityId:string;targetBindingId:string;
  }>>;
  trustedNow():Promise<number>;
}>;
const clean=(v:unknown):v is string=>typeof v==="string"&&v.length>=3&&
 v.length<=256&&v===v.trim()&&!/[\s\u0000-\u001f]/.test(v);
const digest=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
const iso=(v:unknown):v is string=>typeof v==="string"&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&
 Number.isFinite(Date.parse(v));
const targetKey=(r:ResourceIdentity)=>[
 r.provider,r.projectId,r.environmentId,r.serviceId,r.databaseId,
 r.deploymentId,r.sourceRevision
].join(":");
const sameTarget=(a:ResourceIdentity,b:ResourceIdentity)=>
 targetKey(a)===targetKey(b);
/** Stronger policy is intentionally additive: no edits to A12.24's
 * historical namespace-ambiguity stop or schema/role/RLS drift gate.
 *
 * PASS means the contract was satisfied by the *injected verifier*. In tests
 * that is a synthetic mock. It is not a production readiness certification.
 */
export async function assessProvenanceEnvelope(
 envelope:ProvenanceEnvelope|null,authority:IndependentProvenanceAuthority,
):Promise<ProvenanceDecision>{
 const problems:string[]=[];
 const denied=(disposition:EvidenceDisposition,issues:readonly string[]):ProvenanceDecision=>
  ({disposition,issues,operationalExecutionAuthorized:false});
 if(!envelope)return denied("UNVERIFIED",["MISSING_PROVENANCE_ENVELOPE"]);
 if(!envelope.evidence?.anchor?.resource||!envelope.target||
  ![envelope.packageId,envelope.observationId,envelope.policyRevision].every(clean)||
  !digest(envelope.nonce)||!iso(envelope.issuedAtUtc)||!iso(envelope.expiresAtUtc))
  return denied("BLOCKED",["INVALID_PROVENANCE_ENVELOPE"]);
 if(!sameTarget(envelope.target,envelope.evidence.anchor.resource))
  return denied("BLOCKED",["ENVELOPE_TARGET_SUBSTITUTION"]);
 const artifacts=[envelope.evidence.anchor,envelope.evidence.binding,
  envelope.evidence.ledger,envelope.evidence.catalog];
 if(artifacts.some(a=>!a||!sameTarget(a.resource,envelope.target)))
  return denied("BLOCKED",["ARTIFACT_TARGET_SUBSTITUTION"]);
 if(artifacts.some(a=>a.collectorId===a.witnessId||
  a.collectorId===envelope.policyRevision||a.witnessId===envelope.policyRevision))
  return denied("BLOCKED",["SELF_ATTESTED_WITNESS"]);
 let now:number;
 try{now=await authority.trustedNow();}
 catch{return denied("UNVERIFIED",["TRUSTED_CLOCK_UNAVAILABLE"]);}
 if(!Number.isFinite(now))return denied("UNVERIFIED",["TRUSTED_CLOCK_UNAVAILABLE"]);
 const issued=Date.parse(envelope.issuedAtUtc),expires=Date.parse(envelope.expiresAtUtc);
 if(issued>now+60_000||expires<=issued||expires<=now||
  expires-issued>15*60_000)return denied("BLOCKED",["STALE_OR_UNBOUNDED_ATTESTATION"]);
 let verified:Awaited<ReturnType<IndependentProvenanceAuthority["authenticateEnvelope"]>>;
 try{verified=await authority.authenticateEnvelope(envelope);}
 catch{return denied("UNVERIFIED",["PROVENANCE_AUTHORITY_UNAVAILABLE"]);}
 if(!verified?.authenticated||!clean(verified.trustedAuthorityId)||
  !clean(verified.targetBindingId)||!clean(verified.independentReviewerId)||
  !clean(verified.authenticatedCollectorId)||verified.observationId!==envelope.observationId||
  verified.policyRevision!==envelope.policyRevision)
  return denied("UNVERIFIED",["INDEPENDENT_AUTHENTICATION_UNPROVEN"]);
 if(verified.authenticatedCollectorId!==envelope.evidence.anchor.collectorId||
  verified.independentReviewerId!==envelope.evidence.anchor.witnessId||
  verified.independentReviewerId===verified.authenticatedCollectorId||
  verified.trustedAuthorityId===verified.independentReviewerId||
  verified.trustedAuthorityId===verified.authenticatedCollectorId)
  return denied("BLOCKED",["COLLECTOR_WITNESS_AUTHORITY_NOT_SEPARATED"]);
 let replay:Awaited<ReturnType<IndependentProvenanceAuthority["attestReplayState"]>>;
 try{replay=await authority.attestReplayState({
  target:envelope.target,nonce:envelope.nonce,observationId:envelope.observationId
 });}
 catch{return denied("UNVERIFIED",["REPLAY_REGISTRY_UNAVAILABLE"]);}
 if(!replay?.authenticated||replay.trustedAuthorityId!==verified.trustedAuthorityId||
  replay.targetBindingId!==verified.targetBindingId)
  return denied("UNVERIFIED",["REPLAY_STATE_NOT_INDEPENDENTLY_ATTESTED"]);
 if(replay.previouslyObserved)return denied("BLOCKED",["REPLAYED_EVIDENCE_NONCE"]);
 const base=await assessLineageEvidence(envelope.evidence,authority.evidence);
 if(base.disposition!=="PASS")return denied(base.disposition,base.issues);
 // Strictly preserve the A12.24 foreign namespace block. Any future mapping
 // resolution is a new, separately authorized contract, not a text reference.
 if(envelope.evidence.installed.some(r=>r.namespace!=="canonical-main"))
  problems.push("UGP_COLLISION_REQUIRES_SEPARATE_AUTHORITY");
 return denied(problems.length?"BLOCKED":"PASS",problems);
}
