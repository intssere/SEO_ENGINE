export const PILOT_QUEUE_RESUME_GATE =
  "PILOT_INGESTION_QUEUE_RESUME_ENABLED" as const;

type Env = Record<string, string | undefined>;

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function loadStartupRuntimeConfig(env: Env = process.env) {
  const databaseConfigured = Boolean(env.DATABASE_URL?.trim());
  return Object.freeze({
    databaseConfigured,
    pilotQueueResumeEnabled:
      databaseConfigured && enabled(env[PILOT_QUEUE_RESUME_GATE]),
  });
}
