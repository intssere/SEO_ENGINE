BEGIN;

CREATE TABLE first_party_crawl_terminal_failure_events (
  event_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  canonical_origin text NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  canonical_url text NOT NULL,
  event_type text NOT NULL CHECK (
    event_type IN ('terminal_failure', 'recovery_failure', 'recovery_resolved')
  ),
  source_event_fingerprint char(64),
  checkpoint_fingerprint char(64) NOT NULL,
  checkpoint_revision bigint NOT NULL CHECK (checkpoint_revision >= 1),
  observed_at timestamptz NOT NULL,
  event_fingerprint char(64) NOT NULL UNIQUE,
  event_payload jsonb NOT NULL,
  UNIQUE (site_id, run_id, execution_plan_fingerprint, event_fingerprint),
  UNIQUE (source_event_fingerprint),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (canonical_url LIKE 'https://diamondshelf.us/%'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (checkpoint_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (
    (event_type = 'terminal_failure' AND source_event_fingerprint IS NULL)
    OR
    (
      event_type IN ('recovery_failure', 'recovery_resolved')
      AND source_event_fingerprint ~ '^[0-9a-f]{64}$'
    )
  ),
  CHECK (jsonb_typeof(event_payload) = 'object')
);

CREATE INDEX idx_first_party_crawl_terminal_failure_unresolved
  ON first_party_crawl_terminal_failure_events (
    site_id,
    run_id,
    execution_plan_fingerprint,
    canonical_url,
    observed_at DESC
  );

CREATE TABLE first_party_crawl_accounting_snapshots (
  accounting_snapshot_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  canonical_origin text NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  checkpoint_fingerprint char(64) NOT NULL,
  checkpoint_revision bigint NOT NULL CHECK (checkpoint_revision >= 1),
  snapshot_fingerprint char(64) NOT NULL UNIQUE,
  whole_site_certified boolean NOT NULL,
  terminal_failure_count integer NOT NULL CHECK (terminal_failure_count >= 0),
  observed_at timestamptz NOT NULL,
  snapshot_payload jsonb NOT NULL,
  UNIQUE (
    site_id,
    run_id,
    execution_plan_fingerprint,
    checkpoint_fingerprint
  ),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (checkpoint_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (snapshot_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (
    (whole_site_certified AND terminal_failure_count = 0)
    OR (NOT whole_site_certified)
  ),
  CHECK (jsonb_typeof(snapshot_payload) = 'object')
);

CREATE INDEX idx_first_party_crawl_accounting_latest
  ON first_party_crawl_accounting_snapshots (
    site_id,
    canonical_origin,
    observed_at DESC,
    checkpoint_revision DESC,
    accounting_snapshot_id DESC
  );

CREATE TABLE first_party_crawl_terminal_failure_recovery_receipts (
  recovery_receipt_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  canonical_origin text NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  source_checkpoint_fingerprint char(64) NOT NULL,
  source_checkpoint_revision bigint NOT NULL CHECK (source_checkpoint_revision >= 1),
  result_checkpoint_fingerprint char(64) NOT NULL,
  result_checkpoint_revision bigint NOT NULL CHECK (result_checkpoint_revision > source_checkpoint_revision),
  recovery_plan_fingerprint char(64) NOT NULL UNIQUE,
  receipt_fingerprint char(64) NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('resolved', 'incomplete')),
  observed_at timestamptz NOT NULL,
  receipt_payload jsonb NOT NULL,
  UNIQUE (
    site_id,
    run_id,
    execution_plan_fingerprint,
    source_checkpoint_fingerprint
  ),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (source_checkpoint_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (result_checkpoint_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (recovery_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (receipt_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof(receipt_payload) = 'object')
);

CREATE INDEX idx_first_party_crawl_recovery_latest
  ON first_party_crawl_terminal_failure_recovery_receipts (
    site_id,
    run_id,
    execution_plan_fingerprint,
    observed_at DESC,
    recovery_receipt_id DESC
  );

CREATE FUNCTION reject_p12_2_l10_13b_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'p12_2_l10_13b_append_only_violation';
END;
$$;

CREATE TRIGGER trg_first_party_crawl_terminal_failure_events_immutable
  BEFORE UPDATE OR DELETE ON first_party_crawl_terminal_failure_events
  FOR EACH ROW EXECUTE FUNCTION reject_p12_2_l10_13b_immutable_mutation();

CREATE TRIGGER trg_first_party_crawl_accounting_snapshots_immutable
  BEFORE UPDATE OR DELETE ON first_party_crawl_accounting_snapshots
  FOR EACH ROW EXECUTE FUNCTION reject_p12_2_l10_13b_immutable_mutation();

CREATE TRIGGER trg_first_party_crawl_terminal_failure_recovery_receipts_immutable
  BEFORE UPDATE OR DELETE ON first_party_crawl_terminal_failure_recovery_receipts
  FOR EACH ROW EXECUTE FUNCTION reject_p12_2_l10_13b_immutable_mutation();

COMMIT;
