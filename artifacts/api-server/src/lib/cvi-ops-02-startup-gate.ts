/** CVI-OPS-02: no IO, migrations, or provider access. Pre-listen fail-closed guard.
 * Production is identified by NODE_ENV or an explicit Railway deployment label.
 * Only explicitly classified development/test environments retain legacy DB-free startup.
 */
type Env = Record<string, string | undefined>;
export function assertCviStartupDatabaseBinding(env: Env): void {
  const mode = env.NODE_ENV?.trim().toLowerCase();
  const railway = env.RAILWAY_ENVIRONMENT_NAME?.trim().toLowerCase();
  const classifiedProduction = mode === "production" || railway === "production" || railway === "staging";
  const classifiedOffline = (mode === "test" || mode === "development") && !railway;
  if (classifiedProduction || !classifiedOffline) {
    if (!env.DATABASE_URL?.trim()) throw new Error("cvi_ops_02_database_binding_required_before_listen");
  }
}
