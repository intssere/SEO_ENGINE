import assert from "node:assert/strict";
import test from "node:test";
import {reviewP9AuthorityProvenance,type AuthorityCandidate} from "./ugp-11-1d7-authority-review.js";
const h="a".repeat(64);
const full:AuthorityCandidate={
 tenantId:"tenant-a",siteId:"site-a",source:"certified_p9",mode:"running",
 revision:2,fingerprint:h,principalId:"principal-a",decisionId:"decision-a",
 priorRevision:1,evidenceFingerprint:h,verifiedByIndependentAuthority:true
};
test("D7 refuses apparent certification even if caller asserts independent verification",()=>{
 assert.deepEqual(reviewP9AuthorityProvenance(full),{
 authorityVerified:false,claimAllowed:false,dispatchAllowed:false,
 reason:"independent_authority_unavailable"
 });
});
test("D7 rejects fixture source, unverified lineage and invalid scopes",()=>{
 assert.equal(reviewP9AuthorityProvenance({...full,source:"fixture_only"}).reason,"fixture_only");
 for(const value of [
  {...full,tenantId:"wrong scope"},
  {...full,revision:0},
  {...full,fingerprint:"bad"},
  {...full,mode:"unknown"},
  {...full,principalId:null},
  {...full,decisionId:null},
  {...full,priorRevision:2},
  {...full,evidenceFingerprint:null},
  {...full,source:"other"}
 ])assert.equal(reviewP9AuthorityProvenance(value as AuthorityCandidate).claimAllowed,false);
});
