BEGIN;

CREATE TABLE policy_mutation_reservations (
  reservation_id text PRIMARY KEY,
  reservation_version text NOT NULL,
  reservation_class text NOT NULL,
  reservation_fingerprint char(64) NOT NULL UNIQUE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  policy_id text NOT NULL,
  policy_version text NOT NULL,
  policy_fingerprint char(64) NOT NULL,
  evaluation_id text NOT NULL,
  evaluation_fingerprint char(64) NOT NULL,
  materialization_id text NOT NULL,
  materialization_fingerprint char(64) NOT NULL,
  materialization_idempotency_fingerprint char(64) NOT NULL,
  proposal_id text NOT NULL,
  proposal_fingerprint char(64) NOT NULL,
  recommendation_fingerprint char(64) NOT NULL,
  recommendation_idempotency_key text NOT NULL,
  target_binding_fingerprint char(64) NOT NULL,
  provider text NOT NULL,
  domain text NOT NULL,
  resource_kind text NOT NULL,
  resource_gid text NOT NULL,
  target_url text NOT NULL,
  action_type text NOT NULL,
  field text NOT NULL,
  required_provider_scope text NOT NULL,
  before_fingerprint char(64) NOT NULL,
  after_fingerprint char(64) NOT NULL,
  w03_authorization_id text NOT NULL,
  w03_authorization_fingerprint char(64) NOT NULL UNIQUE,
  policy_action_id text NOT NULL UNIQUE,
  w03_reservation_descriptor_fingerprint char(64) NOT NULL,
  status text NOT NULL,
  authorized_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  terminal_at timestamptz,
  terminal_reason text,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),

  CHECK (reservation_version = 'p8-8-w04-durable-reservation-v1'),
  CHECK (reservation_class = 'shopify.product.seo.meta_description'),
  CHECK (provider = 'shopify'),
  CHECK (domain = 'diamondshelf.us'),
  CHECK (resource_kind = 'product'),
  CHECK (resource_gid ~ '^gid://shopify/Product/[1-9][0-9]*$'),
  CHECK (target_url ~ '^https://diamondshelf[.]us/products/[a-z0-9][a-z0-9-]*$'),
  CHECK (action_type = 'update_meta_description'),
  CHECK (field = 'meta_description'),
  CHECK (required_provider_scope = 'write_products'),
  CHECK (reservation_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (policy_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (evaluation_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (materialization_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (materialization_idempotency_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (proposal_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (recommendation_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (target_binding_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (before_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (after_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (w03_authorization_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (w03_reservation_descriptor_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (before_fingerprint <> after_fingerprint),
  CHECK (expires_at > authorized_at),
  CHECK (
    status IN (
      'authorized',
      'claimed',
      'consumed',
      'released',
      'expired',
      'manual_intervention'
    )
  ),
  CHECK (
    (status IN ('consumed', 'released', 'expired') AND terminal_at IS NOT NULL)
    OR
    (status NOT IN ('consumed', 'released', 'expired') AND terminal_at IS NULL)
  )
);

CREATE UNIQUE INDEX ux_policy_mutation_reservations_active_site
  ON policy_mutation_reservations (site_id)
  WHERE status IN ('authorized', 'claimed', 'manual_intervention');

CREATE UNIQUE INDEX ux_policy_mutation_reservations_active_target
  ON policy_mutation_reservations (
    site_id,
    provider,
    resource_kind,
    resource_gid,
    field
  )
  WHERE status IN ('authorized', 'claimed', 'manual_intervention');

CREATE INDEX idx_policy_mutation_reservations_site_history
  ON policy_mutation_reservations (
    site_id,
    created_at DESC,
    reservation_id DESC
  );

COMMIT;
