/** Offline adversarial A12.25 fixtures; no actual database or witness. */
import test from "node:test";
import assert from "node:assert/strict";
import {sourceGate} from "./pilot-01-rt01a12-23-migration-lineage-gate.js";
import {type EvidencePackage,type WitnessedArtifact}
 from "./pilot-01-rt01a12-24-disconnected-evidence-gate.js";
import {assessProvenanceEnvelope,type IndependentProvenanceAuthority,
 type ProvenanceEnvelope} from "./pilot-01-rt01a12-25-provenance-cert-design.js";
const clock=Date.parse("2026-11-08T15:00:00.000Z");
const target={provider:"synthetic",projectId:"project-test",environmentId:"env-test",
 serviceId:"service-test",databaseId:"database-test",deploymentId:"deployment-test",
 sourceRevision:"revision-test"};
const artifact=(kind:string,hashDigit:string):WitnessedArtifact=>({
 artifactId:"artifact-"+kind,resource:target,collectedAtUtc:new Date(clock).toISOString(),
 evidenceDigestSha256:hashDigit.repeat(64),collectorId:"collector-test",
 witnessId:"reviewer-test",witnessProofRef:"proof-"+kind,approvalRef:"approval-"+kind
});
const canonical=sourceGate(Array.from({length:11},(_,i)=>({
 name:String(i+1).padStart(4,"0")+"_synthetic.sql",
 sql:"BEGIN; SELECT "+(i+1)+"; COMMIT;"
})),[]);
const schema=[{kind:"rls" as const,identity:"pilot01.grants",definitionSha256:"d".repeat(64)},
 {kind:"role" as const,identity:"pilot01_a12_21_api",definitionSha256:"e".repeat(64)}];
