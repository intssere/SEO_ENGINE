export function GET() {
  return Response.json({
    service: "seo-engine-web",
    status: "healthy",
    publicSiteWritesEnabled: false,
    timestamp: new Date().toISOString(),
  });
}
