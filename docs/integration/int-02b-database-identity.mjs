/**
 * Read-only identity gate for INT-02B disposable PostgreSQL fixtures.
 * Identity observations must be obtained by the test harness from PostgreSQL,
 * never from a caller-supplied "verified" Boolean.
 * This is NOT production database authorization or migration provenance.
 */
export function verifyDisposableDatabaseIdentity(observation,expected){
 const deny=(reason)=>({verified:false,reason});
 if(!observation||!expected||typeof observation!=="object"||typeof expected!=="object")return deny("identity_evidence_missing");
 const fields=["database","currentUser","serverAddress","serverPort"];
 for(const key of fields){
  if(typeof observation[key]!=="string"||!observation[key]||typeof expected[key]!=="string"||!expected[key])return deny("identity_evidence_missing");
  if(observation[key]!==expected[key])return deny("identity_mismatch_"+key);
 }
 if(observation.database!=="int02_attested")return deny("not_disposable_fixture");
 if(observation.currentUser!=="test")return deny("not_disposable_user");
 if(observation.serverAddress!=="127.0.0.1" && observation.serverAddress!=="::1")return deny("not_local_postgres");
 if(observation.serverPort!=="5432")return deny("unexpected_postgres_port");
 return {verified:true,reason:"disposable_identity_observation_matches"};
}
export function refuseProductionIdentityPromotion(){return {verified:false,reason:"production_identity_not_certified"};}
