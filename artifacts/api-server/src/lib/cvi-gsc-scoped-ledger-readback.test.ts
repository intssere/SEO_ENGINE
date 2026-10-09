import assert from "node:assert/strict";
import test from "node:test";
import {CVI_GSC_ACQUISITION_LINEAGE_VERSION,type CviGscAcquisitionLineage} from "./cvi-gsc-acquisition-lineage.js";
import {CVI_GSC_SCOPED_READBACK_SQL,reconcileCviGscScopedReadback} from "./cvi-gsc-scoped-ledger-readback.js";
const fp=(v:string)=>v.repeat(64);
const scope={acquisitionId:"acq-1",tenantId:"tenant-1",siteId:"site-1",connectionId:"conn-1",authSubject:"subject-1",authSessionId:"session-1"};
const lineage:CviGscAcquisitionLineage={
 version:CVI_GSC_ACQUISITION_LINEAGE_VERSION,status:"UNTRUSTED_CAPTURE_REVIEW_ONLY",
 reasons:[],...scope,requestNonce:"nonce-1",requestedResource:"sc-domain:example.com",
 observationFingerprint:fp("a"),attestationFingerprint:fp("b"),packetFingerprint:fp("c"),
 requestIdentityConsistent:true,independentProviderOriginVerified:false,
 independentOAuthCustodyVerified:false,durableReplayVerified:false,
 executionAuthorized:false,publicationAuthorized:false,
};
const row={...scope,requestNonce:lineage.requestNonce,requestedResource:lineage.requestedResource,
 observationFingerprint:lineage.observationFingerprint,disposition:"recorded_untrusted"};
test("matching scoped historical read remains untrusted and non-authorizing",async()=>{
 const r=await reconcileCviGscScopedReadback({lineage,authenticated:scope,store:{fetchScoped:async()=>row}});
 assert.equal(r.status,"SCOPED_HISTORICAL_REVIEW_ONLY");
 assert.equal(r.currentAuthorizationForLaterOperations,false);
 assert.equal(r.providerOriginAuthenticated,false);
 assert.equal(r.sourceFactsVerified,false);
 assert.equal(r.executionAuthorized,false);
 assert.equal(r.publicationAuthorized,false);
});
test("mismatched authenticated tenant/session rejects before reaching store",async()=>{
 let reads=0;const store={fetchScoped:async()=>{reads++;return row;}};
 for(const different of [{tenantId:"tenant-2"},{authSessionId:"session-2"},{siteId:"site-2"}]){
  assert.equal((await reconcileCviGscScopedReadback({lineage,authenticated:{...scope,...different},store})).status,"DENY");
 }
 assert.equal(reads,0);
});
test("record absent or mismatched after DB check fails closed",async()=>{
 for(const result of [null,{...row,tenantId:"different"},{...row,requestNonce:"wrong"},{...row,disposition:"authorized"}]){
  assert.equal((await reconcileCviGscScopedReadback({lineage,authenticated:scope,store:{fetchScoped:async()=>result}})).status,"DENY");
 }
});
test("unsafe lineage and DB errors deny without secret leakage",async()=>{
 const r=await reconcileCviGscScopedReadback({lineage:{...lineage,publicationAuthorized:true as false},
 authenticated:scope,store:{fetchScoped:async()=>row}});
 assert.equal(r.status,"DENY");
 const e=await reconcileCviGscScopedReadback({lineage,authenticated:scope,store:{
  fetchScoped:async()=>{throw Error("sensitive DB credentials");},
 }});
 assert.deepEqual(e.reasons,["scoped_readback_failed"]);
});
test("SQL binds all tenant identity and current grants in same locked read",()=>{
 for(const clause of [
  "a.tenant_id=$2::uuid","a.site_id=$3::uuid","a.connection_id=$4::uuid",
  "a.auth_subject=$5","a.auth_session_id=$6::uuid","g.permission='read_evidence'",
  "se.revoked_at IS NULL","m.revoked_at IS NULL","g.revoked_at IS NULL",
  "FOR SHARE OF s,c,se,m,g LIMIT 2",
 ]) assert.ok(CVI_GSC_SCOPED_READBACK_SQL.includes(clause),clause);
 assert.doesNotMatch(CVI_GSC_SCOPED_READBACK_SQL,/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
});
