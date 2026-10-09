import assert from "node:assert/strict";
import test from "node:test";
import { CVI_GSC_ACQUISITION_LINEAGE_VERSION,type CviGscAcquisitionLineage } from "./cvi-gsc-acquisition-lineage.js";
import {
 reconcileCviGscLedgerReadback,CVI_GSC_LEDGER_READBACK_SQL,
 type CviGscLedgerRow,
} from "./cvi-gsc-ledger-receipt-readback.js";

const fp=(ch:string)=>ch.repeat(64);
const lineage:CviGscAcquisitionLineage={
 version:CVI_GSC_ACQUISITION_LINEAGE_VERSION,
 status:"UNTRUSTED_CAPTURE_REVIEW_ONLY",reasons:[],
 tenantId:"tenant-1",siteId:"site-1",connectionId:"conn-1",
 authSubject:"subject-1",authSessionId:"session-1",
 acquisitionId:"acq-1",requestNonce:"nonce-1",
 requestedResource:"sc-domain:example.com",
 observationFingerprint:fp("a"),attestationFingerprint:fp("b"),
 packetFingerprint:fp("c"),requestIdentityConsistent:true,
 independentProviderOriginVerified:false,independentOAuthCustodyVerified:false,
 durableReplayVerified:false,executionAuthorized:false,publicationAuthorized:false,
};
const row:CviGscLedgerRow={
 acquisitionId:lineage.acquisitionId,tenantId:lineage.tenantId,siteId:lineage.siteId,
 connectionId:lineage.connectionId,authSubject:lineage.authSubject,
 authSessionId:lineage.authSessionId,requestNonce:lineage.requestNonce,
 requestedResource:lineage.requestedResource,
 observationFingerprint:lineage.observationFingerprint,
 disposition:"recorded_untrusted",
};
const base={
 lineage,expectedAcquisitionId:lineage.acquisitionId,expectedTenantId:lineage.tenantId,
 expectedSiteId:lineage.siteId,expectedConnectionId:lineage.connectionId,
 expectedAuthSubject:lineage.authSubject,expectedSessionId:lineage.authSessionId,
 expectedNonce:lineage.requestNonce,expectedResource:lineage.requestedResource,
};
const read=(value:CviGscLedgerRow|null)=>({
 readByAcquisitionId:async(_id:string)=>value,
});
test("matching readback is untrusted review, never provider truth or publishing authority",async()=>{
 const result=await reconcileCviGscLedgerReadback({...base,store:read(row)});
 assert.equal(result.status,"LEDGER_MATCH_UNTRUSTED_REVIEW_ONLY");
 assert.equal(result.ledgerReadMatched,true);
 assert.equal(result.sourceAuthenticityVerified,false);
 assert.equal(result.tenantMembershipRechecked,false);
 assert.equal(result.signedReceiptVerified,false);
 assert.equal(result.providerCredentialsVerified,false);
 assert.equal(result.executionAuthorized,false);
 assert.equal(result.publicationAuthorized,false);
});
test("missing, altered or reused durable row is denied",async()=>{
 for(const candidate of [
  null,{...row,acquisitionId:"other"},{...row,requestNonce:"other"},
  {...row,tenantId:"other"},{...row,siteId:"other"},
  {...row,connectionId:"other"},{...row,observationFingerprint:fp("d")},
  {...row,disposition:"authorized"},
 ]) assert.equal((await reconcileCviGscLedgerReadback({
  ...base,store:read(candidate),
 })).status,"DENY");
});
test("wrong authenticated expected identity and unsafe lineage deny before DB lookup",async()=>{
 let calls=0;
 const store={readByAcquisitionId:async()=>{calls++;return row;}};
 const wrong=await reconcileCviGscLedgerReadback({...base,expectedNonce:"wrong",store});
 assert.equal(wrong.status,"DENY");
 assert.equal(calls,0);
 const escalated=await reconcileCviGscLedgerReadback({
  ...base,lineage:{...lineage,publicationAuthorized:true as false},store,
 });
 assert.equal(escalated.status,"DENY");
 assert.equal(calls,0);
});
test("DB errors are fail closed and do not leak driver messages",async()=>{
 const result=await reconcileCviGscLedgerReadback({...base,store:{
  readByAcquisitionId:async()=>{throw new Error("secrets in driver details");},
 }});
 assert.equal(result.status,"DENY");
 assert.deepEqual(result.reasons,["ledger_read_failed"]);
});
test("readback uses one parameterized immutable read, never write SQL",()=>{
 assert.match(CVI_GSC_LEDGER_READBACK_SQL,/WHERE acquisition_id=\$1 LIMIT 2/);
 assert.doesNotMatch(CVI_GSC_LEDGER_READBACK_SQL,/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
});
