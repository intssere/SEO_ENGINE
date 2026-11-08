/**
 * RT01-A12.26 — disconnected atomic replay/custody design.
 * Reuses A12.25 provenance certification (and transitively A12.24/A12.23).
 * No operational implementation, provider, SQL, credential or runtime linkage.
 */
import {assessProvenanceEnvelope,type ProvenanceEnvelope,
 type IndependentProvenanceAuthority}
 from "./pilot-01-rt01a12-25-provenance-cert-design.js";
import type {EvidenceDisposition,ResourceIdentity}
 from "./pilot-01-rt01a12-24-disconnected-evidence-gate.js";

export type AnchorCertificate=Readonly<{
 issuerId:string;keyId:string;epoch:number;subjectTarget:ResourceIdentity;
 effectiveAtUtc:string;expiresAtUtc:string;proofRef:string;
}>;
export type TrustAnchorState="ACTIVE"|"REVOKED"|"ROTATED"|"UNKNOWN";
export interface IndependentAnchorAuthority{
 /** Authenticate issuer key and exact target from an external, trusted root.
  * Attest revocation and rotation at the point of reserve/commit, not solely
  * when evidence is first collected. No caller-provided 'verified' shortcut.
  */
 inspect(anchor:AnchorCertificate,target:ResourceIdentity):Promise<Readonly<{
  authenticated:boolean;state:TrustAnchorState;authorityId:string;
  issuerId:string;keyId:string;epoch:number;targetBindingId:string;
 }>>;
}
export type AtomicClaim=Readonly<{
 target:ResourceIdentity;issuerId:string;keyId:string;epoch:number;
 packageId:string;observationId:string;nonce:string;
}>;
export type AtomicResult="CONSUMED"|"ALREADY_CONSUMED"|"CONFLICT"|"UNKNOWN";
export interface AtomicEvidenceConsumptionPort{
 /** MUST be a single linearizable, durable compare-and-consume operation;
  * store nonce uniqueness by independent authority/target/issuer/epoch.
  * A best-effort read-before-write, transactionless mutex, cache or
  * in-memory map is not a compliant operational implementation.
  * Recheck anchor revocation/rotation inside the same atomic boundary in
  * any eventual operational adapter. This interface supplies no adapter.
  */
 consume(claim:AtomicClaim,anchor:AnchorCertificate):Promise<AtomicResult>;
}
export type AtomicEvidenceDecision=Readonly<{
 disposition:EvidenceDisposition;issues:readonly string[];
 syntheticConsumption:"CONSUMED"|"NOT_CONSUMED";
 operationalExecutionAuthorized:false;
}>;
const valid=(s:unknown):s is string=>typeof s==="string"&&
 s.length>=3&&s.length<=256&&s===s.trim()&&!/[\s\u0000-\u001f]/.test(s);
const same=(a:ResourceIdentity,b:ResourceIdentity):boolean=>
 a.provider===b.provider&&a.projectId===b.projectId&&
 a.environmentId===b.environmentId&&a.serviceId===b.serviceId&&
 a.databaseId===b.databaseId&&a.deploymentId===b.deploymentId&&
 a.sourceRevision===b.sourceRevision;
const decision=(disposition:EvidenceDisposition,issues:string[],
 syntheticConsumption:"CONSUMED"|"NOT_CONSUMED"="NOT_CONSUMED"):AtomicEvidenceDecision=>
 ({disposition,issues,syntheticConsumption,operationalExecutionAuthorized:false});
/** A12.25 read-only evidence evaluation first. No nonce consumed for
 * invalid historical history, revoked issuer or catalog drift. Atomic consume
 * occurs only following independently authenticated issuer and evidence.
 *
 * Design limitation: separate inspect and consume leave a TOCTOU window.
 * Any actual adapter must validate revocation inside its atomic consume
 * transaction, and the independent authority must remain available.
 */
export async function assessAndConsumeEvidence(
 envelope:ProvenanceEnvelope|null,anchor:AnchorCertificate|null,
 provenance:IndependentProvenanceAuthority,anchors:IndependentAnchorAuthority,
 ledger:AtomicEvidenceConsumptionPort,
):Promise<AtomicEvidenceDecision>{
 if(!envelope||!anchor)return decision("UNVERIFIED",["MISSING_ENVELOPE_OR_ANCHOR"]);
 if(!same(envelope.target,anchor.subjectTarget)||!valid(anchor.issuerId)||
  !valid(anchor.keyId)||!valid(anchor.proofRef)||
  !Number.isSafeInteger(anchor.epoch)||anchor.epoch<1)
  return decision("BLOCKED",["INVALID_ISSUER_OR_CROSS_TARGET_ANCHOR"]);
 const checked=await assessProvenanceEnvelope(envelope,provenance);
 if(checked.disposition!=="PASS")return decision(checked.disposition,[...checked.issues]);
 let clock:number;
 try{clock=await provenance.trustedNow();}
 catch{return decision("UNVERIFIED",["TRUSTED_ANCHOR_CLOCK_UNAVAILABLE"]);}
 const start=Date.parse(anchor.effectiveAtUtc),end=Date.parse(anchor.expiresAtUtc);
 if(!Number.isFinite(clock)||!Number.isFinite(start)||!Number.isFinite(end)||
  start>clock||end<=clock||end<=start)
  return decision("BLOCKED",["ANCHOR_NOT_ACTIVE_AT_TRUSTED_TIME"]);
 let verified:Awaited<ReturnType<IndependentAnchorAuthority["inspect"]>>;
 try{verified=await anchors.inspect(anchor,envelope.target);}
 catch{return decision("UNVERIFIED",["ANCHOR_AUTHORITY_UNAVAILABLE"]);}
 if(!verified?.authenticated||!valid(verified.authorityId)||
  !valid(verified.targetBindingId)||verified.issuerId!==anchor.issuerId||
  verified.keyId!==anchor.keyId||verified.epoch!==anchor.epoch)
  return decision("UNVERIFIED",["ANCHOR_AUTHENTICITY_UNVERIFIED"]);
 if(verified.state!=="ACTIVE")
  return decision(verified.state==="UNKNOWN"?"UNVERIFIED":"BLOCKED",
   ["ANCHOR_"+verified.state]);
 // Cross-layer binding is ultimately attested inside the atomic boundary.
 const claim:AtomicClaim={target:envelope.target,issuerId:anchor.issuerId,
  keyId:anchor.keyId,epoch:anchor.epoch,packageId:envelope.packageId,
  observationId:envelope.observationId,nonce:envelope.nonce};
 try{
  const result=await ledger.consume(claim,anchor);
  if(result==="CONSUMED")return decision("PASS",[],"CONSUMED");
  if(result==="ALREADY_CONSUMED")return decision("BLOCKED",["ATOMIC_NONCE_ALREADY_CONSUMED"]);
  if(result==="CONFLICT")return decision("BLOCKED",["ATOMIC_CUSTODY_OR_TARGET_CONFLICT"]);
  return decision("UNVERIFIED",["ATOMIC_CONSUMPTION_INDETERMINATE"]);
 }catch{return decision("UNVERIFIED",["ATOMIC_CONSUMPTION_UNAVAILABLE"]);}
}
