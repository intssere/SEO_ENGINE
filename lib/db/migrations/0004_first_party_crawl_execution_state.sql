BEGIN;

CREATE TABLE first_party_crawl_checkpoints (
  checkpoint_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  canonical_origin text NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  checkpoint_fingerprint char(64) NOT NULL,
  checkpoint_revision bigint NOT NULL CHECK (checkpoint_revision >= 0),
  observed_at timestamptz NOT NULL,
  checkpoint_payload jsonb NOT NULL,
  UNIQUE (site_id, run_id, execution_plan_fingerprint),
  UNIQUE (site_id, run_id, execution_plan_fingerprint, checkpoint_revision),
  UNIQUE (site_id, run_id, execution_plan_fingerprint, checkpoint_fingerprint),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (checkpoint_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof(checkpoint_payload) = 'object')
);

CREATE TABLE first_party_crawl_completed_runs (
  completed_run_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  canonical_origin text NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  snapshot_fingerprint char(64) NOT NULL,
  observed_at timestamptz NOT NULL,
  snapshot_payload jsonb NOT NULL,
  UNIQUE (site_id, run_id),
  UNIQUE (site_id, run_id, snapshot_fingerprint),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (snapshot_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof(snapshot_payload) = 'object')
);

CREATE TABLE first_party_crawl_incremental_receipts (
  receipt_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  run_id text NOT NULL,
  canonical_origin text NOT NULL,
  incremental_plan_fingerprint char(64) NOT NULL,
  execution_plan_fingerprint char(64) NOT NULL,
  observed_at timestamptz NOT NULL,
  receipt_payload jsonb NOT NULL,
  UNIQUE (site_id, run_id, incremental_plan_fingerprint),
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (incremental_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (execution_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof(receipt_payload) = 'object')
);

CREATE INDEX idx_first_party_crawl_completed_latest
  ON first_party_crawl_completed_runs (
    site_id,
    canonical_origin,
    observed_at DESC,
    completed_run_id DESC
  );

COMMIT;
