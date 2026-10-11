/** UGP-11.C4: pure, OFFLINE reference model for transaction interleavings.
 * A model transition is not a database claim or P9 credential. No runtime import.
 */
export type FixtureMode = "running"|"paused"|"draining"|"killed";
export type FixtureState=Readonly<{
 mode:FixtureMode;revision:number;fence:number;owner:string|null;
 leaseEpoch:number;status:"queued"|"claimed"|"manual_intervention";
 attempts:number;sideEffects:false;
}>;
export const initialFixtureState:FixtureState=Object.freeze({
 mode:"running",revision:1,fence:0,owner:null,leaseEpoch:0,
 status:"queued",attempts:0,sideEffects:false
});
export type FixtureAction=
 | Readonly<{type:"claim";owner:string;expectedRevision:number;epoch:number}>
 | Readonly<{type:"control";mode:Exclude<FixtureMode,"running">}>
 | Readonly<{type:"expire";epoch:number}>
 | Readonly<{type:"reclaim";owner:string;expectedRevision:number;epoch:number}>
 | Readonly<{type:"settle";owner:string;fence:number}>
 | Readonly<{type:"uncertain"}>;
export type FixtureStep=Readonly<{state:FixtureState;accepted:boolean;reason:string}>;
function denied(s:FixtureState,reason:string):FixtureStep{return {state:s,accepted:false,reason};}
function accepted(s:FixtureState):FixtureStep{return {state:Object.freeze(s),accepted:true,reason:"fixture_transition_only"};}
export function stepFixture(s:FixtureState,a:FixtureAction):FixtureStep {
 if(a.type==="control"){
  if(s.mode==="killed") return denied(s,"kill_latched");
  const order:Record<FixtureMode,number>={running:0,paused:1,draining:2,killed:3};
  if(order[a.mode]<order[s.mode])return denied(s,"cannot_relax_control");
  return accepted({...s,mode:a.mode,revision:s.revision+1});
 }
 if(a.type==="uncertain")return accepted({...s,status:"manual_intervention",owner:null});
 if(a.type==="expire"){
  if(s.status!=="claimed"||a.epoch<s.leaseEpoch)return denied(s,"not_current_expiry");
  return accepted({...s,leaseEpoch:a.epoch});
 }
 if(a.type==="settle"){
  // Even the fixture cannot settle if kill/pause/drain has been recorded.
  if(s.mode!=="running"||s.status!=="claimed"||s.owner!==a.owner||s.fence!==a.fence)
   return denied(s,"stale_or_closed");
  return denied(s,"completion_requires_independent_p9");
 }
 if(s.mode!=="running"||a.expectedRevision!==s.revision)return denied(s,"control_closed_or_stale");
 if(!a.owner||!/^[a-zA-Z0-9._:-]{1,128}$/.test(a.owner))return denied(s,"invalid_owner");
 if(a.type==="claim"){
  if(s.status!=="queued"||a.epoch<s.leaseEpoch)return denied(s,"claim_not_available");
  return accepted({...s,status:"claimed",owner:a.owner,fence:s.fence+1,
   attempts:s.attempts+1,leaseEpoch:a.epoch});
 }
 if(s.status!=="claimed"||a.epoch<=s.leaseEpoch)return denied(s,"lease_not_recovered");
 return accepted({...s,owner:a.owner,fence:s.fence+1,
  attempts:s.attempts+1,leaseEpoch:a.epoch});
}
export const fixtureRuntimeAuthority=Object.freeze({
 productionClaim:false,dispatch:false,worker:false,providerWrites:false,siteWrites:false
});
