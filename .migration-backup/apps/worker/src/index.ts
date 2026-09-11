type RuntimeMode = "development" | "test" | "production";

function runtimeMode(value: string | undefined): RuntimeMode {
  if (value === "production" || value === "test") return value;
  return "development";
}

function writesEnabled(value: string | undefined): boolean {
  return value === "true";
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required runtime configuration: ${name}`);
  return value;
}

const mode = runtimeMode(process.env.NODE_ENV);
const publicSiteWritesEnabled = writesEnabled(process.env.PUBLIC_SITE_WRITES_ENABLED);

if (mode === "production") {
  required("DATABASE_URL");
}

// Production boot remains fail-closed. A deployment cannot accidentally inherit an
// unrecognized truthy value such as "1", "yes", or "TRUE".
const startedAt = new Date().toISOString();
console.log(JSON.stringify({
  service: "seo-engine-worker",
  status: "ready",
  mode,
  startedAt,
  publicSiteWritesEnabled,
  databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
}));

setInterval(() => {
  console.log(JSON.stringify({
    service: "seo-engine-worker",
    status: "healthy",
    mode,
    publicSiteWritesEnabled,
    at: new Date().toISOString(),
  }));
}, 60_000).unref();
