/**
 * INT-02B migration installer authority fence.
 * Deliberately no database client, filesystem SQL reader, environment toggle,
 * or install function. This is a non-executing design boundary only.
 * Boolean attestations and disposable fixture observations NEVER grant writes.
 */
export function evaluateInstallerAuthority(request) {
  const deny=(reason)=>({admitted:false,reason});
  if(!request||typeof request!=="object")return deny("missing_request");
  if(request.operation!=="inspect")return deny("migration_execution_disabled");
  if(request.targetEnvironment!=="disposable_test")return deny("non_disposable_target_refused");
  if(request.liveDatabaseUrl||request.productionDatabase||request.executeSql===true)
    return deny("execution_capability_refused");
  return {admitted:false,reason:"inspection_only_not_migration_authority"};
}
export function assertNoInstallerExecution(request){
 const result=evaluateInstallerAuthority(request);
 if(result.admitted)throw Error("unexpected_migration_authority");
 return result;
}
