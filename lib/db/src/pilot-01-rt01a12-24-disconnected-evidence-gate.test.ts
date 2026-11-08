/** A12.24 adversarial disconnected evidence fixtures — NOT operational receipts. */
import test from "node:test";
import assert from "node:assert/strict";
import {sourceGate} from "./pilot-01-rt01a12-23-migration-lineage-gate.js";
import {assessLineageEvidence,type EvidencePackage,type IndependentEvidenceVerifier,
  type WitnessedArtifact} from "./pilot-01-rt01a12-24-disconnected-evidence-gate.js";

const resource={provider:"SYNTHETIC",projectId:"project-test",environmentId:"env-test",
  serviceId:"service-test",databaseId:"database-test",deploymentId:"deployment-test",
  sourceRevision:"revision-test"};
const artifact=(name:string,digit:string):WitnessedArtifact=>({
  artifactId:"artifact-"+name,resource,collectedAtUtc:"2026-11-08T00:00:00.000Z",
  evidenceDigestSha256:digit.repeat(64),collectorId:"collector-test",
  witnessId:"independent-witness-test",witnessProofRef:"offline-proof-"+name,
  approvalRef:"offline-approval-"+name
});
const canonicalSource=Array.from({length:11},(_,i)=>({
  name:String(i+1).padStart(4,"0")+"_synthetic.sql",
  sql:"BEGIN; SELECT "+(i+1)+"; COMMIT;"
}));
const source=sourceGate(canonicalSource,[]);
assert.equal(source.status,"pass");
const schema=[
  {kind:"table" as const,identity:"public.organizations",definitionSha256:"c".repeat(64)},
  {kind:"rls" as const,identity:"pilot01.grants",definitionSha256:"d".repeat(64)},
  {kind:"role" as const,identity:"pilot01_a12_21_api",definitionSha256:"e".repeat(64)}
];
const fixture=():EvidencePackage=>({
  anchor:artifact("anchor","1"),binding:artifact("binding","2"),
  ledger:artifact("ledger","3"),catalog:artifact("catalog","4"),
  expectedSource:{canonical:source,schema},observedSchema:[...schema],
  installed:source.inventory.map((r,i)=>({...r,namespace:"canonical-main" as const,
    appliedAtUtc:"2026-11-08T00:00:00.000Z",receiptRef:"synthetic-receipt-"+i})),
  recovery:{sourceSnapshotRef:"snapshot-test",backupLineageRef:"backup-test",
    restoreExerciseRef:"restore-test",rollbackPlanRef:"rollback-test",
    recoveryReviewRef:"recovery-review-test"},
  approvedNamespaceMappingRef:null
});
const mockVerifier:IndependentEvidenceVerifier={
  async authenticate(){return {verified:true,trustedAuthorityId:"synthetic-authority-test",
    targetBindingId:"synthetic-target-identity"};}
};
test("A12.24 no operational receipts means UNVERIFIED",async()=>{
  const out=await assessLineageEvidence(null,mockVerifier);
  assert.equal(out.disposition,"UNVERIFIED");
  assert.equal(out.operationalExecutionAuthorized,false);
});
test("A12.24 synthetic complete externally mocked packet PASS is NOT migration authorization",async()=>{
  const out=await assessLineageEvidence(fixture(),mockVerifier);
  assert.deepEqual(out,{disposition:"PASS",issues:[],operationalExecutionAuthorized:false});
});
test("A12.24 cross-resource and app deployment binding mismatches BLOCK",async()=>{
  const f=fixture();
  for(const entry of [
    {...f,binding:{...f.binding,resource:{...resource,databaseId:"foreign-database"}}},
    {...f,catalog:{...f.catalog,resource:{...resource,deploymentId:"foreign-deployment"}}},
    {...f,ledger:{...f.ledger,resource:{...resource,sourceRevision:"wrong-revision"}}}
  ]){
    const out=await assessLineageEvidence(entry,mockVerifier);
    assert.equal(out.disposition,"BLOCKED");assert.ok(out.issues.some(x=>x.startsWith("CROSS_TARGET")));
  }
});
test("A12.24 fabricated witness, self-attested collector and reused artifacts BLOCK",async()=>{
  const f=fixture();
  for(const entry of [
    {...f,ledger:{...f.ledger,witnessId:f.ledger.collectorId}},
    {...f,catalog:{...f.catalog,witnessProofRef:""}},
    {...f,binding:{...f.binding,evidenceDigestSha256:f.anchor.evidenceDigestSha256}},
    {...f,catalog:{...f.catalog,artifactId:f.anchor.artifactId}}
  ]){
    const out=await assessLineageEvidence(entry,mockVerifier);
    assert.equal(out.disposition,"BLOCKED");
  }
});
test("A12.24 fake verifier, missing independent anchor and mismatched target UNVERIFIED or BLOCKED",async()=>{
  const f=fixture();
  const denies:IndependentEvidenceVerifier={
    async authenticate(){return {verified:false,trustedAuthorityId:"",targetBindingId:""};}
  };
  assert.equal((await assessLineageEvidence(f,denies)).disposition,"UNVERIFIED");
  const errors:IndependentEvidenceVerifier={async authenticate(){throw Error("offline unavailable");}};
  assert.equal((await assessLineageEvidence(f,errors)).disposition,"UNVERIFIED");
  const mixed:IndependentEvidenceVerifier={
    async authenticate(_artifact,kind){return {verified:true,
      trustedAuthorityId:"independent-reviewer-test",
      targetBindingId:kind==="ledger"?"second-target":"first-target"};}
  };
  assert.ok((await assessLineageEvidence(f,mixed)).issues.includes("VERIFIER_TARGET_BINDING_MISMATCH"));
  const self:IndependentEvidenceVerifier={
    async authenticate(){return {verified:true,trustedAuthorityId:f.anchor.collectorId,
      targetBindingId:"synthetic-target-identity"};}
  };
  assert.ok((await assessLineageEvidence(f,self)).issues.includes("UNQUALIFIED_SELF_ATTESTED_AUTHORITY"));
});
test("A12.24 historical legacy-UGP 0008 collision and integrated 0012-0015 cannot pass",async()=>{
  const f=fixture();
  for(const namespace of ["legacy-ugp","integrated-ugp"] as const){
    const r={...f.installed[7],namespace,receiptRef:"legacy-synthetic-"+namespace};
    const out=await assessLineageEvidence({...f,installed:[...f.installed,r],
      approvedNamespaceMappingRef:"untrusted-synthetic-mapping-ref"},mockVerifier);
    assert.equal(out.disposition,"BLOCKED");
    assert.ok(out.issues.some(x=>x.startsWith("FOREIGN_LINEAGE")));
    assert.ok(out.issues.includes("HISTORICAL_UGP_NAMESPACE_NOT_INDEPENDENTLY_RECONCILED"));
  }
});
test("A12.24 missing receipts, checksum tampering and duplicates BLOCK",async()=>{
  const f=fixture();
  const variants=[
    f.installed.slice(1),
    f.installed.map((r,i)=>i===7?{...r,sha256:"f".repeat(64)}:r),
    [...f.installed,f.installed[0]]
  ];
  for(const installed of variants){
    const out=await assessLineageEvidence({...f,installed},mockVerifier);
    assert.equal(out.disposition,"BLOCKED");
  }
});
test("A12.24 schema drift, privilege changes and recovery omissions BLOCK",async()=>{
  const f=fixture();
  const variants=[
    {...f,observedSchema:f.observedSchema.slice(0,1)},
    {...f,observedSchema:f.observedSchema.map(x=>x.kind==="rls"?
      {...x,definitionSha256:"f".repeat(64)}:x)},
    {...f,observedSchema:[...f.observedSchema,{...schema[0],identity:"unapproved.additional"}]},
    {...f,recovery:{...f.recovery,sourceSnapshotRef:""}},
    {...f,recovery:{...f.recovery,rollbackPlanRef:""}}
  ];
  for(const variant of variants){
    const out=await assessLineageEvidence(variant,mockVerifier);
    assert.equal(out.disposition,"BLOCKED");
  }
});
test("A12.24 source migration is not installed receipt proof",async()=>{
  const f=fixture(),incomplete={...f,installed:[]};
  const out=await assessLineageEvidence(incomplete,mockVerifier);
  assert.equal(out.disposition,"BLOCKED");
  assert.ok(out.issues.some(x=>x.startsWith("MISSING_INSTALLED_RECEIPT")));
});
