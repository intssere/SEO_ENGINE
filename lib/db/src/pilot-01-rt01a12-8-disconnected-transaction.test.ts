/** A12.8 offline only: synthetic serialized transaction and revocation scheduler. */
import test from "node:test";
import assert from "node:assert/strict";
import {DisconnectedTransactionContract,evidenceMatches,
  type AuthoritativeEvidence,type TransactionRequest,type TxResult,
  type TransactionCustodyPort} from "./pilot-01-rt01a12-8-disconnected-transaction.js";
const now=1_800_000_000_000;
const scope={organizationId:"org-a",siteId:"site-a",actorSubject:"subject-a",
  sessionId:"session-a",issuerId:"issuer-a",operation:"analyze" as const};
const request:TransactionRequest={scope,intent:{grantId:"grant-a",idempotencyKey:"idem-a",
  requestSha256:"a".repeat(64)},fence:{membershipRevision:4,issuerRevision:8}};
const good:AuthoritativeEvidence={scope,sessionActive:true,sessionRevoked:false,
  sessionExpiresAt:now+10000,siteActive:true,membershipActive:true,
  membershipRevoked:false,membershipExpiresAt:now+10000,membershipRevision:4,
  membershipRole:"operator",issuerActive:true,issuerRevoked:false,
  issuerExpiresAt:now+10000,issuerRevision:8,issuerProvenanceSha256:"b".repeat(64)};
function receipt(r:TransactionRequest){
  return {...r.scope,...r.intent,issuerProvenanceSha256:"b".repeat(64),
    jobId:"job-a",admissionId:"admission-a",transactionId:"tx-a",
    committedAt:"2026-11-06T00:00:00.000Z"};
}
/** A deliberately synchronous synthetic commit boundary, not a database adapter. */
class MockStore implements TransactionCustodyPort {
  evidence:AuthoritativeEvidence={...good};commits=0;reconciles=0;
  async admitWithCustody(r:TransactionRequest):Promise<TxResult>{
    // No awaits between independent evidence check and synthetic commit.
    if(!evidenceMatches(r,this.evidence,now))return {status:"denied"};
    this.commits++;
    return {status:"committed",receipt:receipt(r),
      membershipRevision:this.evidence.membershipRevision,
      issuerRevision:this.evidence.issuerRevision};
  }
  async reconcileReadOnly(_r:TransactionRequest):Promise<TxResult>{
    this.reconciles++;return {status:"unavailable"};
  }
  revokeMember(){this.evidence={...this.evidence,membershipRevoked:true,membershipRevision:5};}
  revokeIssuer(){this.evidence={...this.evidence,issuerRevoked:true,issuerRevision:9};}
}
test("matching trusted evidence permits mock commit and exact revision receipt",async()=>{
  const s=new MockStore(),c=new DisconnectedTransactionContract(s);
  assert.equal((await c.admit(request)).status,"committed");assert.equal(s.commits,1);
});
test("cross-tenant, site, actor, session, issuer and operation mismatch deny",()=>{
  for(const key of ["organizationId","siteId","actorSubject","sessionId","issuerId","operation"] as const){
    const changed={...good,scope:{...scope,[key]:"other"}};
    assert.equal(evidenceMatches(request,changed,now),false,key);
  }
});
test("revoked expired inactive and insufficient-role evidence denies",()=>{
  for(const patch of [
    {sessionRevoked:true},{sessionActive:false},{sessionExpiresAt:now},
    {siteActive:false},{membershipRevoked:true},{membershipActive:false},
    {membershipExpiresAt:now},{membershipRole:"viewer" as const},
    {issuerRevoked:true},{issuerActive:false},{issuerExpiresAt:now},
    {issuerProvenanceSha256:"invalid"}]){
    assert.equal(evidenceMatches(request,{...good,...patch},now),false);
  }
});
test("stale membership and issuer versions fail closed",async()=>{
  const s=new MockStore();s.evidence={...good,membershipRevision:5};
  assert.equal((await new DisconnectedTransactionContract(s).admit(request)).status,"denied");
  s.evidence={...good,issuerRevision:9};
  assert.equal((await new DisconnectedTransactionContract(s).admit(request)).status,"denied");
  assert.equal(s.commits,0);
});
test("revocation scheduled before admission denies; admission before revocation is ordered",async()=>{
  const before=new MockStore();before.revokeMember();
  assert.equal((await new DisconnectedTransactionContract(before).admit(request)).status,"denied");
  assert.equal(before.commits,0);
  const after=new MockStore();
  assert.equal((await new DisconnectedTransactionContract(after).admit(request)).status,"committed");
  after.revokeIssuer();
  assert.equal((await new DisconnectedTransactionContract(after).admit(request)).status,"denied");
  assert.equal(after.commits,1);
});
test("mock interleaving revocation during an async precheck denies at final boundary",async()=>{
  const s=new MockStore();
  assert.equal(evidenceMatches(request,s.evidence,now),true);
  await Promise.resolve();
  s.revokeIssuer();
  assert.equal((await new DisconnectedTransactionContract(s).admit(request)).status,"denied");
  assert.equal(s.commits,0);
});
test("invalid intent and revision fence rejected before port call",async()=>{
  const s=new MockStore(),c=new DisconnectedTransactionContract(s);
  for(const bad of [{...request,fence:{...request.fence,membershipRevision:0}},
    {...request,scope:{...scope,operation:"site_write"}},
    {...request,intent:{...request.intent,requestSha256:"bad"}},
    {...request,scope:{...scope,siteId:" org "}},null]){
    assert.equal((await c.admit(bad)).status,"denied");
  }
  assert.equal(s.commits,0);
});
test("port transport ambiguity is commit_unknown, reconciliation never writes",async()=>{
  let writes=0,reconciles=0;
  const p:TransactionCustodyPort={
    admitWithCustody:async()=>{writes++;throw Error("ambiguous commit");},
    reconcileReadOnly:async()=>{reconciles++;return {status:"unavailable"};}
  };
  const c=new DisconnectedTransactionContract(p);
  assert.equal((await c.admit(request)).status,"commit_unknown");
  assert.equal((await c.reconcile(request)).status,"unavailable");
  assert.equal(writes,1);assert.equal(reconciles,1);
});
test("fabricated receipt scope and mismatched revisions cannot report committed",async()=>{
  const p:TransactionCustodyPort={
    admitWithCustody:async r=>({status:"committed",
      receipt:{...receipt(r),organizationId:"org-b"},
      membershipRevision:4,issuerRevision:8}),
    reconcileReadOnly:async()=>({status:"unavailable"})
  };
  assert.equal((await new DisconnectedTransactionContract(p).admit(request)).status,"unavailable");
});
