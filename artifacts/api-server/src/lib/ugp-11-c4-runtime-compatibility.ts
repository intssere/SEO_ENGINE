/** UGP-11.C4: pure evaluation of independently recorded runtime facts.
 * NO database connections, package installation, workers, dispatch or admission.
 * This is a compatibility screen, not security/transport certification.
 */
export type C4RuntimeFacts=Readonly<{nodeVersion:string;postgresVersion:string;
 nodeEvidence:"executed_runtime";postgresEvidence:"sql_server_version";
 environment:"disposable_nonproduction";imageDigest:string}>;
export type C4CompatibilityReview=Readonly<{
 compatibleMinimums:boolean;transportCertified:false;claimAllowed:false;dispatchAllowed:false;
 reasons:readonly string[];
}>;
const NODE=/^v?(\d+)\.(\d+)\.(\d+)$/;
const PG=/^(\d+)\.(\d+)(?:\.\d+)?$/;
const DIGEST=/^sha256:[a-f0-9]{64}$/;
export function reviewC4RuntimeMinimums(facts:C4RuntimeFacts):C4CompatibilityReview {
 const reasons:string[]=[];
 const n=NODE.exec(facts?.nodeVersion??"");
 const p=PG.exec(facts?.postgresVersion??"");
 if(!n) reasons.push("node_version_unverified");
 else if(Number(n[1])<22 || (Number(n[1])===22 && Number(n[2])<12)) reasons.push("node_below_candidate_minimum");
 if(!p) reasons.push("postgres_version_unverified");
 else if(Number(p[1])<13) reasons.push("postgres_below_candidate_minimum");
 if(facts?.nodeEvidence!=="executed_runtime"||facts?.postgresEvidence!=="sql_server_version") reasons.push("runtime_provenance_unverified");
 if(facts?.environment!=="disposable_nonproduction") reasons.push("environment_not_disposable");
 if(!DIGEST.test(facts?.imageDigest??"")) reasons.push("image_digest_unverified");
 return Object.freeze({compatibleMinimums:reasons.length===0,transportCertified:false,
 claimAllowed:false,dispatchAllowed:false,reasons:Object.freeze(reasons)});
}
