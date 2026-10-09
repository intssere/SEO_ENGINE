import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
 CVI_GSC_ACQUISITION_LINEAGE_VERSION,
 type CviGscAcquisitionLineage,
} from "./cvi-gsc-acquisition-lineage.js";

export const CVI_GSC_LEDGER_READBACK_VERSION = "cvi-1c14-gsc-ledger-readback-v1" as const;
export type CviGscLedgerRow = Readonly<{
 acquisitionId:string;tenantId:string;siteId:string;
 connectionId:string;authSubject:string;authSessionId:string;
 requestNonce:string;requestedResource:string;
 observationFingerprint:string;disposition:string;
}>;
export interface CviReadOnlyAcquisitionLedger {
 readByAcquisitionId(acquisitionId:string):Promise<CviGscLedgerRow|null>;
}
export type CviGscLedgerReadback = Readonly<{
 version:typeof CVI_GSC_LEDGER_READBACK_VERSION;
 status:"DENY"|"LEDGER_MATCH_UNTRUSTED_REVIEW_ONLY";
 reasons:readonly string[];
 acquisitionId:string;
 ledgerReadMatched:boolean;
 sourceAuthenticityVerified:false;
 tenantMembershipRechecked:false;
 signedReceiptVerified:false;
 providerCredentialsVerified:false;
 executionAuthorized:false;
 publicationAuthorized:false;
 resultFingerprint:string;
}>;

export const CVI_GSC_LEDGER_READBACK_SQL = [
 "SELECT acquisition_id AS \"acquisitionId\", tenant_id::text AS \"tenantId\",",
 "site_id::text AS \"siteId\", connection_id::text AS \"connectionId\",",
 "auth_subject AS \"authSubject\", auth_session_id::text AS \"authSessionId\",",
 "request_nonce AS \"requestNonce\", requested_resource AS \"requestedResource\",",
 "observation_fingerprint AS \"observationFingerprint\", disposition",
 "FROM cvi_acquisition_nonce_ledger WHERE acquisition_id=$1 LIMIT 2",
].join(" ");

/** Read-only reconciliation of a claimed GSC response lineage with the
 * previously inserted durable nonce tombstone.
 * Store is an injected offline port, NOT a real trusted DB connection.
 * A matching row doesn't prove actual Google origin or current site rights.
 */
export async function reconcileCviGscLedgerReadback(input:Readonly<{
 lineage:CviGscAcquisitionLineage;
 expectedAcquisitionId:string;
 expectedTenantId:string;
 expectedSiteId:string;
 expectedConnectionId:string;
 expectedAuthSubject:string;
 expectedSessionId:string;
 expectedNonce:string;
 expectedResource:string;
 store:CviReadOnlyAcquisitionLedger;
}>):Promise<CviGscLedgerReadback> {
 const reasons:string[]=[];
 const l=input.lineage;
 const id=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
 const values=[input.expectedAcquisitionId,input.expectedTenantId,
   input.expectedSiteId,input.expectedConnectionId,input.expectedAuthSubject,
   input.expectedSessionId,input.expectedNonce,input.expectedResource];
 if(values.some(v=>typeof v!=="string" || !id.test(v)))
   reasons.push("expected_identity_invalid");
 if(!l || l.version!==CVI_GSC_ACQUISITION_LINEAGE_VERSION ||
   l.status!=="UNTRUSTED_CAPTURE_REVIEW_ONLY" ||
   !Array.isArray(l.reasons) || l.reasons.length!==0 ||
   l.requestIdentityConsistent!==true ||
   l.independentProviderOriginVerified!==false ||
   l.independentOAuthCustodyVerified!==false ||
   l.durableReplayVerified!==false ||
   l.executionAuthorized!==false || l.publicationAuthorized!==false)
   reasons.push("lineage_not_safe");
 if(l && (l.acquisitionId!==input.expectedAcquisitionId ||
   l.tenantId!==input.expectedTenantId ||
   l.siteId!==input.expectedSiteId ||
   l.connectionId!==input.expectedConnectionId ||
   l.authSubject!==input.expectedAuthSubject ||
   l.authSessionId!==input.expectedSessionId ||
   l.requestNonce!==input.expectedNonce ||
   l.requestedResource!==input.expectedResource))
   reasons.push("lineage_expected_identity_mismatch");
 let row:CviGscLedgerRow|null=null;
 if(reasons.length===0) {
   try {row=await input.store.readByAcquisitionId(input.expectedAcquisitionId);}
   catch {reasons.push("ledger_read_failed");}
 }
 if(reasons.length===0 && (!row ||
   row.acquisitionId!==input.expectedAcquisitionId ||
   row.tenantId!==input.expectedTenantId ||
   row.siteId!==input.expectedSiteId ||
   row.connectionId!==input.expectedConnectionId ||
   row.authSubject!==input.expectedAuthSubject ||
   row.authSessionId!==input.expectedSessionId ||
   row.requestNonce!==input.expectedNonce ||
   row.requestedResource!==input.expectedResource ||
   row.observationFingerprint!==l.observationFingerprint ||
   row.disposition!=="recorded_untrusted"))
   reasons.push("ledger_tombstone_mismatch_or_absent");
 const unique=[...new Set(reasons)].sort();
 const base={
  version:CVI_GSC_LEDGER_READBACK_VERSION,
  status:unique.length?"DENY" as const:"LEDGER_MATCH_UNTRUSTED_REVIEW_ONLY" as const,
  reasons:unique,acquisitionId:input.expectedAcquisitionId,
  ledgerReadMatched:unique.length===0,
  sourceAuthenticityVerified:false as const,
  tenantMembershipRechecked:false as const,
  signedReceiptVerified:false as const,
  providerCredentialsVerified:false as const,
  executionAuthorized:false as const,publicationAuthorized:false as const,
 };
 return {...base,resultFingerprint:stableEvidenceHash({
   purpose:CVI_GSC_LEDGER_READBACK_VERSION,...base,
 })};
}
