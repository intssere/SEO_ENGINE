/** INT-02C-G2: source-only restricted metadata-reader provisioning design.
 * Imports previously pinned target and 05A query contract. No SQL/DDL,
 * database driver, provider call, credential handling or runtime adapter.
 * PASS denotes completeness of an OFFLINE proposal, not actual privilege proof.
 */
import {TARGET, metadataQueryFingerprint,validateMetadataQuerySet}
 from "./int-02c-05a-railway-metadata-query-contract.mjs";

export const G2_READER_DESIGN=Object.freeze({
 target:TARGET,
 querySetFingerprint:metadataQueryFingerprint(),
 principalKind:"DEDICATED_METADATA_ONLY",
 prohibitedPrivileges:Object.freeze([
  "SUPERUSER","CREATEDB","CREATEROLE","REPLICATION","BYPASSRLS",
  "DATABASE_OWNER","SCHEMA_OWNER","TABLE_OWNER","SET_ROLE",
  "CUSTOMER_TABLE_SELECT","CUSTOMER_TABLE_WRITE","SCHEMA_CREATE",
  "DATABASE_CREATE","TEMPORARY_OBJECTS","EXECUTE_UNREVIEWED_FUNCTIONS"
 ]),
 sessionConstraints:Object.freeze({
  readOnlyTransaction:true,privateTransport:true,
  statementTimeoutSeconds:15,lockTimeoutSeconds:5,
  oneAttempt:true,parameterizedQueriesOnly:true
 }),
 operationalProvisioningAuthorized:false
});
const opaque=s=>typeof s==="string"&&s.length>=8&&s.length<=160&&
 s.trim()===s&&/^[A-Za-z0-9._:-]+$/.test(s);
const no=(status,issues)=>Object.freeze({status,issues,
 privilegeCertification:false,operationalProvisioningAuthorized:false,
 sqlExecutionAuthorized:false,productionDatabaseCertified:false});
/** Assert a synthetic provisioning REVIEW packet has all required clauses.
 * Do not infer a real role exists or a network session is reachable.
 */
export function evaluateMetadataReaderDesign(packet){
 if(packet==null)return no("UNVERIFIED",["MISSING_DESIGN_PACKET"]);
 if(typeof packet!=="object"||Array.isArray(packet))return no("BLOCKED",["MALFORMED_DESIGN_PACKET"]);
 const issues=[];
 if(packet.phase!=="OFFLINE_DESIGN_ONLY"||
   packet.liveAccessRequested!==false||
   packet.createRoleRequested!==false||
   packet.providerActionRequested!==false)
  issues.push("OPERATIONAL_ACTION_NOT_AUTHORIZED");
 const t=packet.target;
 if(!t||Object.keys(TARGET).some(k=>t[k]!==TARGET[k]))
  issues.push("TARGET_IDENTITY_MISMATCH");
 if(packet.querySetFingerprint!==metadataQueryFingerprint()||
    !validateMetadataQuerySet().valid)
  issues.push("UNAPPROVED_METADATA_QUERY_SET");
 const role=packet.proposedRole;
 if(!role||role.kind!=="DEDICATED_METADATA_ONLY"||
  role.isDefaultRailwayAccount!==false||
  role.existingPrincipalClaim!=="NOT_ESTABLISHED"||
  role.superuser!==false||role.createdb!==false||
  role.createrole!==false||role.replication!==false||
  role.bypassRls!==false||role.databaseOwner!==false||
  role.schemaOwner!==false||role.tableOwner!==false||
  role.canSetRole!==false||role.customerTableSelect!==false||
  role.customerTableWrite!==false||role.canCreateSchemaObjects!==false||
  role.canCreateTemporaryObjects!==false||
  role.unreviewedFunctionExecution!==false||
  role.publicOrInheritedGrantReviewRequired!==true)
  issues.push("PRIVILEGE_BOUNDARY_UNSAFE_OR_INCOMPLETE");
 if(!packet.session||packet.session.privateNetworkRequired!==true||
  packet.session.approvedExistingChannelRequired!==true||
  packet.session.publicProxyAllowed!==false||
  packet.session.readOnlyTransactionRequired!==true||
  packet.session.statementTimeoutSeconds!==15||
  packet.session.lockTimeoutSeconds!==5||
  packet.session.singleAttempt!==true||
  packet.session.allowedQueryFingerprint!==metadataQueryFingerprint()||
  packet.session.credentialDisclosureAllowed!==false)
  issues.push("SESSION_OR_NETWORK_CONTROLS_INCOMPLETE");
 if(!packet.custody||!opaque(packet.custody.collectorRef)||
  !opaque(packet.custody.reviewerRef)||
  packet.custody.collectorRef===packet.custody.reviewerRef||
  !opaque(packet.custody.securityReviewRef)||
  !opaque(packet.custody.immutableEvidencePlanRef)||
  packet.custody.independentWitnessRequired!==true||
  packet.custody.secretsExcluded!==true||
  packet.custody.separateExecutionAuthorizationRequired!==true)
  issues.push("INDEPENDENT_WITNESS_OR_SECRET_CUSTODY_INCOMPLETE");
 if(packet.history?.mainUgP0008To0015Status!=="BLOCKED"||
  packet.history?.migrationReceiptAccessAllowed!==false||
  packet.history?.pitrCertified!==false||
  packet.history?.recoverySeparateApprovalRequired!==true)
  issues.push("HISTORICAL_MIGRATION_OR_RECOVERY_BOUNDARY_BREACH");
 if(packet.evidence?.roleCatalogWitnessRequired!==true||
  packet.evidence?.effectivePrivilegeReviewRequired!==true||
  packet.evidence?.membershipAndInheritanceReviewRequired!==true||
  packet.evidence?.databaseSessionIdentityRequired!==true||
  packet.evidence?.appBindingIndependentWitnessRequired!==true||
  packet.evidence?.verifiedLiveEvidenceAvailable!==false)
  issues.push("FALSE_OR_INCOMPLETE_PRIVILEGE_EVIDENCE");
 // Only small, opaque references in a design; reject embedded values and URLs.
 let serialized;
 try{serialized=JSON.stringify(packet)}catch{return no("BLOCKED",["UNSERIALIZABLE_DESIGN_PACKET"]);}
 if(!serialized||serialized.length>14000||
   /(?:postgres(?:ql)?:\/\/|railway\.internal|(?:password|token|private_key|secret)\s*[:=])/i.test(serialized))
  issues.push("SECRET_OR_CONNECTION_STRING_EXPOSURE");
 return no(issues.length?"BLOCKED":"PASS",issues);
}
/** No source-only design can grant live authority. */
export function authorizeMetadataReaderProvisioning(){
 return no("BLOCKED",["FRESH_OWNER_SECURITY_DBA_EXECUTION_APPROVAL_REQUIRED"]);
}
