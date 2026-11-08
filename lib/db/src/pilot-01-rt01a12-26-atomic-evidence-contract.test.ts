/** A12.26 disconnected adversarial certification; synthetic data ONLY. */
import test from "node:test";
import assert from "node:assert/strict";
import {sourceGate} from "./pilot-01-rt01a12-23-migration-lineage-gate.js";
import type {EvidencePackage,WitnessedArtifact} from "./pilot-01-rt01a12-24-disconnected-evidence-gate.js";
import type {ProvenanceEnvelope,IndependentProvenanceAuthority} from "./pilot-01-rt01a12-25-provenance-cert-design.js";
import {assessAndConsumeEvidence,type AnchorCertificate,type AtomicClaim,
 type AtomicEvidenceConsumptionPort,type IndependentAnchorAuthority}
 from "./pilot-01-rt01a12-26-atomic-evidence-contract.js";
const now=Date.parse("2026-11-08T15:00:00.000Z");
const target={provider:"synthetic",projectId:"project-ci",environmentId:"env-ci",
 serviceId:"service-ci",databaseId:"database-ci",deploymentId:"deployment-ci",
 sourceRevision:"revision-ci"};
const a=(name:string,digit:string):WitnessedArtifact=>({
 artifactId:"artifact-"+name,resource:target,collectedAtUtc:new Date(now).toISOString(),
 evidenceDigestSha256:digit.repeat(64),collectorId:"collector-ci",witnessId:"reviewer-ci",
 witnessProofRef:"proof-"+name,approvalRef:"approval-"+name
});
const source=sourceGate(Array.from({length:11},(_,i)=>({
 name:String(i+1).padStart(4,"0")+"_synthetic.sql",
 sql:"BEGIN; SELECT "+(i+1)+"; COMMIT;"
})),[]);
const evidence=():EvidencePackage=>({
 anchor:a("anchor","1"),binding:a("binding","2"),ledger:a("ledger","3"),catalog:a("catalog","4"),
 expectedSource:{canonical:source,schema:[{kind:"role",identity:"test-role",definitionSha256:"c".repeat(64)}]},
 observedSchema:[{kind:"role",identity:"test-role",definitionSha256:"c".repeat(64)}],
 installed:source.inventory.map((x,i)=>({...x,namespace:"canonical-main" as const,
  appliedAtUtc:new Date(now).toISOString(),receiptRef:"receipt-ci-"+i})),
 recovery:{sourceSnapshotRef:"source-ci",backupLineageRef:"backup-ci",
  restoreExerciseRef:"restore-ci",rollbackPlanRef:"rollback-ci",recoveryReviewRef:"review-ci"},
 approvedNamespaceMappingRef:null
});
const envelope=():ProvenanceEnvelope=>({
 packageId:"package-ci",target,observationId:"observation-ci",nonce:"a".repeat(64),
 issuedAtUtc:new Date(now-1000).toISOString(),expiresAtUtc:new Date(now+60000).toISOString(),
 policyRevision:"policy-ci",evidence:evidence()
});
const anchor=():AnchorCertificate=>({
 issuerId:"issuer-ci",keyId:"key-ci",epoch:1,subjectTarget:target,
 effectiveAtUtc:new Date(now-60000).toISOString(),expiresAtUtc:new Date(now+60000).toISOString(),
 proofRef:"proof-issuer-ci"
});
const provenance=():IndependentProvenanceAuthority=>({
 trustedNow:async()=>now,
 authenticateEnvelope:async()=>({authenticated:true,trustedAuthorityId:"root-ci",
  targetBindingId:"binding-ci",observationId:"observation-ci",policyRevision:"policy-ci",
  independentReviewerId:"reviewer-ci",authenticatedCollectorId:"collector-ci"}),
 attestReplayState:async()=>({authenticated:true,previouslyObserved:false,
  trustedAuthorityId:"root-ci",targetBindingId:"binding-ci"}),
 evidence:{authenticate:async()=>({verified:true,trustedAuthorityId:"root-ci",
  targetBindingId:"binding-ci"})}
});
const authority=(state:"ACTIVE"|"REVOKED"|"ROTATED"|"UNKNOWN"="ACTIVE"):IndependentAnchorAuthority=>({
 inspect:async()=>({authenticated:true,state,authorityId:"root-ci",
  targetBindingId:"binding-ci",issuerId:"issuer-ci",keyId:"key-ci",epoch:1})
});
/** Synthetic linearization: no await between checking and setting. Operational
 * persistence, cross-process atomicity and revocation locks remain unproven.
 */
