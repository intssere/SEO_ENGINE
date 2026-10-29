/**
 * Source-only cross-evidence preflight for C4-E1 A07 and 28-row A01-A14 packet.
 * No execution, attestations, runtime credentials, database or external access.
 */
import {reviewC4E1EvidencePacket} from "./ugp-11-c4-e1-offline-evidence-structural-validator.js";
import {reviewA07MockEffectTrace} from "./ugp-11-c4-e1-offline-effect-trace.js";
export type A07CrossReview=Readonly<{
 status:"INCOMPLETE_OR_UNSAFE"|"STRUCTURALLY_CONSISTENT_UNVERIFIED";
 issues:readonly string[];
 stage2bCertified:false;
 executionAuthorized:false;
 operationalAuthority:false;
}>;
type UnknownRecord=Record<string,unknown>;
const object=(x:unknown):x is UnknownRecord=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const CANDIDATES=["native","pg_boss"] as const;
/**
 * Every candidate's A07 row must be declared PASS with no real-world effects
 * and have a separate consistent local mock trace with matching candidate.
 * Neither structural preflight authenticates a claimed record.
 */
export function reviewC4E1A07CrossEvidence(packet:unknown,traces:unknown):A07CrossReview{
 const issues:string[]=[];
 const result=reviewC4E1EvidencePacket(packet);
 if(result.status!=="STRUCTURALLY_COMPLETE_UNVERIFIED")issues.push("incomplete_parity_packet",...result.issues);
 if(!Array.isArray(traces)||traces.length!==2)issues.push("expected_two_a07_traces");
 const rows=Array.isArray(traces)?traces:[];
 for(const candidate of CANDIDATES){
  const matches=rows.filter(x=>object(x)&&x.candidate===candidate);
  if(matches.length!==1){issues.push(`missing_or_duplicate_trace_${candidate}`);continue;}
  const trace=reviewA07MockEffectTrace(matches[0]);
  if(trace.status!=="STRUCTURALLY_CONSISTENT_UNVERIFIED")issues.push(`invalid_trace_${candidate}`,...trace.issues.map(i=>`${candidate}:${i}`));
  const paired=Array.isArray(packet)?packet.filter(x=>object(x)&&x.testId==="A07"&&x.candidate===candidate):[];
  if(paired.length!==1||paired[0].outcome!=="PASS"||paired[0].externalEffectAttempts!==0||paired[0].providerNetworkAttempts!==0)
    issues.push(`invalid_a07_packet_row_${candidate}`);
 }
 if(rows.some(x=>!object(x)||!CANDIDATES.includes(x.candidate as "native"|"pg_boss")))issues.push("unknown_or_malformed_trace");
 return Object.freeze({
   status:issues.length?"INCOMPLETE_OR_UNSAFE":"STRUCTURALLY_CONSISTENT_UNVERIFIED",
   issues:Object.freeze(issues),stage2bCertified:false,executionAuthorized:false,operationalAuthority:false
 });
}
