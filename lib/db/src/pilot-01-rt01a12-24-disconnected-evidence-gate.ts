/**
 * PILOT-01 RT01-A12.24 — DISCONNECTED EVIDENCE READINESS ONLY.
 * No network, SQL, credential or provider adapter. A verifier port is an
 * external trust requirement, NOT a source for real-world authority here.
 * Synthetic PASS refers only to complete, mock-verified evidence packages,
 * never to production or to live operational migration permission.
 */
import type {Gate,LedgerReceipt} from "./pilot-01-rt01a12-23-migration-lineage-gate.js";
import {reconcileEvidence} from "./pilot-01-rt01a12-23-migration-lineage-gate.js";

export type EvidenceDisposition="PASS"|"BLOCKED"|"UNVERIFIED";
export type ResourceIdentity=Readonly<{
  provider:string;projectId:string;environmentId:string;serviceId:string;
  databaseId:string;deploymentId:string;sourceRevision:string;
}>;
export type WitnessedArtifact=Readonly<{
  artifactId:string;resource:ResourceIdentity;collectedAtUtc:string;
  evidenceDigestSha256:string;collectorId:string;witnessId:string;
  witnessProofRef:string;approvalRef:string;
}>;
export type InstalledMigration=Readonly<{
  name:string;namespace:"canonical-main"|"legacy-ugp"|"integrated-ugp";
  sha256:string;appliedAtUtc:string;receiptRef:string;
}>;
export type SchemaEntry=Readonly<{kind:"table"|"column"|"constraint"|"index"|
  "trigger"|"function"|"extension"|"role"|"grant"|"rls";
  identity:string;definitionSha256:string}>;
export type RecoveryEvidence=Readonly<{
  sourceSnapshotRef:string;backupLineageRef:string;restoreExerciseRef:string;
  rollbackPlanRef:string;recoveryReviewRef:string;
}>;
export type EvidencePackage=Readonly<{
  anchor:WitnessedArtifact;
  binding:WitnessedArtifact;
  ledger:WitnessedArtifact;
  catalog:WitnessedArtifact;
  expectedSource:Readonly<{canonical:Gate;schema:readonly SchemaEntry[]}>;
  installed:readonly InstalledMigration[];
  observedSchema:readonly SchemaEntry[];
  recovery:RecoveryEvidence;
  /** Any 0008–0015 UGP history must have separate independently approved mapping. */
  approvedNamespaceMappingRef:string|null;
}>;
export interface IndependentEvidenceVerifier{
  /** Each invocation MUST verify authenticity, immutable digest, scope and
   * provenance against a separately trusted channel and real anchor.
   * A caller-set 'verified' flag or matching checksum is NOT sufficient.
   */
  authenticate(artifact:WitnessedArtifact,kind:"anchor"|"binding"|"ledger"|"catalog"):
    Promise<Readonly<{verified:boolean;trustedAuthorityId:string;targetBindingId:string}>>;
}
export type EvidenceDecision=Readonly<{
  disposition:EvidenceDisposition;issues:readonly string[];
  /** Never an authorization to query or mutate an operational database. */
  operationalExecutionAuthorized:false;
}>;
const sha=(x:unknown):x is string=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const id=(x:unknown):x is string=>typeof x==="string"&&
  x.length>=3&&x.length<=256&&x.trim()===x&&!/[\s\u0000-\u001f]/.test(x);
const utc=(x:unknown):x is string=>typeof x==="string"&&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x)&&
  Number.isFinite(Date.parse(x));
const sameResource=(a:ResourceIdentity,b:ResourceIdentity)=>
  a.provider===b.provider&&a.projectId===b.projectId&&
  a.environmentId===b.environmentId&&a.serviceId===b.serviceId&&
  a.databaseId===b.databaseId&&a.deploymentId===b.deploymentId&&
  a.sourceRevision===b.sourceRevision;
const validArtifact=(a:WitnessedArtifact):boolean=>
  !!a&&!!a.resource&&[a.artifactId,a.collectorId,a.witnessId,a.witnessProofRef,
    a.approvalRef,...Object.values(a.resource)].every(id)&&
  a.collectorId!==a.witnessId&&sha(a.evidenceDigestSha256)&&utc(a.collectedAtUtc);
function schemaIssues(expected:readonly SchemaEntry[],observed:readonly SchemaEntry[]):string[]{
  const problems:string[]=[],keys=new Set<string>();
  const indexed=new Map<string,string>();
  for(const entry of observed){
    const key=entry.kind+":"+entry.identity;
    if(keys.has(key))problems.push("DUPLICATE_SCHEMA_ENTRY:"+key);
    keys.add(key);
    if(!id(entry.identity)||!sha(entry.definitionSha256))problems.push("INVALID_SCHEMA_ENTRY:"+key);
    indexed.set(key,entry.definitionSha256);
  }
  const expectedKeys=new Set<string>();
  for(const entry of expected){
    const key=entry.kind+":"+entry.identity;
    if(expectedKeys.has(key))problems.push("DUPLICATE_EXPECTED_SCHEMA:"+key);
    expectedKeys.add(key);
    if(indexed.get(key)!==entry.definitionSha256)
      problems.push("MISSING_OR_DRIFTED_SCHEMA:"+key);
  }
  for(const key of indexed.keys())if(!expectedKeys.has(key))
    problems.push("UNEXPECTED_SCHEMA_ENTRY:"+key);
  return problems;
}
/**
 * This pure orchestrator has no way to establish an independent real witness:
 * it merely rejects evidence when the injected independent verifier cannot
 * authenticate each scope-bound artifact. Test mocks are never production proof.
 */
