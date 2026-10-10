/** UGP-11.C2-C offline integration readiness matrix; never a trusted service. */
export type TrustProbe = Readonly<{
 id:string;
 domain:"identity"|"grant"|"signer"|"revocation"|"issuance"|"runtime";
 scenario:"valid_assertion"|"forged"|"stale"|"revoked"|"cross_scope"|"replay"|"outage"|"unknown";
}>;
export type TrustProbeResult=Readonly<{
 probeId:string; admitted:false; issuanceAllowed:false; claimAllowed:false;
 dispatchAllowed:false; reason:"independent_trust_unavailable";
}>;
export const C2C_PROBES:readonly TrustProbe[]=Object.freeze([
 {id:"id-asserted",domain:"identity",scenario:"valid_assertion"},
 {id:"id-forged",domain:"identity",scenario:"forged"},
 {id:"id-stale",domain:"identity",scenario:"stale"},
 {id:"grant-cross-scope",domain:"grant",scenario:"cross_scope"},
 {id:"grant-revoked",domain:"grant",scenario:"revoked"},
 {id:"signer-forged",domain:"signer",scenario:"forged"},
 {id:"signer-revoked",domain:"signer",scenario:"revoked"},
 {id:"signer-outage",domain:"signer",scenario:"outage"},
 {id:"revocation-unknown",domain:"revocation",scenario:"unknown"},
 {id:"issuance-replay",domain:"issuance",scenario:"replay"},
 {id:"issuance-outage",domain:"issuance",scenario:"outage"},
 {id:"runtime-valid-looking",domain:"runtime",scenario:"valid_assertion"}
].map(x=>Object.freeze(x as TrustProbe)));
export function reviewUnconfiguredTrustProbe(probe:TrustProbe):TrustProbeResult {
 if(!C2C_PROBES.some(x=>x.id===probe?.id&&x.domain===probe.domain&&x.scenario===probe.scenario))
   throw Error("unknown_trust_probe");
 return Object.freeze({probeId:probe.id,admitted:false,issuanceAllowed:false,
 claimAllowed:false,dispatchAllowed:false,reason:"independent_trust_unavailable"});
}
