import test from "node:test";
import assert from "node:assert/strict";
import {G2_READER_DESIGN,evaluateMetadataReaderDesign,
 authorizeMetadataReaderProvisioning}
 from "./int-02c-g2-metadata-reader-design.mjs";
import {TARGET,metadataQueryFingerprint}
 from "./int-02c-05a-railway-metadata-query-contract.mjs";

const fixture=()=>({
 phase:"OFFLINE_DESIGN_ONLY",liveAccessRequested:false,
 createRoleRequested:false,providerActionRequested:false,
 target:{...TARGET},querySetFingerprint:metadataQueryFingerprint(),
 proposedRole:{
  kind:"DEDICATED_METADATA_ONLY",isDefaultRailwayAccount:false,
  existingPrincipalClaim:"NOT_ESTABLISHED",
  superuser:false,createdb:false,createrole:false,replication:false,
  bypassRls:false,databaseOwner:false,schemaOwner:false,tableOwner:false,
  canSetRole:false,customerTableSelect:false,customerTableWrite:false,
  canCreateSchemaObjects:false,canCreateTemporaryObjects:false,
  unreviewedFunctionExecution:false,publicOrInheritedGrantReviewRequired:true
 },
 session:{privateNetworkRequired:true,approvedExistingChannelRequired:true,
  publicProxyAllowed:false,readOnlyTransactionRequired:true,
  statementTimeoutSeconds:15,lockTimeoutSeconds:5,
  singleAttempt:true,allowedQueryFingerprint:metadataQueryFingerprint(),
  credentialDisclosureAllowed:false},
 custody:{collectorRef:"collector-synthetic",reviewerRef:"reviewer-synthetic",
  securityReviewRef:"review-synthetic",immutableEvidencePlanRef:"artifact-synthetic",
  independentWitnessRequired:true,secretsExcluded:true,
  separateExecutionAuthorizationRequired:true},
 history:{mainUgP0008To0015Status:"BLOCKED",
  migrationReceiptAccessAllowed:false,pitrCertified:false,
  recoverySeparateApprovalRequired:true},
 evidence:{roleCatalogWitnessRequired:true,effectivePrivilegeReviewRequired:true,
  membershipAndInheritanceReviewRequired:true,
  databaseSessionIdentityRequired:true,appBindingIndependentWitnessRequired:true,
  verifiedLiveEvidenceAvailable:false}
});
const checkBlocked=p=>{
 const x=evaluateMetadataReaderDesign(p);
 assert.equal(x.status,"BLOCKED",JSON.stringify(x));
 assert.equal(x.operationalProvisioningAuthorized,false);
 assert.equal(x.sqlExecutionAuthorized,false);
 assert.equal(x.privilegeCertification,false);
};
test("reuses pinned target and 05A query fingerprint",()=>{
 assert.deepEqual(G2_READER_DESIGN.target,TARGET);
 assert.equal(G2_READER_DESIGN.querySetFingerprint,metadataQueryFingerprint());
 assert.equal(G2_READER_DESIGN.operationalProvisioningAuthorized,false);
});
test("complete synthetic design PASS does not grant DB authority",()=>{
 assert.deepEqual(evaluateMetadataReaderDesign(fixture()),{
  status:"PASS",issues:[],privilegeCertification:false,
  operationalProvisioningAuthorized:false,sqlExecutionAuthorized:false,
  productionDatabaseCertified:false
 });
 assert.equal(authorizeMetadataReaderProvisioning().status,"BLOCKED");
 assert.equal(evaluateMetadataReaderDesign(null).status,"UNVERIFIED");
});
test("reject live SQL, provider changes, role creation and target substitution",()=>{
 const x=fixture();
 for(const patch of [
  {phase:"LIVE"},{liveAccessRequested:true},{createRoleRequested:true},
  {providerActionRequested:true},{querySetFingerprint:"a".repeat(64)},
  {target:{...x.target,serviceId:"wrong-service"}}
 ])checkBlocked({...x,...patch});
});
test("reject privileged, default, inherited and customer-data grants",()=>{
 const x=fixture();
 for(const patch of [
  {isDefaultRailwayAccount:true},{existingPrincipalClaim:"VERIFIED"},
  {superuser:true},{createdb:true},{createrole:true},{replication:true},
  {bypassRls:true},{databaseOwner:true},{schemaOwner:true},
  {tableOwner:true},{canSetRole:true},{customerTableSelect:true},
  {customerTableWrite:true},{canCreateSchemaObjects:true},
  {canCreateTemporaryObjects:true},{unreviewedFunctionExecution:true},
  {publicOrInheritedGrantReviewRequired:false}
 ])checkBlocked({...x,proposedRole:{...x.proposedRole,...patch}});
});
test("reject unsafe transport, unbounded timeout and unauthorized query access",()=>{
 const x=fixture();
 for(const patch of [
  {privateNetworkRequired:false},{approvedExistingChannelRequired:false},
  {publicProxyAllowed:true},{readOnlyTransactionRequired:false},
  {statementTimeoutSeconds:60},{lockTimeoutSeconds:30},
  {singleAttempt:false},{allowedQueryFingerprint:"bad"},
  {credentialDisclosureAllowed:true}
 ])checkBlocked({...x,session:{...x.session,...patch}});
});
test("reject same-party reviewer, missing custody and stale authority",()=>{
 const x=fixture();
 for(const patch of [
  {reviewerRef:x.custody.collectorRef},{securityReviewRef:""},
  {immutableEvidencePlanRef:""},{independentWitnessRequired:false},
  {secretsExcluded:false},{separateExecutionAuthorizationRequired:false},
  {collectorRef:"postgres://u:p@host/railway"},
  {reviewerRef:"abc"}
 ])checkBlocked({...x,custody:{...x.custody,...patch}});
});
test("reject fabricated existing proof, historical lineage resolution and recovery",()=>{
 const x=fixture();
 for(const patch of [
  {verifiedLiveEvidenceAvailable:true},
  {roleCatalogWitnessRequired:false},
  {effectivePrivilegeReviewRequired:false},
  {membershipAndInheritanceReviewRequired:false},
  {databaseSessionIdentityRequired:false},
  {appBindingIndependentWitnessRequired:false}
 ])checkBlocked({...x,evidence:{...x.evidence,...patch}});
 for(const patch of [
  {mainUgP0008To0015Status:"RESOLVED"},
  {migrationReceiptAccessAllowed:true},{pitrCertified:true},
  {recoverySeparateApprovalRequired:false}
 ])checkBlocked({...x,history:{...x.history,...patch}});
});
test("embedded connection strings and secret-like text rejected",()=>{
 checkBlocked({...fixture(),unexpected:"postgres://user:pw@host/railway"});
 checkBlocked({...fixture(),unexpected:"password=example"});
 checkBlocked({...fixture(),unexpected:"postgres.railway.internal"});
});
