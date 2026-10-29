/**
 * UGP-11.C4-E1: pure structural preflight for A07 synthetic effect uncertainty.
 * Locally simulated attempts are intentionally NOT treated as real provider calls.
 * Self-reported traces are untrusted: this cannot certify tests or grant authority.
 */
export type MockEffectEvent = Readonly<{
  sequence: number;
  kind: "mock_attempt" | "mock_may_have_started" | "mock_replay_blocked";
  syntheticEffectId: string;
}>;
export type MockEffectTrace = Readonly<{
  testId: "A07";
  candidate: "native" | "pg_boss";
  outcome: "manual_intervention_required";
  mockEvents: readonly MockEffectEvent[];
  externalProviderCalls: number;
  realExternalEffectAttempts: number;
}>;
export type MockEffectReview = Readonly<{
  status: "INVALID_OR_INCOMPLETE" | "STRUCTURALLY_CONSISTENT_UNVERIFIED";
  issues: readonly string[];
  stage2bCertified: false;
  executionAuthorized: false;
  operationalAuthority: false;
}>;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const keys=(value:Record<string,unknown>,expected:readonly string[])=>
  JSON.stringify(Object.keys(value).sort())===JSON.stringify([...expected].sort());
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const EVENT_KEYS=["sequence","kind","syntheticEffectId"];
const TRACE_KEYS=["testId","candidate","outcome","mockEvents","externalProviderCalls","realExternalEffectAttempts"];
const EVENT_KINDS=["mock_attempt","mock_may_have_started","mock_replay_blocked"];
const safeCount=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
export function reviewA07MockEffectTrace(input:unknown):MockEffectReview{
 const issues:string[]=[];
 if(!record(input)||!keys(input,TRACE_KEYS)){
  issues.push("invalid_trace_shape");
 }else{
  if(input.testId!=="A07"||!["native","pg_boss"].includes(input.candidate as string))issues.push("invalid_case_or_candidate");
  if(input.outcome!=="manual_intervention_required")issues.push("missing_manual_intervention_classification");
  if(!safeCount(input.externalProviderCalls)||!safeCount(input.realExternalEffectAttempts)||
     input.externalProviderCalls!==0||input.realExternalEffectAttempts!==0)issues.push("real_external_effect_boundary_not_zero");
  if(!Array.isArray(input.mockEvents)||input.mockEvents.length===0||input.mockEvents.length>1000){
   issues.push("invalid_mock_trace_length");
  }else{
   let attempts=0,mayHaveStarted=0,replaysBlocked=0;
   const seen=new Set<number>();let last=-1;let effectId:string|null=null;
   for(const [i,evt] of input.mockEvents.entries()){
    if(!record(evt)||!keys(evt,EVENT_KEYS)||
       !safeCount(evt.sequence)||typeof evt.syntheticEffectId!=="string"||!ID.test(evt.syntheticEffectId)||
       !EVENT_KINDS.includes(evt.kind as string)){
      issues.push(`invalid_mock_event_${i}`);continue;
    }
    if(seen.has(evt.sequence as number)||Number(evt.sequence)<=last)issues.push("unordered_or_duplicate_mock_sequence");
    seen.add(evt.sequence as number);last=Number(evt.sequence);
    if(effectId!==null&&effectId!==evt.syntheticEffectId)issues.push("multiple_synthetic_effect_identities");
    effectId=evt.syntheticEffectId as string;
    if(evt.kind==="mock_attempt")attempts++;
    if(evt.kind==="mock_may_have_started")mayHaveStarted++;
    if(evt.kind==="mock_replay_blocked")replaysBlocked++;
   }
   // The attempted local simulation is expected. Only actual provider calls are prohibited.
   if(attempts!==1||mayHaveStarted!==1||replaysBlocked<1)issues.push("a07_mock_sequence_incomplete");
   if(input.mockEvents[0]?.kind!=="mock_attempt"||
      input.mockEvents[1]?.kind!=="mock_may_have_started"||
      input.mockEvents.slice(2).some((x:unknown)=>!record(x)||x.kind!=="mock_replay_blocked"))
     issues.push("a07_mock_event_order_invalid");
  }
 }
 return Object.freeze({
  status:issues.length?"INVALID_OR_INCOMPLETE":"STRUCTURALLY_CONSISTENT_UNVERIFIED",
  issues:Object.freeze(issues),stage2bCertified:false,executionAuthorized:false,operationalAuthority:false,
 });
}
