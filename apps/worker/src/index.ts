const startedAt = new Date().toISOString();

console.log(JSON.stringify({
  service: "seo-engine-worker",
  status: "ready",
  startedAt,
  publicSiteWritesEnabled: false,
}));

setInterval(() => {
  console.log(JSON.stringify({
    service: "seo-engine-worker",
    status: "healthy",
    at: new Date().toISOString(),
  }));
}, 60_000).unref();