class SyntheticAtomicPort implements AtomicEvidenceConsumptionPort{
 private used=new Map<string,string>();
 private key(c:AtomicClaim){
  return [c.target.provider,c.target.projectId,c.target.environmentId,
   c.target.serviceId,c.target.databaseId,c.target.deploymentId,c.target.sourceRevision,
   c.issuerId,c.epoch,c.nonce].join("|");
 }
 async consume(c:AtomicClaim,_a:AnchorCertificate){
  const key=this.key(c),old=this.used.get(key);
  if(old)return old===c.packageId?"ALREADY_CONSUMED" as const:"CONFLICT" as const;
  this.used.set(key,c.packageId);
  return "CONSUMED" as const;
 }
}
test("A12.26 single mocked atomic consume succeeds but never grants operational authority",async()=>{
 const out=await assessAndConsumeEvidence(envelope(),anchor(),provenance(),authority(),new SyntheticAtomicPort());
 assert.deepEqual(out,{disposition:"PASS",issues:[],syntheticConsumption:"CONSUMED",
  operationalExecutionAuthorized:false});
});
test("A12.26 deterministic concurrent same nonce has exactly one successful consume",async()=>{
 const p=envelope(),a=anchor(),ledger=new SyntheticAtomicPort();
 const outcomes=await Promise.all(Array.from({length:32},()=>assessAndConsumeEvidence(
  p,a,provenance(),authority(),ledger)));
 assert.equal(outcomes.filter(x=>x.syntheticConsumption==="CONSUMED").length,1);
 assert.equal(outcomes.filter(x=>x.issues.includes("ATOMIC_NONCE_ALREADY_CONSUMED")).length,31);
 assert.ok(outcomes.every(x=>!x.operationalExecutionAuthorized));
});
test("A12.26 revoked, rotated and unknown trust anchors fail closed before consumption",async()=>{
 for(const state of ["REVOKED","ROTATED","UNKNOWN"] as const){
  const out=await assessAndConsumeEvidence(envelope(),anchor(),provenance(),
   authority(state),new SyntheticAtomicPort());
  assert.equal(out.disposition,state==="UNKNOWN"?"UNVERIFIED":"BLOCKED");
  assert.equal(out.syntheticConsumption,"NOT_CONSUMED");
 }
});
test("A12.26 expired, wrong-target and issuer epoch mismatch denied",async()=>{
 const a=anchor(),p=envelope(),v=provenance();
 for(const bad of [
  {...a,subjectTarget:{...target,databaseId:"other-database"}},
  {...a,epoch:0},
  {...a,expiresAtUtc:new Date(now-1).toISOString()}
 ]){
  const result=await assessAndConsumeEvidence(p,bad,v,authority(),new SyntheticAtomicPort());
  assert.equal(result.disposition,"BLOCKED");
 }
 const badAuthority:IndependentAnchorAuthority={inspect:async()=>({
  authenticated:true,state:"ACTIVE",authorityId:"root-ci",
  targetBindingId:"binding-ci",issuerId:"issuer-ci",keyId:"different-key",epoch:1
 })};
 assert.equal((await assessAndConsumeEvidence(p,a,v,badAuthority,
  new SyntheticAtomicPort())).disposition,"UNVERIFIED");
});
test("A12.26 forged issuer, offline custody and ambiguous commit fail closed",async()=>{
 const fake:IndependentAnchorAuthority={inspect:async()=>({
  authenticated:false,state:"ACTIVE",authorityId:"root-ci",targetBindingId:"binding-ci",
  issuerId:"issuer-ci",keyId:"key-ci",epoch:1
 })};
 assert.equal((await assessAndConsumeEvidence(envelope(),anchor(),provenance(),
  fake,new SyntheticAtomicPort())).disposition,"UNVERIFIED");
 const down:AtomicEvidenceConsumptionPort={consume:async()=>{throw Error("offline");}};
 assert.equal((await assessAndConsumeEvidence(envelope(),anchor(),provenance(),
  authority(),down)).disposition,"UNVERIFIED");
 const uncertain:AtomicEvidenceConsumptionPort={consume:async()=> "UNKNOWN"};
 assert.ok((await assessAndConsumeEvidence(envelope(),anchor(),provenance(),
  authority(),uncertain)).issues.includes("ATOMIC_CONSUMPTION_INDETERMINATE"));
});
test("A12.26 conflicting package on same issuer target nonce never creates another success",async()=>{
 const ledger=new SyntheticAtomicPort(),p=envelope(),a=anchor();
 const first=await assessAndConsumeEvidence(p,a,provenance(),authority(),ledger);
 assert.equal(first.disposition,"PASS");
 const second=await assessAndConsumeEvidence({...p,packageId:"package-tampered"},a,
  provenance(),authority(),ledger);
 assert.equal(second.disposition,"BLOCKED");
 assert.ok(second.issues.includes("ATOMIC_CUSTODY_OR_TARGET_CONFLICT"));
});
test("A12.26 A12.23 historical UGP collisions and A12.24 privilege drift cannot consume",async()=>{
 const good=envelope(),a=anchor();
 const bad=[{...good,evidence:{...good.evidence,installed:[...good.evidence.installed,{
  ...good.evidence.installed[7],namespace:"legacy-ugp" as const,receiptRef:"legacy-ci"}]}},
  {...good,evidence:{...good.evidence,observedSchema:[{
   kind:"role" as const,identity:"test-role",definitionSha256:"f".repeat(64)}]}}];
 for(const p of bad){
  const port:AtomicEvidenceConsumptionPort={consume:async()=>{throw Error("must not call");}};
  const out=await assessAndConsumeEvidence(p,a,provenance(),authority(),port);
  assert.equal(out.disposition,"BLOCKED");
  assert.equal(out.syntheticConsumption,"NOT_CONSUMED");
 }
});
