BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  domain text NOT NULL,
  canonical_origin text NOT NULL,
  platform text,
  locale text NOT NULL DEFAULT 'en-US',
  timezone text NOT NULL DEFAULT 'UTC',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, domain)
);

CREATE TABLE connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_account_id text,
  secret_ref text,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','revoked','error')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, provider, external_account_id)
);

CREATE TABLE crawl_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  seed_url text NOT NULL,
  pages_discovered integer NOT NULL DEFAULT 0 CHECK (pages_discovered >= 0),
  pages_fetched integer NOT NULL DEFAULT 0 CHECK (pages_fetched >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  url text NOT NULL,
  normalized_url text NOT NULL,
  path text NOT NULL,
  page_type text,
  indexable boolean,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, normalized_url)
);

CREATE TABLE page_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  crawl_run_id uuid REFERENCES crawl_runs(id) ON DELETE SET NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  status_code integer CHECK (status_code IS NULL OR status_code BETWEEN 100 AND 599),
  title text,
  meta_description text,
  canonical_url text,
  robots text,
  h1 text,
  content_hash text,
  content_text text,
  structured_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  headings jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_signals jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  query text NOT NULL,
  country text,
  device text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, query, country, device)
);

CREATE TABLE search_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  metric_date date NOT NULL,
  source text NOT NULL,
  impressions bigint NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  clicks bigint NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  ctr double precision NOT NULL DEFAULT 0 CHECK (ctr >= 0 AND ctr <= 1),
  average_position double precision CHECK (average_position IS NULL OR average_position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (query_id, page_id, metric_date, source)
);

CREATE TABLE evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  source text NOT NULL,
  kind text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  confidence double precision NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  primary_evidence_id uuid REFERENCES evidence(id) ON DELETE SET NULL,
  rule_id text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','ignored')),
  title text NOT NULL,
  description text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  query_id uuid REFERENCES search_queries(id) ON DELETE SET NULL,
  opportunity_type text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','dismissed','planned','completed')),
  score double precision NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  impact_estimate jsonb NOT NULL DEFAULT '{}'::jsonb,
  effort_estimate jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text NOT NULL,
  evidence_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed','cancelled')),
  risk_level text NOT NULL CHECK (risk_level IN ('auto','approval','blocked')),
  rationale text NOT NULL,
  expected_outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id uuid NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed','cancelled')),
  target jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_change jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id uuid NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  actor_id text NOT NULL,
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id uuid NOT NULL REFERENCES action_plans(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed','cancelled')),
  external_ref text,
  deployed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rollbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed','cancelled')),
  reason text NOT NULL,
  restore_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','failed','regressed')),
  expected_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  actual_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  hypothesis text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed','cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE experiment_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  cohort text NOT NULL CHECK (cohort IN ('treatment','control')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, page_id)
);

CREATE TABLE outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  metric text NOT NULL,
  baseline_value double precision,
  current_value double precision,
  delta_value double precision,
  measured_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE policy_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  name text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL,
  is_official boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, source_url)
);

CREATE TABLE policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES policy_sources(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  content_hash text NOT NULL,
  content_text text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_id, content_hash)
);

CREATE TABLE policy_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES policy_sources(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('low','medium','high','official')),
  summary text NOT NULL,
  impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  provider text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','active','retired','blocked')),
  confidence text NOT NULL CHECK (confidence IN ('low','medium','high','official')),
  source_change_id uuid REFERENCES policy_changes(id) ON DELETE SET NULL,
  condition_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  UNIQUE (rule_key, version)
);

CREATE TABLE ai_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  prompt_key text NOT NULL,
  prompt_text text NOT NULL,
  locale text,
  country text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_query_id uuid NOT NULL REFERENCES ai_queries(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model_family text NOT NULL,
  model_version text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  answer_text text NOT NULL,
  brand_mentioned boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE ai_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_response_id uuid NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
  cited_url text NOT NULL,
  cited_domain text,
  position integer CHECK (position IS NULL OR position > 0),
  is_own_domain boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  experiment_id uuid REFERENCES experiments(id) ON DELETE SET NULL,
  signal_type text NOT NULL,
  metric text NOT NULL,
  value double precision,
  confidence double precision NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed','cancelled')),
  priority integer NOT NULL DEFAULT 100,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_after timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sites_organization_id ON sites(organization_id);
CREATE INDEX idx_connections_site_id ON connections(site_id);
CREATE INDEX idx_crawl_runs_site_status ON crawl_runs(site_id, status);
CREATE INDEX idx_pages_site_last_seen ON pages(site_id, last_seen_at DESC);
CREATE INDEX idx_page_snapshots_page_observed ON page_snapshots(page_id, observed_at DESC);
CREATE INDEX idx_search_queries_site ON search_queries(site_id);
CREATE INDEX idx_search_metrics_query_date ON search_metrics(query_id, metric_date DESC);
CREATE INDEX idx_search_metrics_page_date ON search_metrics(page_id, metric_date DESC) WHERE page_id IS NOT NULL;
CREATE INDEX idx_evidence_site_kind_observed ON evidence(site_id, kind, observed_at DESC);
CREATE INDEX idx_findings_site_status_severity ON findings(site_id, status, severity);
CREATE INDEX idx_opportunities_site_status_score ON opportunities(site_id, status, score DESC);
CREATE INDEX idx_action_plans_site_status ON action_plans(site_id, status);
CREATE INDEX idx_actions_plan_status ON actions(action_plan_id, status);
CREATE INDEX idx_deployments_plan_status ON deployments(action_plan_id, status);
CREATE INDEX idx_verifications_deployment_status ON verifications(deployment_id, status);
CREATE INDEX idx_experiments_site_status ON experiments(site_id, status);
CREATE INDEX idx_policy_versions_source_observed ON policy_versions(source_id, observed_at DESC);
CREATE INDEX idx_policy_changes_source_detected ON policy_changes(source_id, detected_at DESC);
CREATE INDEX idx_rules_provider_status ON rules(provider, status);
CREATE INDEX idx_ai_queries_site_created ON ai_queries(site_id, created_at DESC);
CREATE INDEX idx_ai_responses_query_observed ON ai_responses(ai_query_id, observed_at DESC);
CREATE INDEX idx_ai_citations_response ON ai_citations(ai_response_id);
CREATE INDEX idx_learning_signals_site_observed ON learning_signals(site_id, observed_at DESC);
CREATE INDEX idx_jobs_claim ON jobs(status, run_after, priority, created_at) WHERE status = 'pending';

COMMIT;
