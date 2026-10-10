/** UGP-11.C2-B — provider-neutral trust contracts with offline DENY-ONLY adapters.
 * Interfaces are future extension points, not operational authority.
 */
import type {ControlIssuerIntent} from "./ugp-11-c2-denied-control-issuer.js";
export type DeniedTrustResult=Readonly<{
 trusted:false;reason:"independent_trust_not_configured";
 source:"unconfigured";provenanceVerified:false;
}>;
export type DeniedSignatureResult=Readonly<{
 signed:false;reason:"managed_signer_not_configured";keyId:null;signature:null;
}>;
export type OperatorVerificationRequest=Readonly<{
 credentialReference:string;expectedIssuer:string;expectedAudience:string;
 tenantId:string;siteId:string;action:ControlIssuerIntent["action"];
}>;
export type ScopedGrantRequest=Readonly<{
 principalId:string;tenantId:string;siteId:string;
 action:ControlIssuerIntent["action"];expectedPolicyVersion:string;
}>;
export type SigningRequest=Readonly<{
 canonicalDecisionFingerprint:string;tenantId:string;siteId:string;purpose:"p9-control";
}>;
export type RevocationRequest=Readonly<{issuerId:string;keyId:string;tenantId:string;siteId:string}>;
export interface IndependentOperatorVerifier {
 verify(request:OperatorVerificationRequest):Promise<DeniedTrustResult>;
}
export interface ScopedGrantResolver {
 resolve(request:ScopedGrantRequest):Promise<DeniedTrustResult>;
}
export interface ManagedDecisionSigner {
 sign(request:SigningRequest):Promise<DeniedSignatureResult>;
}
export interface IndependentRevocationRegistry {
 check(request:RevocationRequest):Promise<DeniedTrustResult>;
}
const unconfigured=():DeniedTrustResult=>Object.freeze({
 trusted:false,reason:"independent_trust_not_configured",source:"unconfigured",provenanceVerified:false
});
const unsigned=():DeniedSignatureResult=>Object.freeze({
 signed:false,reason:"managed_signer_not_configured",keyId:null,signature:null
});
export function createUnconfiguredP9TrustAdapters():Readonly<{
 identity:IndependentOperatorVerifier;
 grants:ScopedGrantResolver;
 signer:ManagedDecisionSigner;
 revocations:IndependentRevocationRegistry;
}> {
 return Object.freeze({
  identity:Object.freeze({verify:async (_request:OperatorVerificationRequest)=>unconfigured()}),
  grants:Object.freeze({resolve:async (_request:ScopedGrantRequest)=>unconfigured()}),
  signer:Object.freeze({sign:async (_request:SigningRequest)=>unsigned()}),
  revocations:Object.freeze({check:async (_request:RevocationRequest)=>unconfigured()})
 });
}
export type ControlIssuerAdmission=Readonly<{
 issuanceAllowed:false;claimAllowed:false;dispatchAllowed:false;
 reason:"trust_services_unavailable";
}>;
/** Do not invoke signing or read grants when identity is not independently trusted. */
export async function preflightUnconfiguredIssuer(
 intent:ControlIssuerIntent,adapters:ReturnType<typeof createUnconfiguredP9TrustAdapters>
):Promise<ControlIssuerAdmission>{
 await adapters.identity.verify({
  credentialReference:"unconfigured",expectedIssuer:"unconfigured",
  expectedAudience:"unconfigured",tenantId:intent.tenantId,siteId:intent.siteId,action:intent.action
 });
 return Object.freeze({issuanceAllowed:false,claimAllowed:false,dispatchAllowed:false,
  reason:"trust_services_unavailable"});
}
