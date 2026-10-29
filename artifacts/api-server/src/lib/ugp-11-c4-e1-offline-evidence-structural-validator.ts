/**
 * UGP-11.C4-E1: pure, offline *structural* validation of prospective Stage 2B
 * comparative evidence. A complete packet is NOT proof tests ran or passed.
 * No DB, clock, network, credentials, worker, scheduler or provider imports.
 */
export const C4_E1_CASES = Object.freeze(Array.from({length:14},(_,i)=>`A${String(i+1).padStart(2,"0")}`));
export type C4E1Candidate = "native" | "pg_boss";
export type C4E1Outcome = "PASS"|"FAIL"|"SKIPPED"|"INCONCLUSIVE"|"NOT_RUN";
export type C4E1EvidenceRow = Readonly<{
  testId: string;
  candidate: C4E1Candidate;
  outcome: C4E1Outcome;
  sourceSha: string;
  runnerSha: string;
  fixtureSeed: string;
  workFingerprint: string;
  observationDigest: string;
  isolatedTargetId: string;
  externalEffectAttempts: number;
  providerNetworkAttempts: number;
}>;
export type C4E1Review = Readonly<{
  status: "INCOMPLETE_OR_UNSAFE" | "STRUCTURALLY_COMPLETE_UNVERIFIED";
  issues: readonly string[];
  operationalAuthority: false;
  stage2bCertified: false;
  executionAuthorized: false;
}>;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CANDIDATES:readonly C4E1Candidate[]=["native","pg_boss"];
const OUTCOMES:readonly C4E1Outcome[]=["PASS","FAIL","SKIPPED","INCONCLUSIVE","NOT_RUN"];
const EXPECTED_KEYS=["testId","candidate","outcome","sourceSha","runnerSha","fixtureSeed","workFingerprint","observationDigest","isolatedTargetId","externalEffectAttempts","providerNetworkAttempts"].sort();
const isObject=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const validId=(x:unknown)=>typeof x==="string"&&ID.test(x);
function validRow(x:unknown):x is C4E1EvidenceRow {
  if(!isObject(x)||JSON.stringify(Object.keys(x).sort())!==JSON.stringify(EXPECTED_KEYS))return false;
  return C4_E1_CASES.includes(x.testId as string)&&
    CANDIDATES.includes(x.candidate as C4E1Candidate)&&
    OUTCOMES.includes(x.outcome as C4E1Outcome)&&
    typeof x.sourceSha==="string"&&SHA.test(x.sourceSha)&&
    typeof x.runnerSha==="string"&&SHA.test(x.runnerSha)&&
    validId(x.fixtureSeed)&&typeof x.workFingerprint==="string"&&HASH.test(x.workFingerprint)&&
    typeof x.observationDigest==="string"&&HASH.test(x.observationDigest)&&
    validId(x.isolatedTargetId)&&
    Number.isSafeInteger(x.externalEffectAttempts)&&Number(x.externalEffectAttempts)>=0&&
    Number.isSafeInteger(x.providerNetworkAttempts)&&Number(x.providerNetworkAttempts)>=0;
}
export function reviewC4E1EvidencePacket(packet:unknown):C4E1Review {
  const issues:string[]=[];
  if(!Array.isArray(packet)||packet.length!==28)issues.push("expected_exactly_28_rows");
  const rows=Array.isArray(packet)?packet:[];
  const seen=new Map<string,C4E1EvidenceRow>();
  for(const [i,row] of rows.entries()){
    if(!validRow(row)){issues.push(`invalid_row_${i}`);continue;}
    const key=`${row.testId}:${row.candidate}`;
    if(seen.has(key)){issues.push(`duplicate_case_${key}`);continue;}
    seen.set(key,row);
    if(row.outcome!=="PASS")issues.push(`not_pass_${key}`);
    if(row.externalEffectAttempts!==0||row.providerNetworkAttempts!==0)issues.push(`external_effect_or_provider_attempt_${key}`);
  }
  for(const testId of C4_E1_CASES){
    const a=seen.get(`${testId}:native`),b=seen.get(`${testId}:pg_boss`);
    if(!a||!b){issues.push(`missing_pair_${testId}`);continue;}
    if(a.fixtureSeed!==b.fixtureSeed||a.workFingerprint!==b.workFingerprint||
       a.isolatedTargetId!==b.isolatedTargetId||a.sourceSha!==b.sourceSha||
       a.runnerSha!==b.runnerSha)issues.push(`noncomparable_pair_${testId}`);
  }
  // A valid shape and declared PASS outcomes are self-reported claims.
  // Neither this predicate nor its caller can promote these to certification.
  return Object.freeze({
    status:issues.length===0?"STRUCTURALLY_COMPLETE_UNVERIFIED":"INCOMPLETE_OR_UNSAFE",
    issues:Object.freeze(issues),
    operationalAuthority:false,
    stage2bCertified:false,
    executionAuthorized:false,
  });
}
