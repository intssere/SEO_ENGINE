BEGIN;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  subject text NOT NULL,
  email text NOT NULL,
  display_name text,
  role text NOT NULL CHECK (role IN ('viewer','operator','admin')),
  csrf_token_hash text NOT NULL,
  user_agent_hash text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS auth_sessions_active_lookup_idx
  ON auth_sessions (token_hash, expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS auth_sessions_subject_idx
  ON auth_sessions (subject, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
  ON auth_sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES auth_sessions(id) ON DELETE SET NULL,
  subject text,
  email text,
  role text CHECK (role IS NULL OR role IN ('viewer','operator','admin')),
  event_type text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success','failure','denied')),
  request_id text,
  ip_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_audit_events_created_idx
  ON auth_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_events_subject_idx
  ON auth_audit_events (subject, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_events_type_idx
  ON auth_audit_events (event_type, created_at DESC);

COMMIT;
