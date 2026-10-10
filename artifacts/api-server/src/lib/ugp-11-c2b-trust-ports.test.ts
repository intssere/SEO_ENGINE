import assert from "node:assert/strict";
import test from "node:test";
import {createUnconfiguredP9TrustAdapters,preflightUnconfiguredIssuer}
 from "./ugp-11-c2b-trust-ports.js";
import type {ControlIssuerIntent} from "./ugp-11-c2-denied-control-issuer.js";
const intent:ControlIssuerIntent={tenantId:"tenant",siteId:"site",principalId:"principal",action:"kill",
 decisionId:"decision",nonce:"nonce",priorRevision:1,priorFingerprint:"a".repeat(64),
 policyVersion:"v1",effectiveAt:"2026-10-10T12:00:00.000Z",expiresAt:"2026-10-10T13:00:00.000Z"};
test("C2B all unconfigured trust ports explicitly refuse trust/signing",async()=>{
 const a=createUnconfiguredP9TrustAdapters();
 const [identity,grant,key,revocation]=await Promise.all([
 a.identity.verify({credentialReference:"forged",expectedIssuer:"claimed",expectedAudience:"claimed",
 tenantId:"tenant",siteId:"site",action:"kill"}),
 a.grants.resolve({principalId:"principal",tenantId:"tenant",siteId:"site",action:"kill",expectedPolicyVersion:"v1"}),
 a.signer.sign({canonicalDecisionFingerprint:"a".repeat(64),tenantId:"tenant",siteId:"site",purpose:"p9-control"}),
 a.revocations.check({issuerId:"issuer",keyId:"key",tenantId:"tenant",siteId:"site"})
 ]);
 for(const result of [identity,grant,revocation]){
 assert.equal(result.trusted,false);assert.equal(result.provenanceVerified,false);
 assert.equal(result.source,"unconfigured");
 }
 assert.equal(key.signed,false);assert.equal(key.keyId,null);assert.equal(key.signature,null);
});
test("C2B orchestration remains denial-only even for positive-looking intent",async()=>{
 const result=await preflightUnconfiguredIssuer(intent,createUnconfiguredP9TrustAdapters());
 assert.deepEqual(result,{issuanceAllowed:false,claimAllowed:false,dispatchAllowed:false,
 reason:"trust_services_unavailable"});
});
test("C2B cannot promote a hostile adapter's asserted identity result",async()=>{
 let called=0;
 const adapters=createUnconfiguredP9TrustAdapters();
 const hostile={...adapters,identity:{verify:async()=>{called++;return {
 trusted:false as const,reason:"independent_trust_not_configured" as const,
 source:"unconfigured" as const,provenanceVerified:false as const};}},
 grants:{resolve:async()=>{throw Error("must not query grants");}},
 signer:{sign:async()=>{throw Error("must not sign");}},
 revocations:{check:async()=>{throw Error("must not query keys");}}};
 const result=await preflightUnconfiguredIssuer({...intent,tenantId:"other-tenant"},hostile);
 assert.equal(called,1);
 assert.equal(result.issuanceAllowed,false);assert.equal(result.claimAllowed,false);
 assert.equal(result.dispatchAllowed,false);
});
