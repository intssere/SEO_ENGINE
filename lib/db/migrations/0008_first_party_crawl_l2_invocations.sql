BEGIN;

CREATE TABLE first_party_crawl_l2_invocations (
  invocation_id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  packet_fingerprint char(64) NOT NULL UNIQUE,
  phase text NOT NULL CHECK (
    phase IN (
      'full_initial',
      'full_interrupt',
      'full_resume',
      'full_reconciliation',
      'incremental'
    )
  ),
  run_id text NOT NULL,
  canonical_origin text NOT NULL,
  observed_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('claimed', 'completed')),
  receipt_fingerprint char(64),
  receipt_payload jsonb,
  CHECK (canonical_origin = 'https://diamondshelf.us'),
  CHECK (packet_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (
    (status = 'claimed' AND receipt_fingerprint IS NULL AND receipt_payload IS NULL)
    OR
    (
      status = 'completed'
      AND receipt_fingerprint ~ '^[0-9a-f]{64}$'
      AND jsonb_typeof(receipt_payload) = 'object'
    )
  )
);

CREATE INDEX idx_first_party_crawl_l2_invocations_site_observed
  ON first_party_crawl_l2_invocations (
    site_id,
    canonical_origin,
    observed_at DESC,
    invocation_id DESC
  );

COMMIT;
