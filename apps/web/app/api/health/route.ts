function enabled(value: string | undefined): boolean {
  return value === "true";
}

export function GET() {
  const mode = process.env.NODE_ENV ?? "development";
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
  const publicSiteWritesEnabled = enabled(process.env.PUBLIC_SITE_WRITES_ENABLED);
  const productionReady = mode !== "production" || databaseConfigured;

  return Response.json({
    service: "seo-engine-web",
    status: productionReady ? "healthy" : "degraded",
    mode,
    databaseConfigured,
    publicSiteWritesEnabled,
    timestamp: new Date().toISOString(),
  }, { status: productionReady ? 200 : 503 });
}
