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
  if(key!=="serverAddress" && observation[key]!==expected[key])return deny("identity_mismatch_"+key);
 }
 if(observation.database!=="int02_attested")return deny("not_disposable_fixture");
 if(observation.currentUser!=="test")return deny("not_disposable_user");
 // GitHub Actions connects to a PostgreSQL Docker service through port mapping.
 // The server reports its private container bridge IP, not the runner's PGHOST.
 // This checks test-network plausibility only, NOT independent DB identity.
 const parts=observation.serverAddress.split(".").map(Number);
 const privateV4=parts.length===4 && parts.every(n=>Number.isInteger(n)&&n>=0&&n<=255) &&
   (parts[0]===10||(parts[0]===172&&parts[1]>=16&&parts[1]<=31)||(parts[0]===192&&parts[1]===168));
 if(expected.serverAddress!=="docker_private"||!privateV4)return deny("not_disposable_network");

 if(observation.serverPort!=="5432")return deny("unexpected_postgres_port");
 return {verified:true,reason:"disposable_identity_observation_matches"};
}
export function refuseProductionIdentityPromotion(){return {verified:false,reason:"production_identity_not_certified"};}