export async function assessLineageEvidence(
  evidence:EvidencePackage|null,verifier:IndependentEvidenceVerifier,
):Promise<EvidenceDecision>{
  const issues:string[]=[];
  if(!evidence)return {disposition:"UNVERIFIED",issues:["MISSING_EVIDENCE_PACKAGE"],
    operationalExecutionAuthorized:false};
  const artifacts=[
    ["anchor",evidence.anchor],["binding",evidence.binding],
    ["ledger",evidence.ledger],["catalog",evidence.catalog]
  ] as const;
  for(const [kind,artifact] of artifacts){
    if(!validArtifact(artifact))issues.push("INVALID_OR_UNWITNESSED_"+kind.toUpperCase());
  }
  if(issues.length)return {disposition:"BLOCKED",issues,operationalExecutionAuthorized:false};
  const target=evidence.anchor.resource;
  for(const [kind,artifact] of artifacts){
    if(!sameResource(target,artifact.resource))
      issues.push("CROSS_TARGET_EVIDENCE:"+kind);
  }
  if(new Set(artifacts.map(([,a])=>a.artifactId)).size!==artifacts.length)
    issues.push("REUSED_ARTIFACT_ID");
  if(new Set(artifacts.map(([,a])=>a.evidenceDigestSha256)).size!==artifacts.length)
    issues.push("REUSED_EVIDENCE_DIGEST");
  if(evidence.expectedSource.canonical.status!=="pass"||
    evidence.expectedSource.canonical.issues.length)
    issues.push("UNSAFE_SOURCE_MIGRATION_GATE");
  if(issues.length)return {disposition:"BLOCKED",issues,operationalExecutionAuthorized:false};

  const trust:{kind:string;verified:boolean;trustedAuthorityId:string;targetBindingId:string}[]=[];
  for(const [kind,artifact] of artifacts){
    try{
      const result=await verifier.authenticate(artifact,kind);
      if(!result?.verified||!id(result.trustedAuthorityId)||!id(result.targetBindingId))
        issues.push("UNATTESTED_"+kind.toUpperCase());
      else trust.push({kind,...result});
    }catch{issues.push("ATTESTATION_UNAVAILABLE_"+kind.toUpperCase());}
  }
  if(issues.length)return {disposition:"UNVERIFIED",issues,operationalExecutionAuthorized:false};
  const anchor=trust.find(x=>x.kind==="anchor")!;
  if(trust.some(x=>x.targetBindingId!==anchor.targetBindingId))
    issues.push("VERIFIER_TARGET_BINDING_MISMATCH");
  if(trust.some(x=>x.trustedAuthorityId===evidence.anchor.collectorId||
    x.trustedAuthorityId===evidence.anchor.witnessId))
    issues.push("UNQUALIFIED_SELF_ATTESTED_AUTHORITY");
  const receiptRefs=new Set<string>();
  for(const r of evidence.installed){
    if(!id(r.name)||!sha(r.sha256)||!utc(r.appliedAtUtc)||!id(r.receiptRef))
      issues.push("INVALID_INSTALLED_RECEIPT");
    if(receiptRefs.has(r.receiptRef))issues.push("DUPLICATE_INSTALLED_RECEIPT_REF");
    receiptRefs.add(r.receiptRef);
  }
  const received:LedgerReceipt[]=evidence.installed.map(r=>({
    name:r.name,namespace:r.namespace,sha256:r.sha256,witness:evidence.ledger.witnessId
  }));
  const historical=reconcileEvidence(evidence.expectedSource.canonical,received);
  if(historical.status==="blocked")issues.push(...historical.issues);
  // Even with a mapping reference, foreign UGP entries require a separate
  // reviewed mapping checker; A12.23 appropriately rejects them by default.
  if(evidence.installed.some(r=>r.namespace!=="canonical-main"))
    issues.push("HISTORICAL_UGP_NAMESPACE_NOT_INDEPENDENTLY_RECONCILED");
  if(evidence.approvedNamespaceMappingRef!==null&&
    !id(evidence.approvedNamespaceMappingRef))
    issues.push("INVALID_NAMESPACE_MAPPING_REFERENCE");
  issues.push(...schemaIssues(evidence.expectedSource.schema,evidence.observedSchema));
  const rec=evidence.recovery;
  if(!rec||![rec.sourceSnapshotRef,rec.backupLineageRef,rec.restoreExerciseRef,
    rec.rollbackPlanRef,rec.recoveryReviewRef].every(id))
    issues.push("RECOVERY_PROVENANCE_OR_ROLLBACK_UNVERIFIED");
  return {disposition:issues.length?"BLOCKED":"PASS",issues,
    operationalExecutionAuthorized:false};
}