const evidence=():EvidencePackage=>({
 anchor:artifact("anchor","1"),binding:artifact("binding","2"),
 ledger:artifact("ledger","3"),catalog:artifact("catalog","4"),
 expectedSource:{canonical,schema},observedSchema:[...schema],
 installed:canonical.inventory.map((r,i)=>({...r,namespace:"canonical-main" as const,
  appliedAtUtc:new Date(clock).toISOString(),receiptRef:"receipt-synthetic-"+i})),
 recovery:{sourceSnapshotRef:"source-snapshot",backupLineageRef:"backup-lineage",
  restoreExerciseRef:"restore-exercise",rollbackPlanRef:"rollback-plan",
  recoveryReviewRef:"recovery-review"},approvedNamespaceMappingRef:null
});
const packet=():ProvenanceEnvelope=>({
 packageId:"package-synthetic",target,observationId:"observation-synthetic",
 nonce:"a".repeat(64),issuedAtUtc:new Date(clock-1000).toISOString(),
 expiresAtUtc:new Date(clock+60000).toISOString(),
 policyRevision:"policy-revision-synthetic",evidence:evidence()
});
const verifier=():IndependentProvenanceAuthority=>({
 trustedNow:async()=>clock,
 authenticateEnvelope:async()=>({
  authenticated:true,trustedAuthorityId:"external-authority-test",
  targetBindingId:"target-binding-test",observationId:"observation-synthetic",
  policyRevision:"policy-revision-synthetic",independentReviewerId:"reviewer-test",
  authenticatedCollectorId:"collector-test"
 }),
 attestReplayState:async()=>({authenticated:true,previouslyObserved:false,
  trustedAuthorityId:"external-authority-test",targetBindingId:"target-binding-test"}),
 evidence:{authenticate:async()=>({verified:true,trustedAuthorityId:"external-authority-test",
  targetBindingId:"target-binding-test"})}
});
test("A12.25 missing packet UNVERIFIED, never authorizes operational execution",async()=>{
 const r=await assessProvenanceEnvelope(null,verifier());
 assert.equal(r.disposition,"UNVERIFIED");assert.equal(r.operationalExecutionAuthorized,false);
});
test("A12.25 passing synthetic mock is contract-only and cannot authorize SQL",async()=>{
 const r=await assessProvenanceEnvelope(packet(),verifier());
 assert.deepEqual(r,{disposition:"PASS",issues:[],operationalExecutionAuthorized:false});
});
test("A12.25 expired, future or excessively long attestations BLOCK",async()=>{
 const p=packet();
 for(const modified of [
  {...p,expiresAtUtc:new Date(clock-1).toISOString()},
  {...p,issuedAtUtc:new Date(clock+120000).toISOString()},
  {...p,issuedAtUtc:new Date(clock-3600000).toISOString()},
  {...p,nonce:"not-a-sha"}
 ]){
  assert.equal((await assessProvenanceEnvelope(modified,verifier())).disposition,"BLOCKED");
 }
});
test("A12.25 reused nonce, forged registry and unavailable verifier fail closed",async()=>{
 const base=verifier();
 const replay:IndependentProvenanceAuthority={...base,
  attestReplayState:async()=>({authenticated:true,previouslyObserved:true,
   trustedAuthorityId:"external-authority-test",targetBindingId:"target-binding-test"})};
 assert.ok((await assessProvenanceEnvelope(packet(),replay)).issues.includes("REPLAYED_EVIDENCE_NONCE"));
 const forged:IndependentProvenanceAuthority={...base,
  attestReplayState:async()=>({authenticated:false,previouslyObserved:false,
   trustedAuthorityId:"external-authority-test",targetBindingId:"target-binding-test"})};
 assert.equal((await assessProvenanceEnvelope(packet(),forged)).disposition,"UNVERIFIED");
 const outage:IndependentProvenanceAuthority={...base,
  authenticateEnvelope:async()=>{throw Error("synthetic-unavailable");}};
 assert.equal((await assessProvenanceEnvelope(packet(),outage)).disposition,"UNVERIFIED");
});
test("A12.25 target/deployment substitution and foreign verifier binding BLOCK",async()=>{
 const p=packet(),base=verifier();
 const substituted={...p,target:{...p.target,deploymentId:"other-deployment"}};
 assert.ok((await assessProvenanceEnvelope(substituted,base)).issues.includes("ENVELOPE_TARGET_SUBSTITUTION"));
 const foreign={...p,evidence:{...p.evidence,catalog:{
  ...p.evidence.catalog,resource:{...p.target,databaseId:"other-database"}}}};
 assert.ok((await assessProvenanceEnvelope(foreign,base)).issues.includes("ARTIFACT_TARGET_SUBSTITUTION"));
 const mismatched:IndependentProvenanceAuthority={...base,
  attestReplayState:async()=>({authenticated:true,previouslyObserved:false,
   trustedAuthorityId:"external-authority-test",targetBindingId:"other-binding"})};
 assert.equal((await assessProvenanceEnvelope(p,mismatched)).disposition,"UNVERIFIED");
});
test("A12.25 collector and reviewer must be distinct and authenticated",async()=>{
 const p=packet(),base=verifier();
 const self={...p,evidence:{...p.evidence,anchor:{
  ...p.evidence.anchor,witnessId:p.evidence.anchor.collectorId}}};
 assert.equal((await assessProvenanceEnvelope(self,base)).disposition,"BLOCKED");
 const wrong:IndependentProvenanceAuthority={...base,authenticateEnvelope:async()=>({
  authenticated:true,trustedAuthorityId:"external-authority-test",
  targetBindingId:"target-binding-test",observationId:"observation-synthetic",
  policyRevision:"policy-revision-synthetic",independentReviewerId:"imposter-reviewer",
  authenticatedCollectorId:"collector-test"
 })};
 assert.ok((await assessProvenanceEnvelope(p,wrong)).issues.includes("COLLECTOR_WITNESS_AUTHORITY_NOT_SEPARATED"));
});
test("A12.25 tampered ledger, UGP collision and privilege drift remain blocked by A12.23/A12.24",async()=>{
 const p=packet(),base=verifier();
 const examples=[
  {...p,evidence:{...p.evidence,installed:p.evidence.installed.slice(1)}},
  {...p,evidence:{...p.evidence,installed:[...p.evidence.installed,{
   ...p.evidence.installed[7],namespace:"legacy-ugp" as const,receiptRef:"legacy-receipt"}]}},
  {...p,evidence:{...p.evidence,observedSchema:p.evidence.observedSchema.map(x=>
   x.kind==="role"?{...x,definitionSha256:"f".repeat(64)}:x)}}
 ];
 for(const x of examples){
  const r=await assessProvenanceEnvelope(x,base);
  assert.equal(r.disposition,"BLOCKED");assert.equal(r.operationalExecutionAuthorized,false);
 }
});
test("A12.25 unavailable clock and stale policy proof remain unverified",async()=>{
 const base=verifier();
 const clockDown:IndependentProvenanceAuthority={...base,
  trustedNow:async()=>{throw Error("clock-down");}};
 assert.equal((await assessProvenanceEnvelope(packet(),clockDown)).disposition,"UNVERIFIED");
 const wrongPolicy:IndependentProvenanceAuthority={...base,
  authenticateEnvelope:async()=>({
   authenticated:true,trustedAuthorityId:"external-authority-test",
   targetBindingId:"target-binding-test",observationId:"observation-synthetic",
   policyRevision:"wrong-policy-revision",independentReviewerId:"reviewer-test",
   authenticatedCollectorId:"collector-test"
  })};
 assert.equal((await assessProvenanceEnvelope(packet(),wrongPolicy)).disposition,"UNVERIFIED");
});
