BEGIN;

CREATE TABLE policy_mutation_control_state (
  site_id uuid PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  control_version text NOT NULL,
  revision bigint NOT NULL,
  previous_control_fingerprint char(64),
  mode text NOT NULL,
  effective_at timestamptz NOT NULL,
  control_fingerprint char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),

  CHECK (control_version = 'p8-8-w05-control-v1'),
  CHECK (revision >= 1),
  CHECK (
    previous_control_fingerprint IS NULL
    OR previous_control_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CHECK (mode IN ('running', 'paused', 'draining', 'drained', 'killed')),
  CHECK (control_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (
    (revision = 1 AND previous_control_fingerprint IS NULL)
    OR
    (revision > 1 AND previous_control_fingerprint IS NOT NULL)
  )
);

CREATE TABLE policy_mutation_control_events (
  event_id text PRIMARY KEY,
  event_version text NOT NULL,
  event_fingerprint char(64) NOT NULL UNIQUE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  from_revision bigint,
  from_control_fingerprint char(64),
  from_mode text,
  transition_action text NOT NULL,
  to_revision bigint NOT NULL,
  to_control_fingerprint char(64) NOT NULL,
  to_mode text NOT NULL,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),

  CHECK (event_version = 'p8-8-w05-control-event-v1'),
  CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (
    from_control_fingerprint IS NULL
    OR from_control_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  CHECK (to_control_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (
    from_mode IS NULL
    OR from_mode IN ('running', 'paused', 'draining', 'drained', 'killed')
  ),
  CHECK (to_mode IN ('running', 'paused', 'draining', 'drained', 'killed')),
  CHECK (
    transition_action IN ('initialize', 'pause', 'drain', 'kill', 'resume')
  ),
  CHECK (
    (
      transition_action = 'initialize'
      AND from_revision IS NULL
      AND from_control_fingerprint IS NULL
      AND from_mode IS NULL
      AND to_revision = 1
    )
    OR
    (
      transition_action <> 'initialize'
      AND from_revision IS NOT NULL
      AND from_revision >= 1
      AND from_control_fingerprint IS NOT NULL
      AND from_mode IS NOT NULL
      AND to_revision = from_revision + 1
    )
  )
);

CREATE TABLE policy_mutation_claims (
  claim_id text PRIMARY KEY,
  claim_version text NOT NULL,
  claim_fingerprint char(64) NOT NULL UNIQUE,
  reservation_id text NOT NULL UNIQUE
    REFERENCES policy_mutation_reservations(reservation_id) ON DELETE RESTRICT,
  reservation_fingerprint char(64) NOT NULL,
  w03_authorization_id text NOT NULL,
  w03_authorization_fingerprint char(64) NOT NULL,
  policy_action_id text NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  control_revision bigint NOT NULL,
  control_fingerprint char(64) NOT NULL,
  resource_gid text NOT NULL,
  target_url text NOT NULL,
  field text NOT NULL,
  before_fingerprint char(64) NOT NULL,
  after_fingerprint char(64) NOT NULL,
  claimed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),

  CHECK (claim_version = 'p8-8-w05-control-claim-v1'),
  CHECK (claim_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (reservation_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (w03_authorization_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (control_revision >= 1),
  CHECK (control_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (resource_gid ~ '^gid://shopify/Product/[1-9][0-9]*$'),
  CHECK (
    target_url ~ '^https://diamondshelf[.]us/products/[a-z0-9][a-z0-9-]*$'
  ),
  CHECK (field = 'meta_description'),
  CHECK (before_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (after_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (before_fingerprint <> after_fingerprint)
);

CREATE INDEX idx_policy_mutation_control_events_site_history
  ON policy_mutation_control_events (
    site_id,
    to_revision DESC,
    event_id DESC
  );

CREATE INDEX idx_policy_mutation_claims_site_history
  ON policy_mutation_claims (
    site_id,
    claimed_at DESC,
    claim_id DESC
  );

COMMIT;
